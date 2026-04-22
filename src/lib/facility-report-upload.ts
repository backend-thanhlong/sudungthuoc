import prisma from "@/lib/prisma";
import { verifyFacilityReportRowToken } from "@/lib/facility-report-token";
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
    REPORT_VALIDATION_CODES,
    ReportValidationCode,
    ParsedReportRow,
    ValidationWarning,
    isCategoryMarked,
    isSkipMarked,
    normalizeReportText,
    parseRawRow,
    validateReportRow,
} from "@/lib/report-validation";

export interface FacilityReportValidationError {
    rowNumber: number;
    field: string;
    code: ReportValidationCode;
    message: string;
}

export interface FacilityReportValidationSummary {
    totalRows: number;
    errorCount: number;
    reportedRowCount: number;
    skippedRowCount: number;
}

export interface ValidatedFacilityReportRow {
    mapId: string;
    tonDau: number;
    nhap: number;
    xuat: number;
    tonCuoi: number;
    giaVat: number;
    thanhTienTonCuoi: number;
    soQdTrungThau: string | null;
    tenCongTy: string | null;
    ngayBatDauHd: string | null;
    ngayKetThucHd: string | null;
    bhyt: string | null;
    dichVu: string | null;
}

export interface FacilityReportValidationResult {
    ok: boolean;
    summary: FacilityReportValidationSummary;
    errors: FacilityReportValidationError[];
    rows: ValidatedFacilityReportRow[];
}

export interface CanonicalFacilityReportRow {
    mapId: string;
    maNoiBo: string;
    maThuoc: string;
    tenThuoc: string;
    hoatChat: string;
    donViTinh: string;
    prevTonCuoi?: number;
    prevGiaVat: number;
    prevSoQdTrungThau: string;
    prevTenCongTy: string;
    prevNgayBatDauHd: string;
    prevNgayKetThucHd: string;
    prevBhyt: string;
    prevDichVu: string;
}

export interface FacilityReportCanonicalContext {
    facilityId: string;
    reportMonth: string;
    previousMonth: string;
    rows: CanonicalFacilityReportRow[];
    rowsByMapId: Map<string, CanonicalFacilityReportRow>;
}

const ALLOWED_MAPPING_STATUSES = ["APPROVED", "AUTO_MAPPED"] as const;

const getPreviousMonth = (month: string) => {
    const [currentMonth, currentYear] = month.split("/").map(Number);
    const prevDate = new Date(currentYear, currentMonth - 2, 1);
    return `${String(prevDate.getMonth() + 1).padStart(2, "0")}/${prevDate.getFullYear()}`;
};

const buildCanonicalRow = (
    mapping: any,
    previousReport?: any
): CanonicalFacilityReportRow => ({
    mapId: mapping.id,
    maNoiBo: mapping.maNoiBo || "",
    maThuoc: mapping.masterDrug?.maChung || mapping.maNoiBo || "",
    tenThuoc: mapping.masterDrug?.tenThuoc || mapping.tenThuocNoiBo || "",
    hoatChat: mapping.masterDrug?.hoatChat || mapping.hoatChatNoiBo || "",
    donViTinh: mapping.masterDrug?.donViTinh || mapping.donViTinhNoiBo || "",
    prevTonCuoi: previousReport ? Number(previousReport.tonCuoi) : undefined,
    prevGiaVat: previousReport ? Number(previousReport.giaVat) : 0,
    prevSoQdTrungThau: previousReport?.soQdTrungThau || "",
    prevTenCongTy: previousReport?.tenCongTy || "",
    prevNgayBatDauHd: previousReport?.ngayBatDauHd || "",
    prevNgayKetThucHd: previousReport?.ngayKetThucHd || "",
    prevBhyt: previousReport?.bhyt || "",
    prevDichVu: previousReport?.dichVu || "",
});

const buildValidationError = (
    rowNumber: number,
    field: string,
    code: ReportValidationCode,
    message: string
): FacilityReportValidationError => ({
    rowNumber,
    field,
    code,
    message,
});

const warningToValidationError = (rowNumber: number, warning: ValidationWarning): FacilityReportValidationError => ({
    rowNumber,
    field: warning.field || "",
    code: warning.code || REPORT_VALIDATION_CODES.invalidNumber,
    message: warning.message,
});

const normalizeOptionalText = (value: unknown) => {
    const normalized = normalizeReportText(value);
    return normalized || null;
};

const normalizeOptionalCategory = (value: unknown) => {
    if (!normalizeReportText(value)) return null;
    return isCategoryMarked(value) ? "X" : normalizeReportText(value);
};

