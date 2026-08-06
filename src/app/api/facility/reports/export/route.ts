import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireActiveSessionUser, isRouteError } from "@/lib/server-authz";
import {
    REPORT_FIELD_BHYT,
    REPORT_FIELD_BO_QUA,
    REPORT_FIELD_DICH_VU,
    REPORT_FIELD_DON_VI_TINH,
    REPORT_FIELD_GHI_CHU,
    REPORT_FIELD_GIA_VAT,
    REPORT_FIELD_HOAT_CHAT,
    REPORT_FIELD_MA_NOI_BO,
    REPORT_FIELD_MA_THUOC,
    REPORT_FIELD_NHOM_TCKT,
    REPORT_FIELD_NGAY_BAT_DAU_HD,
    REPORT_FIELD_NGAY_KET_THUC_HD,
    REPORT_FIELD_NHAP,
    REPORT_FIELD_NHAP_HOAN_TRA,
    REPORT_FIELD_SO_QD_TRUNG_THAU,
    REPORT_FIELD_STT,
    REPORT_FIELD_TEN_CONG_TY,
    REPORT_FIELD_TEN_THUOC,
    REPORT_FIELD_THANH_TIEN_TON_CUOI,
    REPORT_FIELD_TON_CUOI,
    REPORT_FIELD_TON_DAU,
    REPORT_FIELD_XUAT,
} from "@/lib/report-validation";

export const runtime = "nodejs";

type ExportColumn = {
    header: string;
    key: string;
    width: number;
};

const EXPORT_COLUMNS: ExportColumn[] = [
    { header: REPORT_FIELD_STT, key: REPORT_FIELD_STT, width: 5 },
    { header: REPORT_FIELD_MA_NOI_BO, key: REPORT_FIELD_MA_NOI_BO, width: 15 },
    { header: REPORT_FIELD_MA_THUOC, key: REPORT_FIELD_MA_THUOC, width: 15 },
    { header: REPORT_FIELD_TEN_THUOC, key: REPORT_FIELD_TEN_THUOC, width: 30 },
    { header: REPORT_FIELD_HOAT_CHAT, key: REPORT_FIELD_HOAT_CHAT, width: 20 },
    { header: REPORT_FIELD_DON_VI_TINH, key: REPORT_FIELD_DON_VI_TINH, width: 10 },
    { header: REPORT_FIELD_NHOM_TCKT, key: REPORT_FIELD_NHOM_TCKT, width: 12 },
    { header: REPORT_FIELD_TON_DAU, key: REPORT_FIELD_TON_DAU, width: 10 },
    { header: REPORT_FIELD_NHAP, key: REPORT_FIELD_NHAP, width: 10 },
    { header: REPORT_FIELD_NHAP_HOAN_TRA, key: REPORT_FIELD_NHAP_HOAN_TRA, width: 16 },
    { header: REPORT_FIELD_XUAT, key: REPORT_FIELD_XUAT, width: 10 },
    { header: REPORT_FIELD_TON_CUOI, key: REPORT_FIELD_TON_CUOI, width: 10 },
    { header: REPORT_FIELD_GIA_VAT, key: REPORT_FIELD_GIA_VAT, width: 10 },
    { header: REPORT_FIELD_THANH_TIEN_TON_CUOI, key: REPORT_FIELD_THANH_TIEN_TON_CUOI, width: 18 },
    { header: REPORT_FIELD_SO_QD_TRUNG_THAU, key: REPORT_FIELD_SO_QD_TRUNG_THAU, width: 18 },
    { header: REPORT_FIELD_TEN_CONG_TY, key: REPORT_FIELD_TEN_CONG_TY, width: 25 },
    { header: REPORT_FIELD_NGAY_BAT_DAU_HD, key: REPORT_FIELD_NGAY_BAT_DAU_HD, width: 15 },
    { header: REPORT_FIELD_NGAY_KET_THUC_HD, key: REPORT_FIELD_NGAY_KET_THUC_HD, width: 15 },
    { header: REPORT_FIELD_BHYT, key: REPORT_FIELD_BHYT, width: 8 },
    { header: REPORT_FIELD_DICH_VU, key: REPORT_FIELD_DICH_VU, width: 8 },
    { header: REPORT_FIELD_BO_QUA, key: REPORT_FIELD_BO_QUA, width: 10 },
    { header: REPORT_FIELD_GHI_CHU, key: REPORT_FIELD_GHI_CHU, width: 24 },
];

