import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { listReportMonthSummaries, type ReportMonthSummary } from "@/lib/report-submissions";
import * as XLSX from "xlsx";

const COL_WIDTHS_DETAIL = [
    { wch: 5 },   // STT
    { wch: 15 },  // Mã nội bộ
    { wch: 15 },  // Mã thuốc
    { wch: 15 },  // Mã BHYT
    { wch: 35 },  // Tên thuốc
    { wch: 25 },  // Hoạt chất
    { wch: 15 },  // Hàm lượng
    { wch: 15 },  // Dạng bào chế
    { wch: 12 },  // Đơn vị tính
    { wch: 12 },  // Nhóm TCKT
    { wch: 12 },  // Tồn đầu
    { wch: 12 },  // Nhập trong kỳ
    { wch: 12 },  // Xuất trong kỳ
    { wch: 12 },  // Tồn cuối
    { wch: 15 },  // Giá VAT
    { wch: 18 },  // Thành tiền tồn cuối
    { wch: 18 },  // Số QĐ trúng thầu
    { wch: 25 },  // Tên Công ty
    { wch: 15 },  // Ngày bắt đầu HĐ
    { wch: 15 },  // Ngày kết thúc HĐ
    { wch: 8 },   // BHYT
    { wch: 8 },   // Dịch vụ
];

const COL_WIDTHS_SUMMARY = [
    { wch: 5 },   // STT
    { wch: 30 },  // Cơ sở y tế
    { wch: 12 },  // Tháng báo cáo
    { wch: 15 },  // Mã nội bộ
    { wch: 15 },  // Mã thuốc
    { wch: 15 },  // Mã BHYT
    { wch: 35 },  // Tên thuốc
    { wch: 25 },  // Hoạt chất
    { wch: 15 },  // Hàm lượng
    { wch: 15 },  // Dạng bào chế
    { wch: 12 },  // Đơn vị tính
    { wch: 12 },  // Nhóm TCKT
    { wch: 12 },  // Tồn đầu
    { wch: 12 },  // Nhập trong kỳ
    { wch: 12 },  // Xuất trong kỳ
    { wch: 12 },  // Tồn cuối
    { wch: 15 },  // Giá VAT
    { wch: 18 },  // Thành tiền tồn cuối
    { wch: 18 },  // Số QĐ trúng thầu
    { wch: 25 },  // Tên Công ty
    { wch: 15 },  // Ngày bắt đầu HĐ
    { wch: 15 },  // Ngày kết thúc HĐ
    { wch: 8 },   // BHYT
    { wch: 8 },   // Dịch vụ
];

function applyHeaderStyle(ws: XLSX.WorkSheet, numCols: number) {
    const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
    for (let c = 0; c <= numCols - 1; c++) {
        const cell = XLSX.utils.encode_cell({ r: 0, c });
        if (!ws[cell]) continue;
        ws[cell].s = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "1E40AF" } },
            alignment: { horizontal: "center", vertical: "center", wrapText: true },
            border: {
                top: { style: "thin" },
                bottom: { style: "thin" },
                left: { style: "thin" },
                right: { style: "thin" },
            },
        };
    }
    return range;
}

function buildEmptySummaryRows(
    summaries: ReportMonthSummary[],
    facilityNames: Map<string, string>
) {
    return summaries.map((summary, index) => ({
        "STT": index + 1,
        "Cơ sở y tế": facilityNames.get(summary.facilityId) || "Unknown Facility",
        "Tháng báo cáo": summary.month,
        "Dòng báo cáo đã lưu": summary.reportedRowCount,
        "Dòng bỏ qua": summary.skippedRowCount,
        "Ngày nộp": summary.lastUpdated ? new Date(summary.lastUpdated).toLocaleString("vi-VN") : "",
        "Ghi chú": "Không có dòng dữ liệu được lưu. Tất cả dòng trong file đã được đánh dấu Bỏ qua.",
    }));
}

