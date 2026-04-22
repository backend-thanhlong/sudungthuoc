import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import {
    isRouteError,
    requireActiveSessionUser,
} from "@/lib/server-authz";
import {
    type ProcurementLookupItem,
    loadAllProcurementLookupItems,
    parseProcurementLookupQuery,
} from "@/lib/mua-sam-procurement-lookup";

const SUMMARY_HEADERS = [
    "STT",
    "Đơn vị",
    "Mã đơn vị",
    "Mã KHLCNT",
    "Tên KHLCNT",
    "Số quyết định KHLCNT",
    "Ngày phê duyệt KHLCNT",
    "Tên gói thầu",
    "Giá gói thầu",
    "Hình thức LCNT",
    "Phương thức LCNT",
    "Loại hợp đồng",
    "Số lượng phần lô",
    "Trạng thái gói thầu",
    "Mã TBMT",
    "Ngày đăng tải TBMT",
    "Ngày đóng thầu",
    "Số QĐ KQLCNT",
    "Ngày phê duyệt KQLCNT",
    "Số mặt hàng mời thầu",
    "Số mặt hàng trúng thầu",
    "Tổng giá trị trúng thầu",
    "Số nhà thầu trúng",
    "Danh sách nhà thầu trúng",
    "Trạng thái tiến trình",
] as const;

const DETAIL_HEADERS = [
    "STT",
    "Đơn vị",
    "Mã đơn vị",
    "Mã KHLCNT",
    "Tên KHLCNT",
    "Tên gói thầu",
    "Mã TBMT",
    "Số QĐ KQLCNT",
    "Trạng thái tiến trình",
    "Tên phần lô",
    "Kết quả phần lô",
    "Đơn giá trúng thầu",
    "Nhà thầu trúng thầu",
] as const;

const SUMMARY_COL_WIDTHS = [
    { wch: 6 },
    { wch: 32 },
    { wch: 14 },
    { wch: 18 },
    { wch: 36 },
    { wch: 22 },
    { wch: 16 },
    { wch: 36 },
    { wch: 18 },
    { wch: 20 },
    { wch: 20 },
    { wch: 22 },
    { wch: 16 },
    { wch: 20 },
    { wch: 18 },
    { wch: 18 },
    { wch: 16 },
    { wch: 22 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 22 },
    { wch: 16 },
    { wch: 42 },
    { wch: 24 },
] as const;

const DETAIL_COL_WIDTHS = [
    { wch: 6 },
    { wch: 32 },
    { wch: 14 },
    { wch: 18 },
    { wch: 36 },
    { wch: 36 },
    { wch: 18 },
    { wch: 22 },
    { wch: 24 },
    { wch: 36 },
    { wch: 20 },
    { wch: 18 },
    { wch: 32 },
] as const;

