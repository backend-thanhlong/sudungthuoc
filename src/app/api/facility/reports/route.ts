
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { logActivity, ACTIONS, ENTITY_TYPES } from "@/lib/activity-log";
import { createNotificationForAdmins } from "@/lib/notifications";
import {
    buildFacilityReportValidationResponse,
    loadFacilityReportCanonicalContext,
    validateFacilityReportRows,
} from "@/lib/facility-report-upload";

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
        const context = await loadFacilityReportCanonicalContext(session.user.id, month);
        const validationResult = validateFacilityReportRows(data, context);
        if (!validationResult.ok) {
            return NextResponse.json(buildFacilityReportValidationResponse(validationResult), { status: 400 });
        }

        let successCount = 0;
        await prisma.$transaction(async (tx) => {
            for (const row of validationResult.rows) {
                await tx.inventoryReport.upsert({
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
        });

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
                error: 0
            }
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        const details = typeof error === "object" && error !== null
            ? ("meta" in error ? error.meta : ("code" in error ? error.code : undefined))
            : undefined;

        console.error("Error uploading report:", error);
        return NextResponse.json({
            message: "Internal server error",
            error: message,
            details
        }, { status: 500 });
    }
}
