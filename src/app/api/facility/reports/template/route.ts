import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createFacilityReportRowToken } from "@/lib/facility-report-token";
import { buildFacilityReportTemplateRows, loadFacilityReportCanonicalContext } from "@/lib/facility-report-upload";
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
    REPORT_FIELD_SO_QD_TRUNG_THAU,
    REPORT_FIELD_STT,
    REPORT_FIELD_TEN_CONG_TY,
    REPORT_FIELD_TEN_THUOC,
    REPORT_FIELD_THANH_TIEN_TON_CUOI,
    REPORT_FIELD_TON_CUOI,
    REPORT_FIELD_TON_DAU,
    REPORT_FIELD_XUAT,
    REPORT_ROW_TOKEN_COLUMN,
} from "@/lib/report-validation";

export const runtime = "nodejs";

type TemplateColumn = {
    header: string;
    key: string;
    width: number;
    hidden?: boolean;
    locked: boolean;
};

type InstructionRow = {
    "Tên trường": string;
    "Kiểu dữ liệu": string;
    "Định dạng/Ví dụ": string;
    "Ghi chú": string;
};

const TEMPLATE_SHEET_PASSWORD = "facility-report-template";

const READ_ONLY_FILL = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE5EEF9" },
} as const;

const EDITABLE_FILL = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFF7D6" },
} as const;

const READ_ONLY_HEADER_FILL = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFC9DDF2" },
} as const;

const EDITABLE_HEADER_FILL = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFE9A8" },
} as const;

const HEADER_FONT = {
    bold: true,
    color: { argb: "FF1F2937" },
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
    REPORT_FIELD_XUAT,
    REPORT_FIELD_TON_CUOI,
    REPORT_FIELD_GIA_VAT,
    REPORT_FIELD_THANH_TIEN_TON_CUOI,
    REPORT_FIELD_BHYT,
    REPORT_FIELD_DICH_VU,
]);

const TEMPLATE_COLUMNS: TemplateColumn[] = [
    { header: REPORT_FIELD_STT, key: REPORT_FIELD_STT, width: 5, locked: true },
    { header: REPORT_FIELD_MA_NOI_BO, key: REPORT_FIELD_MA_NOI_BO, width: 15, locked: true },
    { header: REPORT_FIELD_MA_THUOC, key: REPORT_FIELD_MA_THUOC, width: 15, locked: true },
    { header: REPORT_FIELD_TEN_THUOC, key: REPORT_FIELD_TEN_THUOC, width: 30, locked: true },
    { header: REPORT_FIELD_HOAT_CHAT, key: REPORT_FIELD_HOAT_CHAT, width: 20, locked: true },
    { header: REPORT_FIELD_DON_VI_TINH, key: REPORT_FIELD_DON_VI_TINH, width: 10, locked: true },
    { header: REPORT_FIELD_NHOM_TCKT, key: REPORT_FIELD_NHOM_TCKT, width: 12, locked: true },
    { header: REPORT_FIELD_TON_DAU, key: REPORT_FIELD_TON_DAU, width: 10, locked: false },
    { header: REPORT_FIELD_NHAP, key: REPORT_FIELD_NHAP, width: 10, locked: false },
    { header: REPORT_FIELD_XUAT, key: REPORT_FIELD_XUAT, width: 10, locked: false },
    { header: REPORT_FIELD_TON_CUOI, key: REPORT_FIELD_TON_CUOI, width: 10, locked: false },
    { header: REPORT_FIELD_GIA_VAT, key: REPORT_FIELD_GIA_VAT, width: 10, locked: false },
    { header: REPORT_FIELD_THANH_TIEN_TON_CUOI, key: REPORT_FIELD_THANH_TIEN_TON_CUOI, width: 18, locked: false },
    { header: REPORT_FIELD_SO_QD_TRUNG_THAU, key: REPORT_FIELD_SO_QD_TRUNG_THAU, width: 18, locked: false },
    { header: REPORT_FIELD_TEN_CONG_TY, key: REPORT_FIELD_TEN_CONG_TY, width: 25, locked: false },
    { header: REPORT_FIELD_NGAY_BAT_DAU_HD, key: REPORT_FIELD_NGAY_BAT_DAU_HD, width: 15, locked: false },
    { header: REPORT_FIELD_NGAY_KET_THUC_HD, key: REPORT_FIELD_NGAY_KET_THUC_HD, width: 15, locked: false },
    { header: REPORT_FIELD_BHYT, key: REPORT_FIELD_BHYT, width: 8, locked: false },
    { header: REPORT_FIELD_DICH_VU, key: REPORT_FIELD_DICH_VU, width: 8, locked: false },
    { header: REPORT_FIELD_BO_QUA, key: REPORT_FIELD_BO_QUA, width: 10, locked: false },
    { header: REPORT_FIELD_GHI_CHU, key: REPORT_FIELD_GHI_CHU, width: 24, locked: false },
    { header: REPORT_ROW_TOKEN_COLUMN, key: REPORT_ROW_TOKEN_COLUMN, width: 40, hidden: true, locked: true },
];

