import prisma from "@/lib/prisma";
import { verifyFacilityReportRowToken } from "@/lib/facility-report-token";
import { isFacilityDrugMapActiveForReportMonth } from "@/lib/facility-drug-map-lifecycle";
import { getPreviousReportMonth } from "@/lib/report-month";
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
    REPORT_FIELD_NHAP,
    REPORT_FIELD_NHAP_HOAN_TRA,
    REPORT_FIELD_STT,
    REPORT_FIELD_TEN_THUOC,
    REPORT_FIELD_THANH_TIEN_TON_CUOI,
    REPORT_FIELD_TON_CUOI,
    REPORT_FIELD_TON_DAU,
    REPORT_TOLERANCE,
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
    nhapHoanTra: number;
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
    nhomTckt: string;
    prevTonCuoi?: number;
    mapGiaVat: number;
    prevSoQdTrungThau: string;
    prevTenCongTy: string;
    prevNgayBatDauHd: string;
    prevNgayKetThucHd: string;
    mapBhyt: string;
    mapDichVu: string;
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
    const previousMonth = getPreviousReportMonth(month);
    if (!previousMonth) {
        throw new Error("Invalid report month");
    }
    return previousMonth;
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
    nhomTckt: mapping.nhomTckt || "",
    prevTonCuoi: previousReport ? Number(previousReport.tonCuoi) : undefined,
    mapGiaVat: Number(mapping.giaVat || 0),
    prevSoQdTrungThau: mapping.soQdTrungThau || "",
    prevTenCongTy: mapping.tenCongTy || "",
    prevNgayBatDauHd: mapping.ngayBatDauHd || "",
    prevNgayKetThucHd: mapping.ngayKetThucHd || "",
    mapBhyt: mapping.bhyt || "",
    mapDichVu: mapping.dichVu || "",
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
        [REPORT_FIELD_NHOM_TCKT, canonicalRow.nhomTckt],
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

const compareMappingReferenceFields = (
    _rawRow: any,
    parsedRow: ParsedReportRow,
    canonicalRow: CanonicalFacilityReportRow,
    rowNumber: number
) => {
    const invalidNumericFieldSet = new Set(parsedRow.invalidNumericFields || []);
    const invalidCategoricalFieldSet = new Set(parsedRow.invalidCategoricalFields || []);

    const errors: FacilityReportValidationError[] = [];

    if (
        !invalidNumericFieldSet.has(REPORT_FIELD_GIA_VAT)
        && Math.abs(parsedRow.giaVat - canonicalRow.mapGiaVat) > REPORT_TOLERANCE
    ) {
        errors.push(buildValidationError(
            rowNumber,
            REPORT_FIELD_GIA_VAT,
            REPORT_VALIDATION_CODES.mappingReferenceMismatch,
            `Dòng ${rowNumber}: ${REPORT_FIELD_GIA_VAT} không khớp với Danh mục Ánh xạ.`
        ));
    }

    const fieldChecks = [
        [REPORT_FIELD_BHYT, normalizeOptionalCategory(canonicalRow.mapBhyt), normalizeOptionalCategory(parsedRow.bhyt)],
        [REPORT_FIELD_DICH_VU, normalizeOptionalCategory(canonicalRow.mapDichVu), normalizeOptionalCategory(parsedRow.dichVu)],
    ] as const;

    fieldChecks
        .filter(([field, expectedValue, currentValue]) =>
            !invalidCategoricalFieldSet.has(field)
            && expectedValue !== currentValue
        )
        .forEach(([field]) => errors.push(buildValidationError(
            rowNumber,
            field,
            REPORT_VALIDATION_CODES.mappingReferenceMismatch,
            `Dòng ${rowNumber}: ${field} không khớp với Danh mục Ánh xạ.`
        )));

    return errors;
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
            },
        }),
    ]);

    const activeMappings = mappings.filter((mapping) =>
        isFacilityDrugMapActiveForReportMonth(mapping, reportMonth)
    );
    const previousReportMap = new Map(previousReports.map((report) => [report.mapId, report]));
    const rows = activeMappings.map((mapping) => buildCanonicalRow(mapping, previousReportMap.get(mapping.id)));

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
        [REPORT_FIELD_NHOM_TCKT]: row.nhomTckt,
        [REPORT_FIELD_TON_DAU]: row.prevTonCuoi ?? 0,
        [REPORT_FIELD_NHAP]: 0,
        [REPORT_FIELD_NHAP_HOAN_TRA]: 0,
        [REPORT_FIELD_XUAT]: 0,
        [REPORT_FIELD_TON_CUOI]: 0,
        [REPORT_FIELD_GIA_VAT]: row.mapGiaVat,
        [REPORT_FIELD_THANH_TIEN_TON_CUOI]: 0,
        [REPORT_FIELD_BHYT]: row.mapBhyt,
        [REPORT_FIELD_DICH_VU]: row.mapDichVu,
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

        const rowForValidation = canonicalRow
            ? {
                ...parsedRow,
                giaVat: canonicalRow.mapGiaVat,
                bhyt: canonicalRow.mapBhyt,
                dichVu: canonicalRow.mapDichVu,
            }
            : parsedRow;

        rowErrors.push(...validateReportRow(rowForValidation, canonicalRow?.prevTonCuoi, {
            includeTokenWarning: false,
        }).map((warning) => warningToValidationError(rowNumber, warning)));

        if (canonicalRow) {
            rowErrors.push(...compareMappingReferenceFields(rawRow, parsedRow, canonicalRow, rowNumber));
        }

        if (rowErrors.length > 0 || !resolvedMapId) {
            errors.push(...rowErrors);
            return;
        }

        if (!canonicalRow) {
            errors.push(buildValidationError(
                rowNumber,
                REPORT_ROW_TOKEN_COLUMN,
                REPORT_VALIDATION_CODES.rowTokenTargetNotFound,
                `Dòng ${rowNumber}: Mã định danh dòng không còn hợp lệ. Vui lòng tải lại mẫu báo cáo mới.`
            ));
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
            nhapHoanTra: parsedRow.nhapHoanTra,
            xuat: parsedRow.xuat,
            tonCuoi: parsedRow.tonCuoi,
            giaVat: canonicalRow.mapGiaVat,
            thanhTienTonCuoi: parsedRow.thanhTienTonCuoi,
            soQdTrungThau: normalizeOptionalText(canonicalRow?.prevSoQdTrungThau),
            tenCongTy: normalizeOptionalText(canonicalRow?.prevTenCongTy),
            ngayBatDauHd: normalizeOptionalText(canonicalRow?.prevNgayBatDauHd),
            ngayKetThucHd: normalizeOptionalText(canonicalRow?.prevNgayKetThucHd),
            bhyt: normalizeOptionalCategory(canonicalRow.mapBhyt),
            dichVu: normalizeOptionalCategory(canonicalRow.mapDichVu),
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