const HEADER_FILL = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFC9DDF2" },
} as const;

const DATA_FILL = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE5EEF9" },
} as const;

const DEFAULT_BORDER = {
    top: { style: "thin", color: { argb: "FFD1D5DB" } },
    left: { style: "thin", color: { argb: "FFD1D5DB" } },
    bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
    right: { style: "thin", color: { argb: "FFD1D5DB" } },
} as const;

const CENTER_ALIGNMENT = {
    vertical: "middle",
    horizontal: "center",
    wrapText: true,
} as const;

const TEXT_ALIGNMENT = {
    vertical: "middle",
    horizontal: "left",
    wrapText: true,
} as const;

const CENTER_ALIGNED_COLUMNS = new Set([
    REPORT_FIELD_STT,
    REPORT_FIELD_NHOM_TCKT,
    REPORT_FIELD_TON_DAU,
    REPORT_FIELD_NHAP,
    REPORT_FIELD_NHAP_HOAN_TRA,
    REPORT_FIELD_XUAT,
    REPORT_FIELD_TON_CUOI,
    REPORT_FIELD_GIA_VAT,
    REPORT_FIELD_THANH_TIEN_TON_CUOI,
    REPORT_FIELD_BHYT,
    REPORT_FIELD_DICH_VU,
    REPORT_FIELD_BO_QUA,
]);

const sanitizeFilePart = (value: string) =>
    value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9_-]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 80) || "co_so";

function styleWorksheet(worksheet: ExcelJS.Worksheet) {
    worksheet.properties.defaultRowHeight = 22;
    worksheet.views = [{ state: "frozen", ySplit: 1 }];
    worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: EXPORT_COLUMNS.length },
    };

    const headerRow = worksheet.getRow(1);
    headerRow.height = 24;
    EXPORT_COLUMNS.forEach((_, index) => {
        const cell = headerRow.getCell(index + 1);
        cell.font = { bold: true, color: { argb: "FF1F2937" } };
        cell.alignment = CENTER_ALIGNMENT;
        cell.fill = HEADER_FILL;
        cell.border = DEFAULT_BORDER;
    });

    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber === 1) return;

        EXPORT_COLUMNS.forEach((column, index) => {
            const cell = row.getCell(index + 1);
            cell.alignment = CENTER_ALIGNED_COLUMNS.has(column.key) ? CENTER_ALIGNMENT : TEXT_ALIGNMENT;
            cell.fill = DATA_FILL;
            cell.border = DEFAULT_BORDER;
        });
    });
}