const compareImmutableFields = (
    rawRow: any,
    canonicalRow: CanonicalFacilityReportRow,
    rowNumber: number
) => {
    const fieldChecks = [
        [REPORT_FIELD_MA_NOI_BO, canonicalRow.maNoiBo],
        [REPORT_FIELD_MA_THUOC, canonicalRow.maThuoc],
        [REPORT_FIELD_TEN_THUOC, canonicalRow.tenThuoc],
        [REPORT_FIELD_HOAT_CHAT, canonicalRow.hoatChat],
        [REPORT_FIELD_DON_VI_TINH, canonicalRow.donViTinh],
    ] as const;

    return fieldChecks
        .filter(([field, expectedValue]) => normalizeReportText(rawRow[field]) !== normalizeReportText(expectedValue))
        .map(([field]) => buildValidationError(
            rowNumber,
            field,
            REPORT_VALIDATION_CODES.immutableFieldMismatch,
            `Dòng ${rowNumber}: ${field} không khớp với dữ liệu mẫu.`
        ));
};

const comparePreviousMonthReferenceFields = (
    rawRow: any,
    parsedRow: ParsedReportRow,
    canonicalRow: CanonicalFacilityReportRow,
    rowNumber: number
) => {
    const invalidDateFieldSet = new Set(parsedRow.invalidDateFields || []);
    const invalidCategoricalFieldSet = new Set(parsedRow.invalidCategoricalFields || []);

    const fieldChecks = [
        {
            field: REPORT_FIELD_SO_QD_TRUNG_THAU,
            previousValue: normalizeOptionalText(canonicalRow.prevSoQdTrungThau),
            currentValue: normalizeOptionalText(rawRow[REPORT_FIELD_SO_QD_TRUNG_THAU]),
            canCompare: true,
        },
        {
            field: REPORT_FIELD_TEN_CONG_TY,
            previousValue: normalizeOptionalText(canonicalRow.prevTenCongTy),
            currentValue: normalizeOptionalText(rawRow[REPORT_FIELD_TEN_CONG_TY]),
            canCompare: true,
        },
        {
            field: REPORT_FIELD_NGAY_BAT_DAU_HD,
            previousValue: normalizeOptionalText(canonicalRow.prevNgayBatDauHd),
            currentValue: normalizeOptionalText(parsedRow.ngayBatDauHd),
            canCompare: !invalidDateFieldSet.has(REPORT_FIELD_NGAY_BAT_DAU_HD),
        },
        {
            field: REPORT_FIELD_NGAY_KET_THUC_HD,
            previousValue: normalizeOptionalText(canonicalRow.prevNgayKetThucHd),
            currentValue: normalizeOptionalText(parsedRow.ngayKetThucHd),
            canCompare: !invalidDateFieldSet.has(REPORT_FIELD_NGAY_KET_THUC_HD),
        },
        {
            field: REPORT_FIELD_BHYT,
            previousValue: normalizeOptionalCategory(canonicalRow.prevBhyt),
            currentValue: normalizeOptionalCategory(parsedRow.bhyt),
            canCompare: !invalidCategoricalFieldSet.has(REPORT_FIELD_BHYT),
        },
        {
            field: REPORT_FIELD_DICH_VU,
            previousValue: normalizeOptionalCategory(canonicalRow.prevDichVu),
            currentValue: normalizeOptionalCategory(parsedRow.dichVu),
            canCompare: !invalidCategoricalFieldSet.has(REPORT_FIELD_DICH_VU),
        },
    ] as const;

    return fieldChecks
        .filter(({ canCompare, previousValue, currentValue }) =>
            canCompare
            && previousValue !== null
            && previousValue !== currentValue
        )
        .map(({ field }) => buildValidationError(
            rowNumber,
            field,
            REPORT_VALIDATION_CODES.previousMonthReferenceMismatch,
            `Dòng ${rowNumber}: ${field} không khớp với báo cáo tháng trước.`
        ));
};

export const loadFacilityReportCanonicalContext = async (
    facilityId: string,
    reportMonth: string
): Promise<FacilityReportCanonicalContext> => {
    const previousMonth = getPreviousMonth(reportMonth);

    const [mappings, previousReports] = await Promise.all([
        prisma.facilityDrugMap.findMany({
            where: {
                facilityId,
                status: { in: [...ALLOWED_MAPPING_STATUSES] },
            },
            include: { masterDrug: true },
            orderBy: { tenThuocNoiBo: "asc" },
        }),
        prisma.inventoryReport.findMany({
            where: {
                facilityId,
                reportMonth: previousMonth,
            },
            select: {
                mapId: true,
                tonCuoi: true,
                giaVat: true,
                soQdTrungThau: true,
                tenCongTy: true,
                ngayBatDauHd: true,
                ngayKetThucHd: true,
                bhyt: true,
                dichVu: true,
            },
        }),
    ]);

    const previousReportMap = new Map(previousReports.map((report) => [report.mapId, report]));
    const rows = mappings.map((mapping) => buildCanonicalRow(mapping, previousReportMap.get(mapping.id)));

    return {
        facilityId,
        reportMonth,
        previousMonth,
        rows,
        rowsByMapId: new Map(rows.map((row) => [row.mapId, row])),
    };
};

