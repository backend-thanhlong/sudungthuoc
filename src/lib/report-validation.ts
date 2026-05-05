/**
 * Shared report validation logic.
 * This module stays client-safe so the preview UI can reuse the same parsing
 * and formula checks as the server.
 */

export const REPORT_ROW_TOKEN_COLUMN = "__ROW_TOKEN";
export const REPORT_FIELD_STT = "STT";
export const REPORT_FIELD_MA_NOI_BO = "Mã nội bộ";
export const REPORT_FIELD_MA_THUOC = "Mã thuốc";
export const REPORT_FIELD_TEN_THUOC = "Tên thuốc";
export const REPORT_FIELD_HOAT_CHAT = "Hoạt chất";
export const REPORT_FIELD_DON_VI_TINH = "Đơn vị tính";
export const REPORT_FIELD_NHOM_TCKT = "Nhóm TCKT";
export const REPORT_FIELD_TON_DAU = "Tồn đầu";
export const REPORT_FIELD_NHAP = "Nhập trong kỳ";
export const REPORT_FIELD_XUAT = "Xuất trong kỳ";
export const REPORT_FIELD_TON_CUOI = "Tồn cuối";
export const REPORT_FIELD_GIA_VAT = "Giá VAT";
export const REPORT_FIELD_THANH_TIEN_TON_CUOI = "Thành tiền tồn cuối";
export const REPORT_FIELD_SO_QD_TRUNG_THAU = "Số QĐ trúng thầu";
export const REPORT_FIELD_TEN_CONG_TY = "Tên Công ty";
export const REPORT_FIELD_NGAY_BAT_DAU_HD = "Ngày bắt đầu HĐ";
export const REPORT_FIELD_NGAY_KET_THUC_HD = "Ngày kết thúc HĐ";
export const REPORT_FIELD_BHYT = "BHYT";
export const REPORT_FIELD_DICH_VU = "Dịch vụ";
export const REPORT_FIELD_BO_QUA = "Bỏ qua";
export const REPORT_FIELD_GHI_CHU = "Ghi chú";

export const REPORT_IMMUTABLE_FIELDS = [
    REPORT_FIELD_MA_NOI_BO,
    REPORT_FIELD_MA_THUOC,
    REPORT_FIELD_TEN_THUOC,
    REPORT_FIELD_HOAT_CHAT,
    REPORT_FIELD_DON_VI_TINH,
] as const;

export const REPORT_NUMERIC_FIELDS = [
    REPORT_FIELD_TON_DAU,
    REPORT_FIELD_NHAP,
    REPORT_FIELD_XUAT,
    REPORT_FIELD_TON_CUOI,
    REPORT_FIELD_GIA_VAT,
    REPORT_FIELD_THANH_TIEN_TON_CUOI,
] as const;

export const REPORT_DATE_FIELDS = [
    REPORT_FIELD_NGAY_BAT_DAU_HD,
    REPORT_FIELD_NGAY_KET_THUC_HD,
] as const;

export const REPORT_CATEGORICAL_FIELDS = [
    REPORT_FIELD_BHYT,
    REPORT_FIELD_DICH_VU,
] as const;

export const REPORT_PRESENCE_FIELDS = [
    REPORT_ROW_TOKEN_COLUMN,
    ...REPORT_IMMUTABLE_FIELDS,
    REPORT_FIELD_NHOM_TCKT,
    ...REPORT_NUMERIC_FIELDS,
    REPORT_FIELD_SO_QD_TRUNG_THAU,
    REPORT_FIELD_TEN_CONG_TY,
    ...REPORT_DATE_FIELDS,
    ...REPORT_CATEGORICAL_FIELDS,
    REPORT_FIELD_BO_QUA,
] as const;

export const REPORT_TOLERANCE = 0.01;