async function buildWorkbook(params: {
    facilityId: string;
    month: string;
    skippedRowCount: number;
}) {
    const reports = await prisma.inventoryReport.findMany({
        where: {
            facilityId: params.facilityId,
            reportMonth: params.month,
        },
        include: {
            drugMap: {
                include: {
                    masterDrug: true,
                },
            },
        },
        orderBy: {
            drugMap: {
                tenThuocNoiBo: "asc",
            },
        },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "sudungthuoc";
    workbook.created = new Date();
    workbook.modified = new Date();

    const worksheet = workbook.addWorksheet("BaoCao");
    worksheet.columns = EXPORT_COLUMNS;
    worksheet.addRows(reports.map((report, index) => ({
        [REPORT_FIELD_STT]: index + 1,
        [REPORT_FIELD_MA_NOI_BO]: report.drugMap?.maNoiBo || "",
        [REPORT_FIELD_MA_THUOC]: report.drugMap?.masterDrug?.maChung || report.drugMap?.maNoiBo || "",
        [REPORT_FIELD_TEN_THUOC]: report.drugMap?.masterDrug?.tenThuoc || report.drugMap?.tenThuocNoiBo || "",
        [REPORT_FIELD_HOAT_CHAT]: report.drugMap?.masterDrug?.hoatChat || report.drugMap?.hoatChatNoiBo || "",
        [REPORT_FIELD_DON_VI_TINH]: report.drugMap?.donViTinhNoiBo || report.drugMap?.masterDrug?.donViTinh || "",
        [REPORT_FIELD_NHOM_TCKT]: report.drugMap?.nhomTckt || "",
        [REPORT_FIELD_TON_DAU]: Number(report.tonDau),
        [REPORT_FIELD_NHAP]: Number(report.nhap),
        [REPORT_FIELD_NHAP_HOAN_TRA]: Number(report.nhapHoanTra),
        [REPORT_FIELD_XUAT]: Number(report.xuat),
        [REPORT_FIELD_TON_CUOI]: Number(report.tonCuoi),
        [REPORT_FIELD_GIA_VAT]: Number(report.giaVat),
        [REPORT_FIELD_THANH_TIEN_TON_CUOI]: Number(report.thanhTienTonCuoi),
        [REPORT_FIELD_SO_QD_TRUNG_THAU]: report.soQdTrungThau || "",
        [REPORT_FIELD_TEN_CONG_TY]: report.tenCongTy || "",
        [REPORT_FIELD_NGAY_BAT_DAU_HD]: report.ngayBatDauHd || "",
        [REPORT_FIELD_NGAY_KET_THUC_HD]: report.ngayKetThucHd || "",
        [REPORT_FIELD_BHYT]: report.bhyt || "",
        [REPORT_FIELD_DICH_VU]: report.dichVu || "",
        [REPORT_FIELD_BO_QUA]: "",
        [REPORT_FIELD_GHI_CHU]: "",
    })));
    styleWorksheet(worksheet);

    if (reports.length === 0) {
        const infoSheet = workbook.addWorksheet("ThongTin");
        infoSheet.columns = [
            { header: "Trường", key: "field", width: 24 },
            { header: "Giá trị", key: "value", width: 80 },
        ];
        infoSheet.addRows([
            { field: "Kỳ báo cáo", value: params.month },
            { field: "Dòng báo cáo đã lưu", value: 0 },
            { field: "Dòng bỏ qua", value: params.skippedRowCount },
            { field: "Ghi chú", value: "Kỳ này không có dòng dữ liệu đã lưu; các dòng trong file nộp đã được đánh dấu Bỏ qua." },
        ]);
        infoSheet.getRow(1).eachCell((cell) => {
            cell.font = { bold: true };
            cell.fill = HEADER_FILL;
            cell.border = DEFAULT_BORDER;
            cell.alignment = CENTER_ALIGNMENT;
        });
        infoSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            if (rowNumber === 1) return;
            row.eachCell((cell) => {
                cell.border = DEFAULT_BORDER;
                cell.alignment = TEXT_ALIGNMENT;
            });
        });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
}

export async function GET(request: Request) {
    try {
        const sessionContext = await requireActiveSessionUser("FACILITY");
        const { searchParams } = new URL(request.url);
        const month = searchParams.get("month");

        if (!month) {
            return NextResponse.json({ message: "Thiếu kỳ báo cáo" }, { status: 400 });
        }

        const submission = await prisma.facilityReportSubmission.findUnique({
            where: {
                facilityId_reportMonth: {
                    facilityId: sessionContext.user.id,
                    reportMonth: month,
                },
            },
            select: {
                skippedRowCount: true,
            },
        });

        const hasLegacyRows = submission
            ? true
            : Boolean(await prisma.inventoryReport.findFirst({
                where: {
                    facilityId: sessionContext.user.id,
                    reportMonth: month,
                },
                select: { id: true },
            }));

        if (!submission && !hasLegacyRows) {
            return NextResponse.json({ message: "Không có dữ liệu báo cáo để xuất" }, { status: 404 });
        }

        const buffer = await buildWorkbook({
            facilityId: sessionContext.user.id,
            month,
            skippedRowCount: submission?.skippedRowCount || 0,
        });
        const facilityPart = sanitizeFilePart(sessionContext.user.facilityCode || sessionContext.user.facilityName || sessionContext.user.username);
        const monthPart = month.replace("/", "_");
        const fileName = `Bao_Cao_${facilityPart}_${monthPart}.xlsx`;

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
            },
        });
    } catch (error) {
        if (isRouteError(error)) {
            return NextResponse.json({ message: error.message }, { status: error.status });
        }

        console.error("Error exporting facility report:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