export const buildFacilityReportTemplateRows = (context: FacilityReportCanonicalContext) =>
    context.rows.map((row, index) => ({
        [REPORT_FIELD_STT]: index + 1,
        [REPORT_FIELD_MA_NOI_BO]: row.maNoiBo,
        [REPORT_FIELD_MA_THUOC]: row.maThuoc,
        [REPORT_FIELD_TEN_THUOC]: row.tenThuoc,
        [REPORT_FIELD_HOAT_CHAT]: row.hoatChat,
        [REPORT_FIELD_DON_VI_TINH]: row.donViTinh,
        [REPORT_FIELD_TON_DAU]: row.prevTonCuoi ?? 0,
        [REPORT_FIELD_NHAP]: 0,
        [REPORT_FIELD_XUAT]: 0,
        [REPORT_FIELD_TON_CUOI]: 0,
        [REPORT_FIELD_GIA_VAT]: row.prevGiaVat,
        [REPORT_FIELD_THANH_TIEN_TON_CUOI]: 0,
        [REPORT_FIELD_SO_QD_TRUNG_THAU]: row.prevSoQdTrungThau,
        [REPORT_FIELD_TEN_CONG_TY]: row.prevTenCongTy,
        [REPORT_FIELD_NGAY_BAT_DAU_HD]: row.prevNgayBatDauHd,
        [REPORT_FIELD_NGAY_KET_THUC_HD]: row.prevNgayKetThucHd,
        [REPORT_FIELD_BHYT]: row.prevBhyt,
        [REPORT_FIELD_DICH_VU]: row.prevDichVu,
        [REPORT_FIELD_BO_QUA]: "",
        [REPORT_FIELD_GHI_CHU]: "",
        [REPORT_ROW_TOKEN_COLUMN]: "",
    }));

