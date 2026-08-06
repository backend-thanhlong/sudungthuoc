import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isRouteError, requireActiveSessionUser } from "@/lib/server-authz";
import { NHOM_TCKT_OPTIONS, normalizeNhomTckt } from "@/lib/report-validation";

const APPROVED_MAPPING_STATUSES = new Set(["APPROVED", "AUTO_MAPPED"]);

type ImportRow = {
    _rowIndex?: unknown;
    maNoiBo?: unknown;
    tenThuocNoiBo?: unknown;
    hoatChatNoiBo?: unknown;
    soDangKyNoiBo?: unknown;
    donViTinhNoiBo?: unknown;
    nhomTckt?: unknown;
};

type ImportError = {
    row: number;
    maNoiBo: string;
    message: string;
};

function cellText(value: unknown) {
    if (value === null || value === undefined) return "";
    return String(value).trim();
}

function compareText(value: unknown) {
    return cellText(value).replace(/\s+/g, " ");
}

function rowNumber(row: ImportRow, index: number) {
    const parsed = Number(row._rowIndex);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : index + 2;
}

function mismatchMessage(fieldName: string) {
    return `${fieldName} không khớp dữ liệu hệ thống`;
}

export async function POST(request: Request) {
    try {
        const sessionContext = await requireActiveSessionUser("FACILITY");
        const body = await request.json().catch(() => null) as { rows?: unknown } | null;
        const rows = Array.isArray(body?.rows) ? body.rows as ImportRow[] : null;

        if (!rows) {
            return NextResponse.json({ message: "Invalid data format" }, { status: 400 });
        }

        const errors: ImportError[] = [];
        const rowsByMaNoiBo = new Map<string, { row: ImportRow; rowNum: number }>();
        const seenMaNoiBo = new Set<string>();

        rows.forEach((row, index) => {
            const rowNum = rowNumber(row, index);
            const maNoiBo = cellText(row.maNoiBo);

            if (!maNoiBo) {
                errors.push({ row: rowNum, maNoiBo: "", message: "Thiếu mã nội bộ" });
                return;
            }

            if (seenMaNoiBo.has(maNoiBo)) {
                errors.push({
                    row: rowNum,
                    maNoiBo,
                    message: `Mã nội bộ "${maNoiBo}" bị trùng trong file Excel`,
                });
                return;
            }

            seenMaNoiBo.add(maNoiBo);
            rowsByMaNoiBo.set(maNoiBo, { row, rowNum });
        });

        const mappings = rowsByMaNoiBo.size > 0
            ? await prisma.facilityDrugMap.findMany({
                where: {
                    facilityId: sessionContext.user.id,
                    maNoiBo: { in: Array.from(rowsByMaNoiBo.keys()) },
                },
                select: {
                    id: true,
                    maNoiBo: true,
                    tenThuocNoiBo: true,
                    hoatChatNoiBo: true,
                    soDangKyNoiBo: true,
                    donViTinhNoiBo: true,
                    nhomTckt: true,
                    status: true,
                },
            })
            : [];
        const mappingByMaNoiBo = new Map(mappings.map((mapping) => [mapping.maNoiBo, mapping]));
        const updates: { id: string; nhomTckt: string | null }[] = [];
        let unchanged = 0;

        for (const [maNoiBo, { row, rowNum }] of rowsByMaNoiBo.entries()) {
            const mapping = mappingByMaNoiBo.get(maNoiBo);

            if (!mapping) {
                errors.push({ row: rowNum, maNoiBo, message: "Mã nội bộ không tồn tại trong hệ thống" });
                continue;
            }

            if (!APPROVED_MAPPING_STATUSES.has(mapping.status)) {
                errors.push({
                    row: rowNum,
                    maNoiBo,
                    message: "Chỉ được cập nhật Nhóm TCKT cho thuốc đã duyệt hoặc tự động ánh xạ",
                });
                continue;
            }

            const fieldMismatches = [
                {
                    name: "Tên thuốc nội bộ",
                    excelValue: row.tenThuocNoiBo,
                    systemValue: mapping.tenThuocNoiBo,
                },
                {
                    name: "Hoạt chất nội bộ",
                    excelValue: row.hoatChatNoiBo,
                    systemValue: mapping.hoatChatNoiBo,
                },
                {
                    name: "SĐK nội bộ",
                    excelValue: row.soDangKyNoiBo,
                    systemValue: mapping.soDangKyNoiBo,
                },
                {
                    name: "ĐVT nội bộ",
                    excelValue: row.donViTinhNoiBo,
                    systemValue: mapping.donViTinhNoiBo,
                },
            ].filter((field) => compareText(field.excelValue) !== compareText(field.systemValue));

            if (fieldMismatches.length > 0) {
                errors.push({
                    row: rowNum,
                    maNoiBo,
                    message: fieldMismatches.map((field) => mismatchMessage(field.name)).join("; "),
                });
                continue;
            }

            const rawNhomTckt = cellText(row.nhomTckt);
            const nhomTckt = normalizeNhomTckt(rawNhomTckt);
            if (rawNhomTckt && !nhomTckt) {
                errors.push({
                    row: rowNum,
                    maNoiBo,
                    message: `Nhóm TCKT không hợp lệ. Nếu có nhập, chỉ được chọn: ${NHOM_TCKT_OPTIONS.join(", ")}`,
                });
                continue;
            }

            if (mapping.nhomTckt === nhomTckt) {
                unchanged += 1;
                continue;
            }

            updates.push({ id: mapping.id, nhomTckt });
        }

        if (updates.length > 0) {
            await prisma.$transaction(
                updates.map((update) =>
                    prisma.facilityDrugMap.update({
                        where: { id: update.id },
                        data: { nhomTckt: update.nhomTckt },
                    })
                )
            );
        }

        return NextResponse.json({
            total: rows.length,
            updated: updates.length,
            unchanged,
            errors,
        });
    } catch (error) {
        if (isRouteError(error)) {
            return NextResponse.json({ message: error.message }, { status: error.status });
        }

        console.error("Error importing mapping Nhóm TCKT:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
