import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

// GET facility's mappings
export async function GET() {
    try {
        const session = await auth();
        if (!session || session.user.role !== "FACILITY") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const mappings = await prisma.facilityDrugMap.findMany({
            where: { facilityId: session.user.id },
            include: {
                masterDrug: {
                    select: {
                        id: true,
                        maChung: true,
                        tenThuoc: true,
                        hoatChat: true,
                        soDangKy: true,
                        hamLuong: true,
                        dangBaoChe: true,
                        donViTinh: true,
                        quyCach: true,
                    },
                },
            },
            orderBy: { updatedAt: "desc" },
        });

        return NextResponse.json(mappings);
    } catch (error) {
        console.error("Error fetching mappings:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

// POST create new mappings from Excel upload
export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session || session.user.role !== "FACILITY") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { drugs } = body; // Array of drug objects from Excel, each with an `_rowIndex`

        if (!drugs || !Array.isArray(drugs)) {
            return NextResponse.json({ message: "Invalid data format" }, { status: 400 });
        }

        const errors: { row: number; maNoiBo: string; message: string }[] = [];
        const skipped: { row: number; maNoiBo: string; message: string }[] = [];

        // Server-side validation per row
        for (const drug of drugs) {
            const rowNum = drug._rowIndex ?? 0;
            if (!drug.maNoiBo || String(drug.maNoiBo).trim() === "") {
                errors.push({ row: rowNum, maNoiBo: "", message: "Thiếu mã nội bộ (bắt buộc)" });
            }
            if (!drug.tenThuocNoiBo || String(drug.tenThuocNoiBo).trim() === "") {
                errors.push({ row: rowNum, maNoiBo: drug.maNoiBo || "", message: "Thiếu tên thuốc (bắt buộc)" });
            }
        }

        // Only proceed with valid entries
        const validDrugs = drugs.filter(
            (d) => d.maNoiBo && String(d.maNoiBo).trim() !== "" && d.tenThuocNoiBo && String(d.tenThuocNoiBo).trim() !== ""
        );

        // Fetch all existing mappings for this facility in ONE query
        const existingMappings = await prisma.facilityDrugMap.findMany({
            where: { facilityId: session.user.id },
            select: { maNoiBo: true },
        });
        const existingCodes = new Set(existingMappings.map(m => m.maNoiBo));

        // Separate new drugs and skipped (already existing)
        const newDrugs: typeof validDrugs = [];
        for (const drug of validDrugs) {
            if (existingCodes.has(drug.maNoiBo)) {
                skipped.push({
                    row: drug._rowIndex ?? 0,
                    maNoiBo: drug.maNoiBo,
                    message: "Mã nội bộ đã tồn tại trong hệ thống",
                });
            } else {
                newDrugs.push(drug);
            }
        }

        let createdCount = 0;

        if (newDrugs.length > 0) {
            // Get all master drugs for auto-mapping in ONE query
            const masterDrugs = await prisma.masterDrug.findMany({
                where: { isActive: true },
                select: { id: true, soDangKy: true, tenThuoc: true },
            });

            // Prepare batch create data
            const createData = newDrugs.map(drug => {
                let masterDrugId: string | null = null;
                let status: "PENDING_MAPPING" | "AUTO_MAPPED" = "PENDING_MAPPING";

                if (drug.soDangKyNoiBo && drug.tenThuocNoiBo) {
                    const matchedDrug = masterDrugs.find(
                        (md) =>
                            md.soDangKy?.toLowerCase().trim() === drug.soDangKyNoiBo?.toLowerCase().trim() &&
                            md.tenThuoc?.toLowerCase().trim() === drug.tenThuocNoiBo?.toLowerCase().trim()
                    );
                    if (matchedDrug) {
                        masterDrugId = matchedDrug.id;
                        status = "AUTO_MAPPED";
                    }
                }

                return {
                    facilityId: session.user.id,
                    maNoiBo: String(drug.maNoiBo).trim(),
                    tenThuocNoiBo: String(drug.tenThuocNoiBo).trim(),
                    hoatChatNoiBo: drug.hoatChatNoiBo ? String(drug.hoatChatNoiBo).trim() : null,
                    soDangKyNoiBo: drug.soDangKyNoiBo ? String(drug.soDangKyNoiBo).trim() : null,
                    donViTinhNoiBo: drug.donViTinhNoiBo ? String(drug.donViTinhNoiBo).trim() : null,
                    masterDrugId,
                    status,
                };
            });

            // Batch insert all new mappings in ONE query
            const result = await prisma.facilityDrugMap.createMany({
                data: createData,
                skipDuplicates: true,
            });

            createdCount = result.count;
        }

        return NextResponse.json({
            message: `Tạo thành công ${createdCount} ánh xạ thuốc`,
            count: createdCount,
            skippedCount: skipped.length,
            errorCount: errors.length,
            errors,
            skipped,
        }, { status: 201 });
    } catch (error) {
        console.error("Error creating mappings:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