const INSTRUCTION_SHEET_COLUMNS = [
    { header: "Tên trường", key: "Tên trường", width: 24 },
    { header: "Kiểu dữ liệu", key: "Kiểu dữ liệu", width: 18 },
    { header: "Định dạng/Ví dụ", key: "Định dạng/Ví dụ", width: 42 },
    { header: "Ghi chú", key: "Ghi chú", width: 90 },
];

const INSTRUCTIONS: InstructionRow[] = [
    {
        "Tên trường": "Cột bị khóa",
        "Kiểu dữ liệu": "Văn bản",
        "Định dạng/Ví dụ": "STT / Mã nội bộ / Mã thuốc / Tên thuốc / Hoạt chất / Đơn vị tính / Nhóm TCKT",
        "Ghi chú": "Các cột này đã bị khóa để tránh sửa nhầm. Có thể chọn ô để copy hoặc dùng filter, nhưng không được chỉnh sửa.",
    },
    {
        "Tên trường": "Nhóm TCKT",
        "Kiểu dữ liệu": "Danh mục",
        "Định dạng/Ví dụ": "BĐG / Nhóm 1 / Nhóm 2 / Nhóm 3 / Nhóm 4 / Nhóm 5",
        "Ghi chú": "Giá trị cố định theo Mã nội bộ, được thiết lập tại màn Danh mục thuốc nội bộ. Không chỉnh sửa trong file báo cáo.",
    },
    {
        "Tên trường": "Điều chỉnh hiển thị",
        "Kiểu dữ liệu": "Thao tác",
        "Định dạng/Ví dụ": "Kéo giãn cột / chỉnh chiều cao hàng",
        "Ghi chú": "Trong sheet BaoCao, được phép đổi độ rộng cột và chiều cao hàng để dễ đọc dữ liệu hơn. Việc này không thay đổi các cột được phép nhập.",
    },
    {
        "Tên trường": "Lọc dữ liệu",
        "Kiểu dữ liệu": "Thao tác",
        "Định dạng/Ví dụ": "Filter ở hàng tiêu đề",
        "Ghi chú": "Được phép dùng bộ lọc trên hàng tiêu đề để tìm và xem dữ liệu nhanh hơn.",
    },
    {
        "Tên trường": "Cột kỹ thuật",
        "Kiểu dữ liệu": "Ẩn",
        "Định dạng/Ví dụ": "__ROW_TOKEN",
        "Ghi chú": "Cột kỹ thuật dùng để xác thực dòng báo cáo. Không được xóa, sửa, copy từ file khác hoặc dùng file mẫu cũ.",
    },
    {
        "Tên trường": "Bỏ qua",
        "Kiểu dữ liệu": "Văn bản",
        "Định dạng/Ví dụ": "X",
        "Ghi chú": "Nếu thuốc không phát sinh dữ liệu báo cáo trong tháng này, nhập X vào cột Bỏ qua. Dòng đó sẽ không được lưu vào báo cáo tháng và không bắt buộc nhập BHYT/Dịch vụ.",
    },
    {
        "Tên trường": "Mẫu cũ",
        "Kiểu dữ liệu": "Lưu ý",
        "Định dạng/Ví dụ": "File không có cột khóa dòng",
        "Ghi chú": "Các file mẫu cũ sẽ bị từ chối. Luôn tải lại mẫu mới cho đúng tháng trước khi nhập dữ liệu.",
    },
    {
        "Tên trường": "Nộp một lần",
        "Kiểu dữ liệu": "Lưu ý",
        "Định dạng/Ví dụ": "Tháng đã nộp",
        "Ghi chú": "Sau khi nộp thành công, báo cáo tháng đó sẽ được chốt và không thể nộp lại từ màn facility.",
    },
    {
        "Tên trường": "Tồn đầu",
        "Kiểu dữ liệu": "Số",
        "Định dạng/Ví dụ": "100",
        "Ghi chú": "Số lượng tồn kho đầu kỳ, mặc định bằng Tồn cuối tháng trước khi có dữ liệu.",
    },
    {
        "Tên trường": "Nhập trong kỳ",
        "Kiểu dữ liệu": "Số",
        "Định dạng/Ví dụ": "50",
        "Ghi chú": "Số lượng nhập trong kỳ báo cáo.",
    },
    {
        "Tên trường": "Xuất trong kỳ",
        "Kiểu dữ liệu": "Số",
        "Định dạng/Ví dụ": "30",
        "Ghi chú": "Số lượng xuất trong kỳ báo cáo.",
    },
    {
        "Tên trường": "Tồn cuối",
        "Kiểu dữ liệu": "Số",
        "Định dạng/Ví dụ": "120",
        "Ghi chú": "Công thức: Tồn đầu + Nhập trong kỳ - Xuất trong kỳ.",
    },
    {
        "Tên trường": "Giá VAT",
        "Kiểu dữ liệu": "Số",
        "Định dạng/Ví dụ": "25000",
        "Ghi chú": "Đơn giá bao gồm VAT, không được nhập âm.",
    },
    {
        "Tên trường": "Thành tiền tồn cuối",
        "Kiểu dữ liệu": "Số",
        "Định dạng/Ví dụ": "3000000",
        "Ghi chú": "Công thức: Tồn cuối × Giá VAT.",
    },
    {
        "Tên trường": "Số QĐ trúng thầu",
        "Kiểu dữ liệu": "Văn bản",
        "Định dạng/Ví dụ": "123/QĐ-BYT",
        "Ghi chú": "Để trống nếu không có.",
    },
    {
        "Tên trường": "Tên Công ty",
        "Kiểu dữ liệu": "Văn bản",
        "Định dạng/Ví dụ": "Công ty TNHH ABC",
        "Ghi chú": "Tên công ty cung cấp thuốc.",
    },
    {
        "Tên trường": "Ngày bắt đầu HĐ",
        "Kiểu dữ liệu": "Văn bản",
        "Định dạng/Ví dụ": "20260101",
        "Ghi chú": "Định dạng YYYYMMDD. Để trống nếu không có.",
    },
    {
        "Tên trường": "Ngày kết thúc HĐ",
        "Kiểu dữ liệu": "Văn bản",
        "Định dạng/Ví dụ": "20261231",
        "Ghi chú": "Định dạng YYYYMMDD. Không được nhỏ hơn Ngày bắt đầu HĐ.",
    },
    {
        "Tên trường": "BHYT",
        "Kiểu dữ liệu": "Văn bản",
        "Định dạng/Ví dụ": "X",
        "Ghi chú": "Chỉ nhập X hoặc để trống. Nếu cột Bỏ qua để trống, phải đánh dấu X ở ít nhất một trong hai cột BHYT hoặc Dịch vụ.",
    },
    {
        "Tên trường": "Dịch vụ",
        "Kiểu dữ liệu": "Văn bản",
        "Định dạng/Ví dụ": "X",
        "Ghi chú": "Chỉ nhập X hoặc để trống. Nếu cột Bỏ qua để trống, phải đánh dấu X ở ít nhất một trong hai cột BHYT hoặc Dịch vụ; có thể đánh dấu cả hai.",
    },
];