function appendEmptySummarySheet(
    workbook: XLSX.WorkBook,
    summaries: ReportMonthSummary[],
    facilityNames: Map<string, string>
) {
    if (summaries.length === 0) return;

    const rows = buildEmptySummaryRows(summaries, facilityNames);
    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet["!cols"] = [
        { wch: 5 },
        { wch: 32 },
        { wch: 14 },
        { wch: 20 },
        { wch: 14 },
        { wch: 22 },
        { wch: 80 },
    ];
    applyHeaderStyle(worksheet, Object.keys(rows[0] || {}).length);
    XLSX.utils.book_append_sheet(workbook, worksheet, "BaoCaoTrong");
}

function buildRowFromReport(r: any, index: number, includesFacility = true) {
    const base = {
        "STT": index + 1,
        ...(includesFacility ? { "Cơ sở y tế": r.facility.facilityName || r.facility.username, "Tháng báo cáo": r.reportMonth } : {}),
        "Mã nội bộ": r.drugMap?.maNoiBo || "",
        "Mã thuốc": r.drugMap?.masterDrug?.maChung || r.drugMap?.maNoiBo || "",
        "Mã BHYT": r.drugMap?.masterDrug?.maBhyt || "",
        "Tên thuốc": r.drugMap?.masterDrug?.tenThuoc || r.drugMap?.tenThuocNoiBo || "",
        "Hoạt chất": r.drugMap?.masterDrug?.hoatChat || r.drugMap?.hoatChatNoiBo || "",
        "Hàm lượng": r.drugMap?.masterDrug?.hamLuong || "",
        "Dạng bào chế": r.drugMap?.masterDrug?.dangBaoChe || "",
        "Đơn vị tính": r.drugMap?.donViTinhNoiBo || r.drugMap?.masterDrug?.donViTinh || "",
        "Nhóm TCKT": r.drugMap?.nhomTckt || "",
        "Tồn đầu": Number(r.tonDau),
        "Nhập trong kỳ": Number(r.nhap),
        "Xuất trong kỳ": Number(r.xuat),
        "Tồn cuối": Number(r.tonCuoi),
        "Giá VAT": Number(r.giaVat),
        "Thành tiền tồn cuối": Number(r.thanhTienTonCuoi),
        "Số QĐ trúng thầu": r.soQdTrungThau || "",
        "Tên Công ty": r.tenCongTy || "",
        "Ngày bắt đầu HĐ": r.ngayBatDauHd || "",
        "Ngày kết thúc HĐ": r.ngayKetThucHd || "",
        "BHYT": r.bhyt || "",
        "Dịch vụ": r.dichVu || "",
    };
    return base;
}

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const month = searchParams.get("month");
        const facilityId = searchParams.get("facilityId");
        const mode = searchParams.get("mode") || "summary"; // "summary" | "detail"

        // Build where clause
        const where: any = {};
        if (month) where.reportMonth = month;
        if (facilityId) where.facilityId = facilityId;

        const reportSummaries = await listReportMonthSummaries({
            ...(month ? { month } : {}),
            ...(facilityId ? { facilityId } : {}),
        });

        // Fetch all inventory reports with related data
        const reports = await prisma.inventoryReport.findMany({
            where,
            include: {
                facility: { select: { facilityName: true, username: true } },
                drugMap: { include: { masterDrug: true } },
            },
            orderBy: [
                { facility: { facilityName: "asc" } },
                { reportMonth: "desc" },
                { drugMap: { tenThuocNoiBo: "asc" } },
            ],
        });

        if (reports.length === 0 && reportSummaries.length === 0) {
            return NextResponse.json({ message: "Không có dữ liệu để xuất" }, { status: 404 });
        }

        const facilityIds = Array.from(new Set(reportSummaries.map((summary) => summary.facilityId)));
        const facilityRows = facilityIds.length > 0
            ? await prisma.user.findMany({
                where: { id: { in: facilityIds } },
                select: { id: true, facilityName: true, username: true },
            })
            : [];
        const facilityNames = new Map(
            facilityRows.map((facility) => [facility.id, facility.facilityName || facility.username || "Unknown Facility"])
        );
        const emptySummaries = reportSummaries.filter((summary) => summary.reportedRowCount === 0);

        const workbook = XLSX.utils.book_new();

        if (mode === "detail") {
            // === DETAIL MODE: one sheet per facility (per month) ===

            // Group by facilityId + reportMonth
            const grouped = new Map<string, typeof reports>();
            for (const r of reports) {
                const key = `${r.facilityId}___${r.reportMonth}`;
                if (!grouped.has(key)) grouped.set(key, []);
                grouped.get(key)!.push(r);
            }

            // Sheet 1: Tổng hợp (summary across all)
            if (reports.length > 0) {
                const summaryData = reports.map((r, i) => buildRowFromReport(r, i, true));
                const summaryWs = XLSX.utils.json_to_sheet(summaryData);
                summaryWs["!cols"] = COL_WIDTHS_SUMMARY;
                applyHeaderStyle(summaryWs, Object.keys(summaryData[0] || {}).length);
                XLSX.utils.book_append_sheet(workbook, summaryWs, "Tổng hợp");
            }

            // Subsequent sheets: one per facility+month
            let sheetIndex = 0;
            for (const [, items] of grouped.entries()) {
                const facilityName = items[0].facility.facilityName || items[0].facility.username || "CoSo";
                const reportMonth = items[0].reportMonth;

                // Sheet name max 31 chars (Excel limit)
                const sheetName = `${facilityName.slice(0, 20)}_${reportMonth.replace("/", "-")}`.slice(0, 31);

                // Per-facility row (no "Cơ sở y tế" column — it's in the header instead)
                const detailData = items.map((r, i) => buildRowFromReport(r, i, false));

                const ws = XLSX.utils.json_to_sheet(detailData);
                ws["!cols"] = COL_WIDTHS_DETAIL;
                applyHeaderStyle(ws, Object.keys(detailData[0] || {}).length);

                // Ensure unique sheet name
                const finalName = workbook.SheetNames.includes(sheetName)
                    ? `${sheetName.slice(0, 28)}_${sheetIndex}`
                    : sheetName;
                XLSX.utils.book_append_sheet(workbook, ws, finalName);
                sheetIndex++;
            }

            appendEmptySummarySheet(workbook, emptySummaries, facilityNames);

        } else {
            // === SUMMARY MODE (default): single flat sheet ===
            if (reports.length > 0) {
                const excelData = reports.map((r, i) => buildRowFromReport(r, i, true));
                const worksheet = XLSX.utils.json_to_sheet(excelData);
                worksheet["!cols"] = COL_WIDTHS_SUMMARY;
                applyHeaderStyle(worksheet, Object.keys(excelData[0] || {}).length);
                XLSX.utils.book_append_sheet(workbook, worksheet, "Báo cáo tổng hợp");
            }

            appendEmptySummarySheet(workbook, emptySummaries, facilityNames);
        }

        // Write to buffer
        const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

        // Build filename
        const filterParts: string[] = [];
        if (month) filterParts.push(month.replace("/", "-"));
        if (facilityId) {
            const facility = await prisma.user.findUnique({ where: { id: facilityId }, select: { facilityName: true } });
            if (facility?.facilityName) filterParts.push(facility.facilityName.replace(/\s+/g, "_"));
        }
        const suffix = filterParts.length > 0 ? `_${filterParts.join("_")}` : "";
        const modeLabel = mode === "detail" ? "_ChiTiet" : "_TongHop";
        const fileName = `Bao_Cao${modeLabel}${suffix}.xlsx`;

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
            },
        });

    } catch (error) {
        console.error("Error exporting reports:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
