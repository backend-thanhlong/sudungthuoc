
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { logActivity, ACTIONS, ENTITY_TYPES } from "@/lib/activity-log";
import { createNotificationForAdmins } from "@/lib/notifications";
import { validateReportRow, parseRawRow } from "@/lib/report-validation";

export async function GET() {
    try {
        const session = await auth();
        if (!session || session.user.role !== "FACILITY") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        // Group reports by month with aggregation
        const reports = await prisma.inventoryReport.groupBy({
            by: ['reportMonth'],
            where: {
                facilityId: session.user.id
            },
            _count: {
                id: true
            },
            _sum: {
                nhap: true,
                xuat: true,
                tonCuoi: true,
                giaVat: true
            },
            _max: {
                updatedAt: true
            },
            orderBy: {
                reportMonth: 'desc'
            }
        });

        // Fetch status/adminNote for all months in ONE query to avoid N+1
        const monthStatuses = await prisma.inventoryReport.findMany({
            where: {
                facilityId: session.user.id,
                reportMonth: { in: reports.map(r => r.reportMonth) }
            },
            select: { reportMonth: true, status: true, adminNote: true },
            distinct: ['reportMonth'],
        });

        // Build lookup Map: reportMonth -> { status, adminNote }
        const statusMap = new Map(
            monthStatuses.map(r => [r.reportMonth, r])
        );

        const historyWithDetails = reports.map(r => {
            const statusInfo = statusMap.get(r.reportMonth);
            return {
                month: r.reportMonth,
                drugCount: r._count.id,
                totalImport: r._sum.nhap,
                totalExport: r._sum.xuat,
                lastUpdated: r._max.updatedAt,
                status: statusInfo?.status || "PENDING",
                adminNote: statusInfo?.adminNote,
            };
        });

        return NextResponse.json(historyWithDetails);
    } catch (error) {
        console.error("Error fetching report history:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session || session.user.role !== "FACILITY") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        // Verify user exists in DB (to prevent stale session issues after DB reset)
        const userExists = await prisma.user.findUnique({
            where: { id: session.user.id }
        });

        if (!userExists) {
            return NextResponse.json({ message: "User not found. Please login again." }, { status: 401 });
        }

        const body = await request.json();
        const { month, data } = body;

        if (!month || !data || !Array.isArray(data)) {
            return NextResponse.json({ message: "Invalid data format" }, { status: 400 });
        }

        // Guard: Nếu báo cáo tháng này đã được APPROVED, không cho phép ghi đè
        const existingApproved = await prisma.inventoryReport.findFirst({
            where: { facilityId: session.user.id, reportMonth: month, status: "APPROVED" },
            select: { id: true }
        });
        if (existingApproved) {
            return NextResponse.json({
                message: `Báo cáo tháng ${month} đã được phê duyệt. Vui lòng liên hệ Admin để chỉnh sửa.`
            }, { status: 403 });
        }

        // Get all drug maps for this facility to build a lookup table
        const drugMaps = await prisma.facilityDrugMap.findMany({
            where: { facilityId: session.user.id },
            include: { masterDrug: true }
        });

        // Build lookup map: Code -> MapId
        // Priority: maNoiBo WINS over maChung, because multiple internal drugs can share the same maChung.
        // We set maChung first, then overwrite with maNoiBo so maNoiBo always takes precedence.
        const mapLookup = new Map<string, string>();

        for (const map of drugMaps) {
            // Add master code first (lower priority - may be shared across multiple internal drugs)
            if (map.masterDrug?.maChung) {
                mapLookup.set(map.masterDrug.maChung.toLowerCase(), map.id);
            }
            // Add local code second - OVERWRITES maChung entry, ensuring unique per-facility drug lookup
            if (map.maNoiBo) {
                mapLookup.set(map.maNoiBo.toLowerCase(), map.id);
            }
        }

        let successCount = 0;
        let errorCount = 0;
        const warnings: { drug: string; expected: number; actual: number; message: string }[] = [];

        // Calculate previous month
        const [currentMonth, currentYear] = month.split('/').map(Number);
        const prevDate = new Date(currentYear, currentMonth - 2, 1);
        const prevMonth = `${String(prevDate.getMonth() + 1).padStart(2, '0')}/${prevDate.getFullYear()}`;

        // Get previous month's reports to validate Tồn đầu
        const previousReports = await prisma.inventoryReport.findMany({
            where: {
                facilityId: session.user.id,
                reportMonth: prevMonth
            },
            select: {
                mapId: true,
                tonCuoi: true
            }
        });
        const prevReportMap = new Map(previousReports.map(r => [r.mapId, Number(r.tonCuoi)]));

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const processedRows: any[] = [];

        // Phase 1: Validate all rows first
        for (const row of data) {
            // Find mapId
            let mapId: string | undefined;
            // Prioritize 'Mã nội bộ' (unique per facility) over 'Mã thuốc' (maChung, shared)
            const lookupKeys = ['Mã nội bộ', 'MaNoiBo', 'Mã thuốc', 'MaThuoc', 'maThuoc'];

            for (const key of lookupKeys) {
                const code = row[key];
                if (code) {
                    const foundId = mapLookup.get(String(code).toLowerCase());
                    if (foundId) {
                        mapId = foundId;
                        break;
                    }
                }
            }

            if (!mapId) {
                const debugCode = row['Mã thuốc'] || row['Mã nội bộ'] || 'unknown';
                console.warn(`Could not find drug map for code: ${debugCode}`);
                errorCount++;
                continue;
            }

            // Helper to safely parse numbers
            const safeFloat = (val: any) => {
                const parsed = parseFloat(val);
                return isNaN(parsed) ? 0 : parsed;
            };

            // Parse numeric values
            const tonDau = safeFloat(row['Tồn đầu'] || 0);
            const nhap = safeFloat(row['Nhập trong kỳ'] || 0);
            const xuat = safeFloat(row['Xuất trong kỳ'] || 0);
            const tonCuoi = safeFloat(row['Tồn cuối'] || 0);
            const giaVat = safeFloat(row['Giá VAT'] || 0);
            const thanhTienTonCuoi = safeFloat(row['Thành tiền tồn cuối'] || 0);

            // Parse new string fields
            const soQdTrungThau = row['Số QĐ trúng thầu'] ? String(row['Số QĐ trúng thầu']) : null;
            const tenCongTy = row['Tên Công ty'] ? String(row['Tên Công ty']) : null;
            const ngayBatDauHd = row['Ngày bắt đầu HĐ'] ? String(row['Ngày bắt đầu HĐ']) : null;
            const ngayKetThucHd = row['Ngày kết thúc HĐ'] ? String(row['Ngày kết thúc HĐ']) : null;
            const bhyt = row['BHYT'] ? String(row['BHYT']) : null;
            const dichVu = row['Dịch vụ'] ? String(row['Dịch vụ']) : null;

            const drugName = row['Tên thuốc'] || row['Mã thuốc'] || row['Mã nội bộ'] || 'Unknown';
            const tolerance = 0.01; // Allow small floating point differences

            // Validate 0: Tồn đầu = Tồn cuối tháng trước (only if previous report exists)
            const prevTonCuoi = prevReportMap.get(mapId);
            if (prevTonCuoi !== undefined && Math.abs(tonDau - prevTonCuoi) > tolerance) {
                warnings.push({
                    drug: String(drugName),
                    expected: prevTonCuoi,
                    actual: tonDau,
                    message: `${drugName}: Tồn đầu (${tonDau.toLocaleString('vi-VN')}) ≠ Tồn cuối tháng trước (${prevTonCuoi.toLocaleString('vi-VN')})`
                });
            }

            // Validate 1: Tồn cuối = Tồn đầu + Nhập trong kỳ - Xuất trong kỳ
            const expectedTonCuoi = tonDau + nhap - xuat;
            if (Math.abs(tonCuoi - expectedTonCuoi) > tolerance && (tonDau !== 0 || nhap !== 0 || xuat !== 0)) {
                warnings.push({
                    drug: String(drugName),
                    expected: expectedTonCuoi,
                    actual: tonCuoi,
                    message: `${drugName}: Tồn cuối (${tonCuoi.toLocaleString('vi-VN')}) ≠ Tồn đầu (${tonDau}) + Nhập (${nhap}) - Xuất (${xuat}) = ${expectedTonCuoi.toLocaleString('vi-VN')}`
                });
            }

            // Validate 2: Thành tiền tồn cuối = Tồn cuối * Giá VAT
            const expectedThanhTien = tonCuoi * giaVat;
            if (Math.abs(thanhTienTonCuoi - expectedThanhTien) > tolerance && thanhTienTonCuoi !== 0) {
                warnings.push({
                    drug: String(drugName),
                    expected: expectedThanhTien,
                    actual: thanhTienTonCuoi,
                    message: `${drugName}: Thành tiền tồn cuối (${thanhTienTonCuoi.toLocaleString('vi-VN')}) ≠ Tồn cuối (${tonCuoi}) × Giá VAT (${giaVat.toLocaleString('vi-VN')}) = ${expectedThanhTien.toLocaleString('vi-VN')}`
                });
            }

            // Validate 3: At least one of BHYT or Dịch vụ must have "X"
            // Normalize values: treat "X", "x", or any truthy string as valid
            const hasBhyt = bhyt && String(bhyt).trim().toLowerCase() === 'x';
            const hasDichVu = dichVu && String(dichVu).trim().toLowerCase() === 'x';

            if (!hasBhyt && !hasDichVu) {
                warnings.push({
                    drug: String(drugName),
                    expected: 0,
                    actual: 0,
                    message: `${drugName}: Phải đánh dấu X ít nhất một trong hai cột BHYT hoặc Dịch vụ`
                });
            }

            // Store processed row for later saving
            processedRows.push({
                mapId,
                tonDau,
                nhap,
                xuat,
                tonCuoi,
                giaVat,
                thanhTienTonCuoi,
                soQdTrungThau,
                tenCongTy,
                ngayBatDauHd,
                ngayKetThucHd,
                bhyt,
                dichVu
            });
        }

        // If there are validation errors, return error without saving
        if (warnings.length > 0) {
            return NextResponse.json({
                message: "Báo cáo không hợp lệ. Vui lòng kiểm tra và điều chỉnh công thức tính toán.",
                error: `Phát hiện ${warnings.length} lỗi tính toán "Thành tiền tồn cuối"`,
                stats: {
                    totalRows: processedRows.length,
                    errors: warnings.length
                },
                warnings: warnings
            }, { status: 400 });
        }

        // Phase 2: Save all valid rows (only if no validation errors)
        for (const row of processedRows) {
            await prisma.inventoryReport.upsert({
                where: {
                    facilityId_mapId_reportMonth: {
                        facilityId: session.user.id,
                        mapId: row.mapId,
                        reportMonth: month
                    }
                },
                update: {
                    tonDau: row.tonDau,
                    nhap: row.nhap,
                    xuat: row.xuat,
                    tonCuoi: row.tonCuoi,
                    giaVat: row.giaVat,
                    thanhTienTonCuoi: row.thanhTienTonCuoi,
                    soQdTrungThau: row.soQdTrungThau,
                    tenCongTy: row.tenCongTy,
                    ngayBatDauHd: row.ngayBatDauHd,
                    ngayKetThucHd: row.ngayKetThucHd,
                    bhyt: row.bhyt,
                    dichVu: row.dichVu,
                    status: "PENDING",
                    adminNote: null
                },
                create: {
                    facilityId: session.user.id,
                    mapId: row.mapId,
                    reportMonth: month,
                    tonDau: row.tonDau,
                    nhap: row.nhap,
                    xuat: row.xuat,
                    tonCuoi: row.tonCuoi,
                    giaVat: row.giaVat,
                    thanhTienTonCuoi: row.thanhTienTonCuoi,
                    soQdTrungThau: row.soQdTrungThau,
                    tenCongTy: row.tenCongTy,
                    ngayBatDauHd: row.ngayBatDauHd,
                    ngayKetThucHd: row.ngayKetThucHd,
                    bhyt: row.bhyt,
                    dichVu: row.dichVu,
                    status: "PENDING"
                }
            });

            successCount++;
        }

        // Log activity and notify admins
        logActivity({
            userId: session.user.id,
            action: ACTIONS.SUBMIT,
            entityType: ENTITY_TYPES.REPORT,
            details: { month, drugCount: successCount },
        });

        const facilityName = userExists.facilityName || session.user.name || "Cơ sở";
        createNotificationForAdmins(
            "REPORT_SUBMITTED",
            "Báo cáo mới được nộp",
            `${facilityName} đã nộp báo cáo tồn kho tháng ${month} (${successCount} mặt hàng)`,
            "report",
            undefined,
            "/dashboard/admin/reports"
        );

        return NextResponse.json({
            message: "Nộp báo cáo thành công",
            stats: {
                success: successCount,
                error: errorCount
            }
        });

    } catch (error: any) {
        console.error("Error uploading report:", error);
        return NextResponse.json({
            message: "Internal server error",
            error: error.message,
            details: error.meta || error.code
        }, { status: 500 });
    }
}
