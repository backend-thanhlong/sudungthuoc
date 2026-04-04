import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

// GET: Cross-facility comparison for a specific drug
export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session || (session.user as any).role !== "ADMIN") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const drugName = searchParams.get("drugName") || "";
        const reportMonth = searchParams.get("reportMonth") || "";

        if (!drugName) {
            return NextResponse.json(
                { message: "drugName is required" },
                { status: 400 }
            );
        }

        // Build where clause
        const where: any = {
            drugMap: {
                OR: [
                    { tenThuocNoiBo: { contains: drugName, mode: "insensitive" } },
                    {
                        masterDrug: {
                            tenThuoc: { contains: drugName, mode: "insensitive" },
                        },
                    },
                ],
            },
        };
        if (reportMonth) {
            where.reportMonth = reportMonth;
        }

        const reports = await prisma.inventoryReport.findMany({
            where,
            include: {
                facility: {
                    select: {
                        id: true,
                        facilityName: true,
                        username: true,
                    },
                },
                drugMap: {
                    include: {
                        masterDrug: {
                            select: {
                                tenThuoc: true,
                                maChung: true,
                                hoatChat: true,
                                donViTinh: true,
                            },
                        },
                    },
                },
            },
            orderBy: [
                { facility: { facilityName: "asc" } },
                { reportMonth: "desc" },
            ],
        });

        // Group by facility for comparison
        const facilityMap = new Map<string, any>();
        reports.forEach((r) => {
            const facilityName = r.facility.facilityName || r.facility.username;
            if (!facilityMap.has(facilityName)) {
                facilityMap.set(facilityName, {
                    facilityName,
                    facilityId: r.facility.id,
                    drugName: r.drugMap?.masterDrug?.tenThuoc || r.drugMap?.tenThuocNoiBo || "",
                    hoatChat: r.drugMap?.masterDrug?.hoatChat || r.drugMap?.hoatChatNoiBo || "",
                    donViTinh: r.drugMap?.masterDrug?.donViTinh || r.drugMap?.donViTinhNoiBo || "",
                    tonDau: 0,
                    nhap: 0,
                    xuat: 0,
                    tonCuoi: 0,
                    giaVat: 0,
                    thanhTien: 0,
                    reportMonth: r.reportMonth,
                });
            }
            const entry = facilityMap.get(facilityName);
            entry.tonDau += Number(r.tonDau);
            entry.nhap += Number(r.nhap);
            entry.xuat += Number(r.xuat);
            entry.tonCuoi += Number(r.tonCuoi);
            entry.giaVat = Number(r.giaVat); // Use latest
            entry.thanhTien += Number(r.thanhTienTonCuoi);
        });

        const comparisonData = Array.from(facilityMap.values()).sort(
            (a, b) => b.thanhTien - a.thanhTien
        );

        // Get available months for filter
        const months = await prisma.inventoryReport.findMany({
            select: { reportMonth: true },
            distinct: ["reportMonth"],
            orderBy: { reportMonth: "desc" },
        });

        // Get searchable drug names
        const drugSuggestions = await prisma.masterDrug.findMany({
            where: {
                tenThuoc: { contains: drugName, mode: "insensitive" },
            },
            select: { tenThuoc: true, maChung: true },
            take: 10,
        });

        return NextResponse.json({
            comparison: comparisonData,
            months: months.map((m) => m.reportMonth),
            drugSuggestions,
            totalFacilities: comparisonData.length,
        });
    } catch (error) {
        console.error("Error in comparison report:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