export const validateFacilityReportRows = (
    rawRows: any[],
    context: FacilityReportCanonicalContext
): FacilityReportValidationResult => {
    const errors: FacilityReportValidationError[] = [];
    const rows: ValidatedFacilityReportRow[] = [];
    const seenTokens = new Map<string, number>();
    const seenMapIds = new Map<string, number>();
    let totalRows = 0;
    let reportedRowCount = 0;
    let skippedRowCount = 0;

    rawRows.forEach((rawRow, index) => {
        const parsedRow = parseRawRow(rawRow) as ParsedReportRow | null;
        if (!parsedRow) return;

        totalRows += 1;
        const rowNumber = index + 2;
        const rowErrors: FacilityReportValidationError[] = [];
        const rowToken = normalizeReportText(parsedRow.rowToken);
        let canonicalRow: CanonicalFacilityReportRow | undefined;
        let resolvedMapId: string | null = null;

        if (!rowToken) {
            rowErrors.push(buildValidationError(
                rowNumber,
                REPORT_ROW_TOKEN_COLUMN,
                REPORT_VALIDATION_CODES.missingRowToken,
                `Dòng ${rowNumber}: File thiếu mã định danh dòng. Vui lòng tải lại mẫu báo cáo mới.`
            ));
        } else {
            if (seenTokens.has(rowToken)) {
                rowErrors.push(buildValidationError(
                    rowNumber,
                    REPORT_ROW_TOKEN_COLUMN,
                    REPORT_VALIDATION_CODES.duplicateRowToken,
                    `Dòng ${rowNumber}: Mã định danh dòng bị trùng trong file.`
                ));
            } else {
                seenTokens.set(rowToken, rowNumber);
            }

            try {
                const tokenPayload = verifyFacilityReportRowToken(rowToken);

                if (tokenPayload.facilityId !== context.facilityId) {
                    rowErrors.push(buildValidationError(
                        rowNumber,
                        REPORT_ROW_TOKEN_COLUMN,
                        REPORT_VALIDATION_CODES.rowTokenFacilityMismatch,
                        `Dòng ${rowNumber}: Mã định danh dòng không thuộc cơ sở hiện tại.`
                    ));
                }

                if (tokenPayload.reportMonth !== context.reportMonth) {
                    rowErrors.push(buildValidationError(
                        rowNumber,
                        REPORT_ROW_TOKEN_COLUMN,
                        REPORT_VALIDATION_CODES.rowTokenMonthMismatch,
                        `Dòng ${rowNumber}: Mã định danh dòng không thuộc tháng báo cáo ${context.reportMonth}.`
                    ));
                }

                resolvedMapId = tokenPayload.mapId;
                if (seenMapIds.has(resolvedMapId)) {
                    rowErrors.push(buildValidationError(
                        rowNumber,
                        REPORT_ROW_TOKEN_COLUMN,
                        REPORT_VALIDATION_CODES.duplicateMapId,
                        `Dòng ${rowNumber}: Thuốc này đã xuất hiện nhiều hơn một lần trong file.`
                    ));
                } else {
                    seenMapIds.set(resolvedMapId, rowNumber);
                }

                canonicalRow = context.rowsByMapId.get(resolvedMapId);
                if (!canonicalRow) {
                    rowErrors.push(buildValidationError(
                        rowNumber,
                        REPORT_ROW_TOKEN_COLUMN,
                        REPORT_VALIDATION_CODES.rowTokenTargetNotFound,
                        `Dòng ${rowNumber}: Mã định danh dòng không còn hợp lệ. Vui lòng tải lại mẫu báo cáo mới.`
                    ));
                }
            } catch {
                rowErrors.push(buildValidationError(
                    rowNumber,
                    REPORT_ROW_TOKEN_COLUMN,
                    REPORT_VALIDATION_CODES.invalidRowToken,
                    `Dòng ${rowNumber}: Mã định danh dòng không hợp lệ. Vui lòng tải lại mẫu báo cáo mới.`
                ));
            }
        }

        if (canonicalRow) {
            rowErrors.push(...compareImmutableFields(rawRow, canonicalRow, rowNumber));
        }

        rowErrors.push(...validateReportRow(parsedRow, canonicalRow?.prevTonCuoi, {
            includeTokenWarning: false,
        }).map((warning) => warningToValidationError(rowNumber, warning)));

        if (canonicalRow && !isSkipMarked(parsedRow.boQua)) {
            rowErrors.push(...comparePreviousMonthReferenceFields(rawRow, parsedRow, canonicalRow, rowNumber));
        }

        if (rowErrors.length > 0 || !resolvedMapId) {
            errors.push(...rowErrors);
            return;
        }

        if (isSkipMarked(parsedRow.boQua)) {
            skippedRowCount += 1;
            return;
        }

        reportedRowCount += 1;

        rows.push({
            mapId: resolvedMapId,
            tonDau: parsedRow.tonDau,
            nhap: parsedRow.nhap,
            xuat: parsedRow.xuat,
            tonCuoi: parsedRow.tonCuoi,
            giaVat: parsedRow.giaVat,
            thanhTienTonCuoi: parsedRow.thanhTienTonCuoi,
            soQdTrungThau: normalizeOptionalText(rawRow[REPORT_FIELD_SO_QD_TRUNG_THAU]),
            tenCongTy: normalizeOptionalText(rawRow[REPORT_FIELD_TEN_CONG_TY]),
            ngayBatDauHd: normalizeOptionalText(parsedRow.ngayBatDauHd),
            ngayKetThucHd: normalizeOptionalText(parsedRow.ngayKetThucHd),
            bhyt: normalizeOptionalCategory(parsedRow.bhyt),
            dichVu: normalizeOptionalCategory(parsedRow.dichVu),
        });
    });

    errors.sort((left, right) => {
        if (left.rowNumber !== right.rowNumber) {
            return left.rowNumber - right.rowNumber;
        }
        return left.field.localeCompare(right.field);
    });

    return {
        ok: errors.length === 0,
        summary: {
            totalRows,
            errorCount: errors.length,
            reportedRowCount,
            skippedRowCount,
        },
        errors,
        rows,
    };
};

export const buildFacilityReportValidationResponse = (result: FacilityReportValidationResult) => {
    const tokenErrorCodes: ReportValidationCode[] = [
        REPORT_VALIDATION_CODES.missingRowToken,
        REPORT_VALIDATION_CODES.invalidRowToken,
        REPORT_VALIDATION_CODES.rowTokenFacilityMismatch,
        REPORT_VALIDATION_CODES.rowTokenMonthMismatch,
        REPORT_VALIDATION_CODES.rowTokenTargetNotFound,
    ];
    const hasTokenErrors = result.errors.some((error) => tokenErrorCodes.includes(error.code));

    return {
        message: hasTokenErrors
            ? "File mẫu không hợp lệ hoặc đã cũ. Vui lòng tải lại mẫu báo cáo mới cho đúng tháng rồi điền lại dữ liệu."
            : "Báo cáo không hợp lệ",
        summary: result.summary,
        errors: result.errors,
    };
};