function applyHeaderStyle(ws: XLSX.WorkSheet, numCols: number) {
    for (let c = 0; c < numCols; c += 1) {
        const cell = XLSX.utils.encode_cell({ r: 0, c });
        if (!ws[cell]) {
            continue;
        }

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
}

function formatExcelDate(value: string | null | undefined) {
    if (!value) {
        return "";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "";
    }

    const day = `${date.getUTCDate()}`.padStart(2, "0");
    const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
    const year = `${date.getUTCFullYear()}`;

    return `${day}/${month}/${year}`;
}

function formatFileTimestamp(date: Date) {
    const year = `${date.getUTCFullYear()}`;
    const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
    const day = `${date.getUTCDate()}`.padStart(2, "0");
    const hours = `${date.getUTCHours()}`.padStart(2, "0");
    const minutes = `${date.getUTCMinutes()}`.padStart(2, "0");

    return `${year}-${month}-${day}_${hours}-${minutes}`;
}

function buildSummaryRows(items: ProcurementLookupItem[]) {
    return items.map((item, index) => ({
        "STT": index + 1,
        "Đơn vị": item.facilityName,
        "Mã đơn vị": item.facilityCode || "",
        "Mã KHLCNT": item.maKHLCNT || "",
        "Tên KHLCNT": item.tenKHLCNT || "",
        "Số quyết định KHLCNT": item.soQuyetDinh || "",
        "Ngày phê duyệt KHLCNT": formatExcelDate(item.ngayPheDuyet),
        "Tên gói thầu": item.tenGoiThau,
        "Giá gói thầu": item.giaGoiThau,
        "Hình thức LCNT": item.hinhThucLCNT || "",
        "Phương thức LCNT": item.phuongThucLCNT || "",
        "Loại hợp đồng": item.loaiHopDong.join(", "),
        "Số lượng phần lô": item.soLuongPhanLo,
        "Trạng thái gói thầu": item.trangThaiGoiThau || "",
        "Mã TBMT": item.maTBMT || "",
        "Ngày đăng tải TBMT": formatExcelDate(item.ngayDangTaiTBMT),
        "Ngày đóng thầu": formatExcelDate(item.ngayDongThau),
        "Số QĐ KQLCNT": item.soQdPheDuyetKQLCNT || "",
        "Ngày phê duyệt KQLCNT": formatExcelDate(item.ngayPheDuyetKQLCNT),
        "Số mặt hàng mời thầu": item.soMatHangMoiThau,
        "Số mặt hàng trúng thầu": item.soMatHangTrungThau,
        "Tổng giá trị trúng thầu": item.tongGiaTriTrungThau,
        "Số nhà thầu trúng": item.soLuongNhaThauTrung,
        "Danh sách nhà thầu trúng": item.danhSachNhaThauTrung.join("; "),
        "Trạng thái tiến trình": item.procurementStatus,
    }));
}

function buildDetailRows(items: ProcurementLookupItem[]) {
    let rowNumber = 1;

    return items.flatMap((item) =>
        item.phanLoResults.map((phanLo) => ({
            "STT": rowNumber++,
            "Đơn vị": item.facilityName,
            "Mã đơn vị": item.facilityCode || "",
            "Mã KHLCNT": item.maKHLCNT || "",
            "Tên KHLCNT": item.tenKHLCNT || "",
            "Tên gói thầu": item.tenGoiThau,
            "Mã TBMT": item.maTBMT || "",
            "Số QĐ KQLCNT": item.soQdPheDuyetKQLCNT || "",
            "Trạng thái tiến trình": item.procurementStatus,
            "Tên phần lô": phanLo.tenPhanLo || "",
            "Kết quả phần lô": phanLo.ketQua || "",
            "Đơn giá trúng thầu": phanLo.donGiaTrungThau,
            "Nhà thầu trúng thầu": phanLo.nhaThauTrungThau || "",
        }))
    );
}

function buildWorksheet(
    rows: Array<Record<string, string | number | null>>,
    headers: readonly string[],
    widths: readonly { wch: number }[]
) {
    const worksheet = rows.length > 0
        ? XLSX.utils.json_to_sheet(rows, { header: [...headers] })
        : XLSX.utils.aoa_to_sheet([[...headers]]);

    worksheet["!cols"] = [...widths];
    worksheet["!autofilter"] = {
        ref: XLSX.utils.encode_range({
            s: { r: 0, c: 0 },
            e: { r: 0, c: headers.length - 1 },
        }),
    };
    applyHeaderStyle(worksheet, headers.length);

    return worksheet;
}

const handleRouteError = (error: unknown, context: string) => {
    if (isRouteError(error)) {
        return NextResponse.json({ message: error.message }, { status: error.status });
    }

    console.error(context, error);
    return NextResponse.json(
        { message: "Internal server error" },
        { status: 500 }
    );
};

export async function GET(request: NextRequest) {
    try {
        await requireActiveSessionUser("ADMIN");

        const { searchParams } = new URL(request.url);
        const query = parseProcurementLookupQuery(searchParams);
        const items = await loadAllProcurementLookupItems(query);

        if (items.length === 0) {
            return NextResponse.json(
                { message: "Không có dữ liệu để xuất" },
                { status: 404 }
            );
        }

        const summaryRows = buildSummaryRows(items);
        const detailRows = buildDetailRows(items);
        const workbook = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            workbook,
            buildWorksheet(summaryRows, SUMMARY_HEADERS, SUMMARY_COL_WIDTHS),
            "TongHopGoiThau"
        );
        XLSX.utils.book_append_sheet(
            workbook,
            buildWorksheet(detailRows, DETAIL_HEADERS, DETAIL_COL_WIDTHS),
            "ChiTietPhanLo"
        );

        const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
        const fileName = `Tra_Cuu_Mua_Sam_${formatFileTimestamp(new Date())}.xlsx`;

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
                "Cache-Control": "no-store",
            },
        });
    } catch (error: unknown) {
        return handleRouteError(error, "Error exporting admin procurement lookup:");
    }
}