export const REPORT_VALIDATION_CODES = {
    missingRowToken: "MISSING_ROW_TOKEN",
    duplicateRowToken: "DUPLICATE_ROW_TOKEN",
    immutableFieldMismatch: "IMMUTABLE_FIELD_MISMATCH",
    invalidNumber: "INVALID_NUMBER",
    negativeNumber: "NEGATIVE_NUMBER",
    invalidCategoricalValue: "INVALID_CATEGORICAL_VALUE",
    invalidSkipValue: "INVALID_SKIP_VALUE",
    missingNhomTckt: "MISSING_NHOM_TCKT",
    invalidNhomTckt: "INVALID_NHOM_TCKT",
    invalidDate: "INVALID_DATE",
    dateRangeInvalid: "DATE_RANGE_INVALID",
    previousMonthStockMismatch: "PREVIOUS_MONTH_STOCK_MISMATCH",
    previousMonthReferenceMismatch: "PREVIOUS_MONTH_REFERENCE_MISMATCH",
    endingStockFormulaMismatch: "ENDING_STOCK_FORMULA_MISMATCH",
    endingValueFormulaMismatch: "ENDING_VALUE_FORMULA_MISMATCH",
    missingCategoryMark: "MISSING_CATEGORY_MARK",
    invalidRowToken: "INVALID_ROW_TOKEN",
    rowTokenFacilityMismatch: "ROW_TOKEN_FACILITY_MISMATCH",
    rowTokenMonthMismatch: "ROW_TOKEN_MONTH_MISMATCH",
    rowTokenTargetNotFound: "ROW_TOKEN_TARGET_NOT_FOUND",
    duplicateMapId: "DUPLICATE_MAP_ID",
} as const;

export const NHOM_TCKT_OPTIONS = ["BĐG", "Nhóm 1", "Nhóm 2", "Nhóm 3", "Nhóm 4", "Nhóm 5"] as const;

export type NhomTcktOption = (typeof NHOM_TCKT_OPTIONS)[number];

export type ReportValidationCode =
    (typeof REPORT_VALIDATION_CODES)[keyof typeof REPORT_VALIDATION_CODES];

export interface ValidationWarning {
    drug: string;
    message: string;
    expected?: number;
    actual?: number;
    field?: string;
    code?: ReportValidationCode;
}

export interface ReportRowInput {
    drugName: string;
    nhomTckt?: string | null;
    tonDau: number;
    nhap: number;
    xuat: number;
    tonCuoi: number;
    giaVat: number;
    thanhTienTonCuoi: number;
    bhyt?: string | null;
    dichVu?: string | null;
    boQua?: string | null;
    rowToken?: string | null;
    ngayBatDauHd?: string | null;
    ngayKetThucHd?: string | null;
    invalidNumericFields?: string[];
    negativeNumericFields?: string[];
    invalidDateFields?: string[];
    invalidCategoricalFields?: string[];
    invalidSkipFields?: string[];
    invalidNhomTckt?: boolean;
    missingNhomTckt?: boolean;
}

export interface ParsedReportRow extends ReportRowInput {
    maNoiBo?: string;
    maThuoc?: string;
}

const toCellString = (value: unknown) => {
    if (value === null || value === undefined) return "";
    return String(value).trim();
};

export const normalizeReportText = (value: unknown) =>
    toCellString(value).replace(/\s+/g, " ");

