import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { Prisma } from "../../../../prisma/generated/client";

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const query = searchParams.get("q") || "";
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "50");
        const offset = (page - 1) * limit;

        // Build search conditions for MasterDrug
        const searchConditions: Prisma.MasterDrugWhereInput = query
            ? {
                OR: [
                    { tenThuoc: { contains: query, mode: "insensitive" } },
                    { hoatChat: { contains: query, mode: "insensitive" } },
                    { hamLuong: { contains: query, mode: "insensitive" } },
                    { maChung: { contains: query, mode: "insensitive" } },
                ],
            }
            : {};

        // Get latest approved reports with stock > 0
        // We need to get the most recent APPROVED report for each facility-drug combination
        const latestReports = await prisma.$queryRaw<Array<{
            id: string;
            facility_id: string;
            map_id: string;
            report_month: string;
            ton_cuoi: number;
            gia_vat: number;
        }>>`
            SELECT DISTINCT ON (ir.facility_id, ir.map_id)
                ir.id,
                ir.facility_id,
                ir.map_id,
                ir.report_month,
                ir.ton_cuoi,
                ir.gia_vat
            FROM inventory_reports ir
            WHERE ir.status = 'APPROVED'
              AND ir.ton_cuoi > 0
            ORDER BY ir.facility_id, ir.map_id, ir.report_month DESC
        `;

        if (latestReports.length === 0) {
            return NextResponse.json({
                results: [],
                total: 0,
                page,
                limit,
            });
        }

        const mapIds = latestReports.map(r => r.map_id);

        // Get drug mappings with facility info
        const mappings = await prisma.facilityDrugMap.findMany({
            where: {
                id: { in: mapIds },
                masterDrug: searchConditions,
            },
            include: {
                masterDrug: true,
                facility: {
                    select: {
                        id: true,
                        facilityCode: true,
                        facilityName: true,
                    },
                },
            },
        });

        // Create a map for quick lookup
        const mappingMap = new Map(mappings.map(m => [m.id, m]));

        // Combine data and group by drug
        const drugFacilitiesMap = new Map<string, {
            drugCode: string;
            drugName: string;
            activeIngredient: string;
            dosage: string;
            unit: string;
            facilities: Array<{
                facilityCode: string;
                facilityName: string;
                currentStock: number;
                priceVAT: number;
                reportMonth: string;
            }>;
            totalStock: number;
            facilityCount: number;
        }>();

        latestReports
            .filter(report => mappingMap.has(report.map_id))
            .forEach(report => {
                const mapping = mappingMap.get(report.map_id)!;
                const drugCode = mapping.masterDrug?.maChung || mapping.maNoiBo;

                if (!drugFacilitiesMap.has(drugCode)) {
                    drugFacilitiesMap.set(drugCode, {
                        drugCode,
                        drugName: mapping.masterDrug?.tenThuoc || mapping.tenThuocNoiBo,
                        activeIngredient: mapping.masterDrug?.hoatChat || mapping.hoatChatNoiBo || "",
                        dosage: mapping.masterDrug?.hamLuong || "",
                        unit: mapping.masterDrug?.donViTinh || mapping.donViTinhNoiBo || "",
                        facilities: [],
                        totalStock: 0,
                        facilityCount: 0,
                    });
                }

                const drug = drugFacilitiesMap.get(drugCode)!;
                drug.facilities.push({
                    facilityCode: mapping.facility.facilityCode || "",
                    facilityName: mapping.facility.facilityName || "",
                    currentStock: Number(report.ton_cuoi),
                    priceVAT: Number(report.gia_vat),
                    reportMonth: report.report_month,
                });
                drug.totalStock += Number(report.ton_cuoi);
                drug.facilityCount += 1;
            });

        const results = Array.from(drugFacilitiesMap.values());

        // Apply pagination
        const total = results.length;
        const paginatedResults = results.slice(offset, offset + limit);

        return NextResponse.json({
            results: paginatedResults,
            total,
            page,
            limit,
        });
    } catch (error) {
        console.error("Error searching inventory:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