const setTemplateHeaderCellStyle = (cell: ExcelJS.Cell, locked: boolean) => {
    cell.font = HEADER_FONT;
    cell.alignment = CENTER_ALIGNMENT;
    cell.fill = locked ? READ_ONLY_HEADER_FILL : EDITABLE_HEADER_FILL;
    cell.border = DEFAULT_BORDER;
    cell.protection = { locked: true };
};

const setTemplateDataCellStyle = (cell: ExcelJS.Cell, columnKey: string, locked: boolean) => {
    cell.alignment = CENTER_ALIGNED_COLUMNS.has(columnKey) ? CENTER_ALIGNMENT : TEXT_ALIGNMENT;
    cell.fill = locked ? READ_ONLY_FILL : EDITABLE_FILL;
    cell.border = DEFAULT_BORDER;
    cell.protection = { locked };
};

const addXMarkerValidation = (
    worksheet: ExcelJS.Worksheet,
    columnKey: string,
    lastRow: number
) => {
    if (lastRow < 2) return;
    const column = worksheet.getColumn(columnKey);

    for (let rowNumber = 2; rowNumber <= lastRow; rowNumber += 1) {
        worksheet.getCell(`${column.letter}${rowNumber}`).dataValidation = {
            type: "list",
            allowBlank: true,
            formulae: ['"X"'],
            showErrorMessage: true,
            errorTitle: "Giá trị không hợp lệ",
            error: 'Chỉ được nhập "X" hoặc để trống',
        };
    }
};