const normalizeNhomTcktKey = (value: unknown) =>
    normalizeReportText(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .toLowerCase();

const NHOM_TCKT_OPTION_MAP = new Map(
    NHOM_TCKT_OPTIONS.map((option) => [normalizeNhomTcktKey(option), option])
);

export const normalizeNhomTckt = (value: unknown): NhomTcktOption | null =>
    NHOM_TCKT_OPTION_MAP.get(normalizeNhomTcktKey(value)) || null;

export const isValidNhomTckt = (value: unknown): value is NhomTcktOption =>
    Boolean(normalizeNhomTckt(value));

export const getReportDisplayName = (row: Record<string, unknown>) =>
    normalizeReportText(row[REPORT_FIELD_TEN_THUOC])
    || normalizeReportText(row[REPORT_FIELD_MA_THUOC])
    || normalizeReportText(row[REPORT_FIELD_MA_NOI_BO])
    || "(không xác định)";

export const isMeaningfulReportRow = (row: Record<string, unknown>) =>
    REPORT_PRESENCE_FIELDS.some((field) => normalizeReportText(row[field]).length > 0);

export const isCategoryMarked = (value: unknown) => normalizeReportText(value).toLowerCase() === "x";
export const isSkipMarked = (value: unknown) => normalizeReportText(value).toLowerCase() === "x";

const isStrictNumericString = (value: string) => /^-?(?:\d+|\d+\.\d+|\d*\.\d+)$/.test(value);

export const parseStrictNumber = (value: unknown) => {
    if (typeof value === "number") {
        return {
            value: Number.isFinite(value) ? value : 0,
            valid: Number.isFinite(value),
            blank: false,
        };
    }

    const text = toCellString(value);
    if (!text) {
        return { value: 0, valid: true, blank: true };
    }

    if (!isStrictNumericString(text)) {
        return { value: 0, valid: false, blank: false };
    }

    const parsed = Number(text);
    return {
        value: Number.isFinite(parsed) ? parsed : 0,
        valid: Number.isFinite(parsed),
        blank: false,
    };
};

export const parseReportDateValue = (value: unknown) => {
    const normalized = toCellString(value);
    if (!normalized) {
        return {
            value: null,
            valid: true,
            blank: true,
        };
    }

    if (!/^\d{8}$/.test(normalized)) {
        return {
            value: normalized,
            valid: false,
            blank: false,
        };
    }

    const year = Number(normalized.slice(0, 4));
    const month = Number(normalized.slice(4, 6));
    const day = Number(normalized.slice(6, 8));
    const parsed = new Date(Date.UTC(year, month - 1, day));
    const valid = parsed.getUTCFullYear() === year
        && parsed.getUTCMonth() === month - 1
        && parsed.getUTCDate() === day;

    return {
        value: normalized,
        valid,
        blank: false,
    };
};

export const compareReportDates = (left: string, right: string) =>
    Number(left) - Number(right);

export const findDuplicateRowTokens = (rows: Array<Pick<ParsedReportRow, "rowToken">>) => {
    const counts = new Map<string, number>();

    for (const row of rows) {
        const token = normalizeReportText(row.rowToken);
        if (!token) continue;
        counts.set(token, (counts.get(token) || 0) + 1);
    }

    return new Set(
        Array.from(counts.entries())
            .filter(([, count]) => count > 1)
            .map(([token]) => token)
    );
};

/**
 * Parse a raw Excel row (from readExcel) into a typed row.
 * Returns null when the row is effectively blank for reporting purposes.
 */
export function parseRawRow(row: any): ParsedReportRow | null {
    if (!row || typeof row !== "object" || !isMeaningfulReportRow(row)) {
        return null;
    }

    const invalidNumericFields: string[] = [];
    const negativeNumericFields: string[] = [];
    const invalidDateFields: string[] = [];
    const invalidCategoricalFields: string[] = [];
    const invalidSkipFields: string[] = [];

    const tonDauResult = parseStrictNumber(row[REPORT_FIELD_TON_DAU]);
    const nhapResult = parseStrictNumber(row[REPORT_FIELD_NHAP]);
    const xuatResult = parseStrictNumber(row[REPORT_FIELD_XUAT]);
    const tonCuoiResult = parseStrictNumber(row[REPORT_FIELD_TON_CUOI]);
    const giaVatResult = parseStrictNumber(row[REPORT_FIELD_GIA_VAT]);
    const thanhTienResult = parseStrictNumber(row[REPORT_FIELD_THANH_TIEN_TON_CUOI]);

    const numericResults = [
        [REPORT_FIELD_TON_DAU, tonDauResult],
        [REPORT_FIELD_NHAP, nhapResult],
        [REPORT_FIELD_XUAT, xuatResult],
        [REPORT_FIELD_TON_CUOI, tonCuoiResult],
        [REPORT_FIELD_GIA_VAT, giaVatResult],
        [REPORT_FIELD_THANH_TIEN_TON_CUOI, thanhTienResult],
    ] as const;

    for (const [field, result] of numericResults) {
        if (!result.valid) {
            invalidNumericFields.push(field);
            continue;
        }

        if (!result.blank && result.value < 0) {
            negativeNumericFields.push(field);
        }
    }

    const ngayBatDauResult = parseReportDateValue(row[REPORT_FIELD_NGAY_BAT_DAU_HD]);
    const ngayKetThucResult = parseReportDateValue(row[REPORT_FIELD_NGAY_KET_THUC_HD]);
    if (!ngayBatDauResult.valid) invalidDateFields.push(REPORT_FIELD_NGAY_BAT_DAU_HD);
    if (!ngayKetThucResult.valid) invalidDateFields.push(REPORT_FIELD_NGAY_KET_THUC_HD);

    const bhyt = toCellString(row[REPORT_FIELD_BHYT]) || null;
    const dichVu = toCellString(row[REPORT_FIELD_DICH_VU]) || null;
    const boQua = toCellString(row[REPORT_FIELD_BO_QUA]) || null;
    const rawNhomTckt = toCellString(row[REPORT_FIELD_NHOM_TCKT]);
    const nhomTckt = normalizeNhomTckt(rawNhomTckt);
    if (bhyt && !isCategoryMarked(bhyt)) invalidCategoricalFields.push(REPORT_FIELD_BHYT);
    if (dichVu && !isCategoryMarked(dichVu)) invalidCategoricalFields.push(REPORT_FIELD_DICH_VU);
    if (boQua && !isSkipMarked(boQua)) invalidSkipFields.push(REPORT_FIELD_BO_QUA);

    return {
        maNoiBo: toCellString(row[REPORT_FIELD_MA_NOI_BO]) || undefined,
        maThuoc: toCellString(row[REPORT_FIELD_MA_THUOC]) || undefined,
        nhomTckt: nhomTckt || rawNhomTckt || null,
        rowToken: toCellString(row[REPORT_ROW_TOKEN_COLUMN]) || null,
        drugName: getReportDisplayName(row),
        tonDau: tonDauResult.value,
        nhap: nhapResult.value,
        xuat: xuatResult.value,
        tonCuoi: tonCuoiResult.value,
        giaVat: giaVatResult.value,
        thanhTienTonCuoi: thanhTienResult.value,
        ngayBatDauHd: ngayBatDauResult.value,
        ngayKetThucHd: ngayKetThucResult.value,
        bhyt,
        dichVu,
        boQua,
        invalidNumericFields,
        negativeNumericFields,
        invalidDateFields,
        invalidCategoricalFields,
        invalidSkipFields,
        invalidNhomTckt: Boolean(rawNhomTckt && !nhomTckt),
        missingNhomTckt: !rawNhomTckt,
    };
}

export function validateReportRow(
    row: ReportRowInput,
    prevTonCuoi?: number,
    options?: { includeTokenWarning?: boolean }
): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];
    const {
        drugName,
        tonDau,
        nhap,
        xuat,
        tonCuoi,
        giaVat,
        thanhTienTonCuoi,
        bhyt,
        dichVu,
        boQua,
        nhomTckt,
        rowToken,
        ngayBatDauHd,
        ngayKetThucHd,
        invalidNumericFields = [],
        negativeNumericFields = [],
        invalidDateFields = [],
        invalidCategoricalFields = [],
        invalidSkipFields = [],
        invalidNhomTckt = false,
        missingNhomTckt = false,
    } = row;
    const includeTokenWarning = options?.includeTokenWarning ?? true;

    if (includeTokenWarning && !normalizeReportText(rowToken)) {
        warnings.push({
            drug: drugName,
            field: REPORT_ROW_TOKEN_COLUMN,
            code: REPORT_VALIDATION_CODES.missingRowToken,
            message: `${drugName}: File thiếu mã định danh dòng. Vui lòng tải lại mẫu báo cáo mới.`,
        });
    }

    for (const field of invalidSkipFields) {
        warnings.push({
            drug: drugName,
            field,
            code: REPORT_VALIDATION_CODES.invalidSkipValue,
            message: `${drugName}: ${field} chỉ được nhập "X" hoặc để trống.`,
        });
    }

    if (missingNhomTckt) {
        warnings.push({
            drug: drugName,
            field: REPORT_FIELD_NHOM_TCKT,
            code: REPORT_VALIDATION_CODES.missingNhomTckt,
            message: `${drugName}: ${REPORT_FIELD_NHOM_TCKT} là bắt buộc. Vui lòng cập nhật nhóm tại danh mục thuốc nội bộ.`,
        });
    } else if (invalidNhomTckt || !isValidNhomTckt(nhomTckt)) {
        warnings.push({
            drug: drugName,
            field: REPORT_FIELD_NHOM_TCKT,
            code: REPORT_VALIDATION_CODES.invalidNhomTckt,
            message: `${drugName}: ${REPORT_FIELD_NHOM_TCKT} chỉ được chọn một trong: ${NHOM_TCKT_OPTIONS.join(", ")}.`,
        });
    }

    if (isSkipMarked(boQua)) {
        return warnings;
    }

    for (const field of invalidNumericFields) {
        warnings.push({
            drug: drugName,
            field,
            code: REPORT_VALIDATION_CODES.invalidNumber,
            message: `${drugName}: ${field} phải là số hợp lệ.`,
        });
    }

    for (const field of negativeNumericFields) {
        warnings.push({
            drug: drugName,
            field,
            code: REPORT_VALIDATION_CODES.negativeNumber,
            message: `${drugName}: ${field} không được âm.`,
        });
    }

    for (const field of invalidCategoricalFields) {
        warnings.push({
            drug: drugName,
            field,
            code: REPORT_VALIDATION_CODES.invalidCategoricalValue,
            message: `${drugName}: ${field} chỉ được nhập "X" hoặc để trống.`,
        });
    }

    const invalidCategoricalFieldSet = new Set(invalidCategoricalFields);

    if (
        invalidSkipFields.length === 0
        && !invalidCategoricalFieldSet.has(REPORT_FIELD_BHYT)
        && !invalidCategoricalFieldSet.has(REPORT_FIELD_DICH_VU)
        && !isCategoryMarked(bhyt)
        && !isCategoryMarked(dichVu)
    ) {
        warnings.push({
            drug: drugName,
            field: `${REPORT_FIELD_BHYT}/${REPORT_FIELD_DICH_VU}`,
            code: REPORT_VALIDATION_CODES.missingCategoryMark,
            message: `${drugName}: Nếu không đánh dấu ${REPORT_FIELD_BO_QUA}, phải nhập "X" ở ít nhất một trong hai cột BHYT hoặc Dịch vụ.`,
        });
    }

    for (const field of invalidDateFields) {
        warnings.push({
            drug: drugName,
            field,
            code: REPORT_VALIDATION_CODES.invalidDate,
            message: `${drugName}: ${field} phải theo định dạng YYYYMMDD và là ngày hợp lệ.`,
        });
    }

    const invalidNumericFieldSet = new Set(invalidNumericFields);
    const invalidDateFieldSet = new Set(invalidDateFields);

    if (
        prevTonCuoi !== undefined
        && !invalidNumericFieldSet.has(REPORT_FIELD_TON_DAU)
        && Math.abs(tonDau - prevTonCuoi) > REPORT_TOLERANCE
    ) {
        warnings.push({
            drug: drugName,
            field: REPORT_FIELD_TON_DAU,
            code: REPORT_VALIDATION_CODES.previousMonthStockMismatch,
            expected: prevTonCuoi,
            actual: tonDau,
            message: `${drugName}: Tồn đầu (${tonDau.toLocaleString("vi-VN")}) ≠ Tồn cuối tháng trước (${prevTonCuoi.toLocaleString("vi-VN")})`,
        });
    }

    const canValidateEndingStock = ![
        REPORT_FIELD_TON_DAU,
        REPORT_FIELD_NHAP,
        REPORT_FIELD_XUAT,
        REPORT_FIELD_TON_CUOI,
    ].some((field) => invalidNumericFieldSet.has(field));

    if (
        canValidateEndingStock
        && Math.abs(tonCuoi - (tonDau + nhap - xuat)) > REPORT_TOLERANCE
        && (tonDau !== 0 || nhap !== 0 || xuat !== 0)
    ) {
        const expectedTonCuoi = tonDau + nhap - xuat;
        warnings.push({
            drug: drugName,
            field: REPORT_FIELD_TON_CUOI,
            code: REPORT_VALIDATION_CODES.endingStockFormulaMismatch,
            expected: expectedTonCuoi,
            actual: tonCuoi,
            message: `${drugName}: Tồn cuối (${tonCuoi.toLocaleString("vi-VN")}) ≠ Tồn đầu (${tonDau}) + Nhập (${nhap}) − Xuất (${xuat}) = ${expectedTonCuoi.toLocaleString("vi-VN")}`,
        });
    }

    const canValidateEndingValue = ![
        REPORT_FIELD_TON_CUOI,
        REPORT_FIELD_GIA_VAT,
        REPORT_FIELD_THANH_TIEN_TON_CUOI,
    ].some((field) => invalidNumericFieldSet.has(field));

    if (
        canValidateEndingValue
        && Math.abs(thanhTienTonCuoi - (tonCuoi * giaVat)) > REPORT_TOLERANCE
        && thanhTienTonCuoi !== 0
    ) {
        const expectedThanhTien = tonCuoi * giaVat;
        warnings.push({
            drug: drugName,
            field: REPORT_FIELD_THANH_TIEN_TON_CUOI,
            code: REPORT_VALIDATION_CODES.endingValueFormulaMismatch,
            expected: expectedThanhTien,
            actual: thanhTienTonCuoi,
            message: `${drugName}: Thành tiền tồn cuối (${thanhTienTonCuoi.toLocaleString("vi-VN")}) ≠ Tồn cuối (${tonCuoi}) × Giá VAT (${giaVat.toLocaleString("vi-VN")}) = ${expectedThanhTien.toLocaleString("vi-VN")}`,
        });
    }

    if (
        !invalidDateFieldSet.has(REPORT_FIELD_NGAY_BAT_DAU_HD)
        && !invalidDateFieldSet.has(REPORT_FIELD_NGAY_KET_THUC_HD)
        && ngayBatDauHd
        && ngayKetThucHd
        && compareReportDates(ngayBatDauHd, ngayKetThucHd) > 0
    ) {
        warnings.push({
            drug: drugName,
            field: `${REPORT_FIELD_NGAY_BAT_DAU_HD}/${REPORT_FIELD_NGAY_KET_THUC_HD}`,
            code: REPORT_VALIDATION_CODES.dateRangeInvalid,
            message: `${drugName}: Ngày bắt đầu HĐ không được lớn hơn Ngày kết thúc HĐ.`,
        });
    }

    return warnings;
}
