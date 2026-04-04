import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

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

        for (const drug of drugs) {
            if (!drug.maChung || !drug.tenThuoc) {
                errorCount++;
                continue;
            }

            try {
                // Check if drug already exists
                const existingDrug = await prisma.masterDrug.findFirst({
                    where: { maChung: String(drug.maChung) },
                });

                if (existingDrug) {
                    skippedCount++;
                    continue;
                }

                await prisma.masterDrug.create({
                    data: {
                        maChung: String(drug.maChung),
                        maBhyt: drug.maBhyt ? String(drug.maBhyt) : null,
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
                        isKeDon: drug.isKeDon ? String(drug.isKeDon) : null,
                        kiemSoatDacBiet: drug.kiemSoatDacBiet ? String(drug.kiemSoatDacBiet) : null,
                        isTrongNuoc: drug.isTrongNuoc ? String(drug.isTrongNuoc) : null,
                        isActive: true,
                    },
                });
                successCount++;
            } catch (error) {
                console.error(`Error importing drug ${drug.maChung}:`, error);
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
            },
        });
    } catch (error) {
        console.error("Import error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