const WORKBOOK_VIEW: ExcelJS.WorkbookView = {
    x: 0,
    y: 0,
    width: 12000,
    height: 18000,
    firstSheet: 0,
    activeTab: 0,
    visibility: "visible",
};

const getWorksheetColumns = (): Partial<ExcelJS.Column>[] =>
    TEMPLATE_COLUMNS.map((column) => ({
        header: column.header,
        key: column.key,
        width: column.width,
        hidden: column.hidden,
    }));

const getLastVisibleColumnIndex = () => {
    let lastVisibleIndex = 1;

    TEMPLATE_COLUMNS.forEach((column, index) => {
        if (!column.hidden) {
            lastVisibleIndex = index + 1;
        }
    });

    return lastVisibleIndex;
};

const createTemplateWorkbook = async (
    data: Array<Record<string, string | number | null>>
) => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "sudungthuoc";
    workbook.created = new Date();
    workbook.modified = new Date();
    workbook.views = [WORKBOOK_VIEW];

    const worksheet = workbook.addWorksheet("BaoCao", {
        views: [{ state: "frozen", ySplit: 1 }],
    });

    worksheet.columns = getWorksheetColumns();
    worksheet.properties.defaultRowHeight = 22;
    worksheet.addRows(data);
    worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: getLastVisibleColumnIndex() },
    };

    const headerRow = worksheet.getRow(1);
    headerRow.height = 24;
    TEMPLATE_COLUMNS.forEach((column, index) => {
        setTemplateHeaderCellStyle(headerRow.getCell(index + 1), column.locked);
    });

    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber === 1) return;

        TEMPLATE_COLUMNS.forEach((column, index) => {
            const cell = row.getCell(index + 1);
            setTemplateDataCellStyle(cell, column.key, column.locked);
        });
    });

    const lastRow = data.length + 1;
    addXMarkerValidation(worksheet, REPORT_FIELD_BHYT, lastRow);
    addXMarkerValidation(worksheet, REPORT_FIELD_DICH_VU, lastRow);
    addXMarkerValidation(worksheet, REPORT_FIELD_BO_QUA, lastRow);

    await worksheet.protect(TEMPLATE_SHEET_PASSWORD, {
        selectLockedCells: true,
        selectUnlockedCells: true,
        formatCells: false,
        formatColumns: true,
        formatRows: true,
        insertColumns: false,
        insertRows: false,
        insertHyperlinks: false,
        deleteColumns: false,
        deleteRows: true,
        sort: false,
        autoFilter: true,
        pivotTables: false,
        spinCount: 1000,
    });

    const instructionSheet = workbook.addWorksheet("Hướng dẫn", {
        views: [{ state: "frozen", ySplit: 1 }],
    });

    instructionSheet.columns = INSTRUCTION_SHEET_COLUMNS;
    instructionSheet.properties.defaultRowHeight = 22;
    instructionSheet.addRows(INSTRUCTIONS);

    instructionSheet.getRow(1).height = 24;
    instructionSheet.getRow(1).eachCell((cell) => {
        cell.font = HEADER_FONT;
        cell.alignment = CENTER_ALIGNMENT;
        cell.fill = READ_ONLY_HEADER_FILL;
        cell.border = DEFAULT_BORDER;
    });

    instructionSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber === 1) return;
        row.eachCell((cell) => {
            cell.alignment = TEXT_ALIGNMENT;
            cell.border = DEFAULT_BORDER;
        });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
};

export async function GET(request: Request) {
    try {
        const session = await auth();
        if (!session || session.user.role !== "FACILITY") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const month = searchParams.get("month");

        if (!month) {
            return NextResponse.json({ message: "Missing month parameter" }, { status: 400 });
        }

        const context = await loadFacilityReportCanonicalContext(session.user.id, month);
        const data = buildFacilityReportTemplateRows(context).map((row, index) => ({
            ...row,
            [REPORT_ROW_TOKEN_COLUMN]: createFacilityReportRowToken({
                facilityId: session.user.id,
                reportMonth: month,
                mapId: context.rows[index].mapId,
            }),
        }));

        const buffer = await createTemplateWorkbook(data);

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="bao_cao_${month.replace("/", "_")}.xlsx"`,
            },
        });
    } catch (error) {
        console.error("Error generating facility report template:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
