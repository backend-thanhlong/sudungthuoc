/**
 * Shared report validation logic (used by both client preview and server POST handler).
 * Each function is pure and has no server-side dependencies.
 */

export interface ReportRowInput {
    drugName: string;
    tonDau: number;
    nhap: number;
    xuat: number;
    tonCuoi: number;
    giaVat: number;
    thanhTienTonCuoi: number;
    bhyt?: string | null;
    dichVu?: string | null;
}

export interface ValidationWarning {
    drug: string;
    message: string;
    expected?: number;
    actual?: number;
}

const TOLERANCE = 0.01;

/**
 * Validate a single report row.
 * @param row          The parsed row data
 * @param prevTonCuoi  Tồn cuối of the PREVIOUS month for the same drug (optional)
 * @returns Array of warnings; empty array means the row is valid.
 */
export function validateReportRow(
    row: ReportRowInput,
    prevTonCuoi?: number
): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];
    const { drugName, tonDau, nhap, xuat, tonCuoi, giaVat, thanhTienTonCuoi, bhyt, dichVu } = row;

    // Rule 1: Tồn đầu === Tồn cuối tháng trước (nếu có)
    if (prevTonCuoi !== undefined && Math.abs(tonDau - prevTonCuoi) > TOLERANCE) {
        warnings.push({
            drug: drugName,
            expected: prevTonCuoi,
            actual: tonDau,
            message: `${drugName}: Tồn đầu (${tonDau.toLocaleString("vi-VN")}) ≠ Tồn cuối tháng trước (${prevTonCuoi.toLocaleString("vi-VN")})`,
        });
    }

    // Rule 2: Tồn cuối === Tồn đầu + Nhập − Xuất
    const expectedTonCuoi = tonDau + nhap - xuat;
    if (
        Math.abs(tonCuoi - expectedTonCuoi) > TOLERANCE &&
        (tonDau !== 0 || nhap !== 0 || xuat !== 0)
    ) {
        warnings.push({
            drug: drugName,
            expected: expectedTonCuoi,
            actual: tonCuoi,
            message: `${drugName}: Tồn cuối (${tonCuoi.toLocaleString("vi-VN")}) ≠ Tồn đầu (${tonDau}) + Nhập (${nhap}) − Xuất (${xuat}) = ${expectedTonCuoi.toLocaleString("vi-VN")}`,
        });
    }

    // Rule 3: Thành tiền tồn cuối === Tồn cuối × Giá VAT
    const expectedThanhTien = tonCuoi * giaVat;
    if (Math.abs(thanhTienTonCuoi - expectedThanhTien) > TOLERANCE && thanhTienTonCuoi !== 0) {
        warnings.push({
            drug: drugName,
            expected: expectedThanhTien,
            actual: thanhTienTonCuoi,
            message: `${drugName}: Thành tiền tồn cuối (${thanhTienTonCuoi.toLocaleString("vi-VN")}) ≠ Tồn cuối (${tonCuoi}) × Giá VAT (${giaVat.toLocaleString("vi-VN")}) = ${expectedThanhTien.toLocaleString("vi-VN")}`,
        });
    }

    // Rule 4: Phải có ít nhất 1 trong 2 cột BHYT hoặc Dịch vụ
    const hasBhyt = bhyt && String(bhyt).trim().toLowerCase() === "x";
    const hasDichVu = dichVu && String(dichVu).trim().toLowerCase() === "x";
    if (!hasBhyt && !hasDichVu) {
        warnings.push({
            drug: drugName,
            message: `${drugName}: Phải đánh dấu X ít nhất một trong hai cột BHYT hoặc Dịch vụ`,
        });
    }

    return warnings;
}

/**
 * Parse a raw Excel row (from readExcel) into a typed ReportRowInput.
 * Returns null if the row cannot be identified (no drug name/code).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseRawRow(row: any): (ReportRowInput & { maNoiBo?: string; maThuoc?: string }) | null {
    const safeFloat = (val: unknown): number => {
        const parsed = parseFloat(String(val));
        return isNaN(parsed) ? 0 : parsed;
    };

    const drugName = row["Tên thuốc"] || row["Mã thuốc"] || row["Mã nội bộ"] || "";
    if (!drugName) return null;

    return {
        maNoiBo: row["Mã nội bộ"] ? String(row["Mã nội bộ"]) : undefined,
        maThuoc: row["Mã thuốc"] ? String(row["Mã thuốc"]) : undefined,
        drugName: String(drugName),
        tonDau: safeFloat(row["Tồn đầu"]),
        nhap: safeFloat(row["Nhập trong kỳ"]),
        xuat: safeFloat(row["Xuất trong kỳ"]),
        tonCuoi: safeFloat(row["Tồn cuối"]),
        giaVat: safeFloat(row["Giá VAT"]),
        thanhTienTonCuoi: safeFloat(row["Thành tiền tồn cuối"]),
        bhyt: row["BHYT"] ? String(row["BHYT"]) : null,
        dichVu: row["Dịch vụ"] ? String(row["Dịch vụ"]) : null,
    };
}
