import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import {
    findOrCreateTherapeuticGroup,
    normalizeTherapeuticGroupName,
} from "@/lib/therapeutic-groups";
import {
    isValidSpecialControlValue,
    normalizeSpecialControlValue,
} from "@/lib/master-drugs/special-control";

function parseImportedBooleanFlag(value: unknown) {
    if (typeof value === "boolean") {
        return value;
    }

    if (typeof value === "number") {
        return value === 1;
    }

    if (typeof value !== "string") {
        return false;
    }

    const normalizedValue = value.trim().toLowerCase();
    return ["1", "true", "yes", "y", "có", "co", "x"].includes(normalizedValue);
}

export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { drugs } = body;

        if (!drugs || !Array.isArray(drugs)) {
            return NextResponse.json({ message: "Invalid data format" }, { status: 400 });
        }

        let successCount = 0;
        let errorCount = 0;
        let skippedCount = 0;
        let createdTherapeuticGroupCount = 0;
        const errors: string[] = [];
        const therapeuticGroupCache = new Map<string, string | null>();

        for (const [index, drug] of drugs.entries()) {
            const rowNumber = index + 2;
            if (!drug.maChung || !drug.tenThuoc) {
                errorCount++;
                errors.push(`Dòng ${rowNumber}: thiếu Mã chung hoặc Tên thuốc`);
                continue;
            }

            try {
                if (!isValidSpecialControlValue(drug.kiemSoatDacBiet)) {
                    errorCount++;
                    errors.push(`Dòng ${rowNumber}: Thuốc kiểm soát đặc biệt không thuộc danh mục hợp lệ`);
                    continue;
                }

                const normalizedSpecialControl = normalizeSpecialControlValue(drug.kiemSoatDacBiet);

                // Check if drug already exists
                const existingDrug = await prisma.masterDrug.findFirst({
                    where: { maChung: String(drug.maChung) },
                });

                if (existingDrug) {
                    skippedCount++;
                    continue;
                }

                let therapeuticGroupId: string | null = null;
                const therapeuticGroupName = typeof drug.therapeuticGroupName === "string"
                    ? drug.therapeuticGroupName
                    : typeof drug.nhomDieuTri === "string"
                        ? drug.nhomDieuTri
                        : "";

                if (therapeuticGroupName.trim()) {
                    const normalizedName = normalizeTherapeuticGroupName(therapeuticGroupName);
                    therapeuticGroupId = therapeuticGroupCache.get(normalizedName) ?? null;

                    if (!therapeuticGroupId) {
                        const therapeuticGroupResult = await findOrCreateTherapeuticGroup(therapeuticGroupName);
                        therapeuticGroupId = therapeuticGroupResult.group.id;
                        therapeuticGroupCache.set(normalizedName, therapeuticGroupId);
                        if (therapeuticGroupResult.created) {
                            createdTherapeuticGroupCount++;
                        }
                    }
                }

                await prisma.masterDrug.create({
                    data: {
                        maChung: String(drug.maChung),
                        maBhyt: drug.maBhyt ? String(drug.maBhyt) : null,
                        maAtc: drug.maAtc ? String(drug.maAtc) : null,
                        tenThuoc: String(drug.tenThuoc),
                        hoatChat: drug.hoatChat ? String(drug.hoatChat) : null,
                        hamLuong: drug.hamLuong ? String(drug.hamLuong) : null,
                        dangBaoChe: drug.dangBaoChe ? String(drug.dangBaoChe) : null,
                        soDangKy: drug.soDangKy ? String(drug.soDangKy) : null,
                        quyCach: drug.quyCach ? String(drug.quyCach) : null,
                        donViTinh: drug.donViTinh ? String(drug.donViTinh) : null,

                        tieuChuan: drug.tieuChuan ? String(drug.tieuChuan) : null,
                        tuoiTho: drug.tuoiTho ? String(drug.tuoiTho) : null,
                        duongDung: drug.duongDung ? String(drug.duongDung) : null,
                        nguonGoc: drug.nguonGoc ? String(drug.nguonGoc) : null,

                        congTySanXuat: drug.congTySanXuat ? String(drug.congTySanXuat) : null,
                        nuocSanXuat: drug.nuocSanXuat ? String(drug.nuocSanXuat) : null,
                        diaChiSanXuat: drug.diaChiSanXuat ? String(drug.diaChiSanXuat) : null,

                        congTyDangKy: drug.congTyDangKy ? String(drug.congTyDangKy) : null,
                        nuocDangKy: drug.nuocDangKy ? String(drug.nuocDangKy) : null,
                        diaChiDangKy: drug.diaChiDangKy ? String(drug.diaChiDangKy) : null,

                        nhomThuoc: drug.nhomThuoc ? String(drug.nhomThuoc) : null,
                        therapeuticGroup: therapeuticGroupId
                            ? { connect: { id: therapeuticGroupId } }
                            : undefined,
                        isKeDon: drug.isKeDon ? String(drug.isKeDon) : null,
                        kiemSoatDacBiet: normalizedSpecialControl,
                        isThuocHiem: parseImportedBooleanFlag(drug.isThuocHiem ?? drug.thuocHiem),
                        isTrongNuoc: drug.isTrongNuoc ? String(drug.isTrongNuoc) : null,
                        isActive: true,
                    },
                });
                successCount++;
            } catch (error) {
                console.error(`Error importing drug ${drug.maChung}:`, error);
                errors.push(`Dòng ${rowNumber}: lỗi khi nhập thuốc ${drug.maChung}`);
                errorCount++;
            }
        }

        return NextResponse.json({
            message: "Import finished",
            stats: {
                total: drugs.length,
                success: successCount,
                skipped: skippedCount,
                error: errorCount,
                createdTherapeuticGroups: createdTherapeuticGroupCount,
            },
            errors,
        });
    } catch (error) {
        console.error("Import error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
