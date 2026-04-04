import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(request: Request) {
    const session = await auth();
    if (!session || (session.user as any).role !== "FACILITY") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const facilityId = (session.user as any).id;
    const { searchParams } = new URL(request.url);
    const reportMonth = searchParams.get("reportMonth") || undefined;

    try {
        const reportWhere: any = { facilityId };
        if (reportMonth) {
            reportWhere.reportMonth = reportMonth;
        }

        // 1. ABC Analysis
        const allReports = await prisma.inventoryReport.findMany({
            where: reportWhere,
            select: {
                xuat: true,
                giaVat: true,
                drugMap: {
                    select: {
                        masterDrugId: true,
                        tenThuocNoiBo: true,
                        masterDrug: {
                            select: {
                                tenThuoc: true,
                                hoatChat: true,
                                hamLuong: true,
                                nhomThuoc: true,
                                isKeDon: true,
                                kiemSoatDacBiet: true,
                            },
                        },
                    },
                },
            },
        });

        const drugUsageMap = new Map<string, {
            drugKey: string;
            drugName: string;
            hoatChat: string;
            hamLuong: string;
            nhomThuoc: string;
            isKeDon: string;
            kiemSoatDacBiet: string;
            totalValue: number;
        }>();

        allReports.forEach(r => {
            const drugKey = r.drugMap?.masterDrugId || r.drugMap?.tenThuocNoiBo || "unknown";
            const existing = drugUsageMap.get(drugKey);
            const value = Number(r.xuat) * Number(r.giaVat);

            if (existing) {
                existing.totalValue += value;
            } else {
                drugUsageMap.set(drugKey, {
                    drugKey,
                    drugName: r.drugMap?.masterDrug?.tenThuoc || r.drugMap?.tenThuocNoiBo || "N/A",
                    hoatChat: r.drugMap?.masterDrug?.hoatChat || "N/A",
                    hamLuong: r.drugMap?.masterDrug?.hamLuong || "",
                    nhomThuoc: r.drugMap?.masterDrug?.nhomThuoc || "Khác",
                    isKeDon: r.drugMap?.masterDrug?.isKeDon || "",
                    kiemSoatDacBiet: r.drugMap?.masterDrug?.kiemSoatDacBiet || "",
                    totalValue: value,
                });
            }
        });

        const sortedDrugs = Array.from(drugUsageMap.values())
            .filter(d => d.totalValue > 0)
            .sort((a, b) => b.totalValue - a.totalValue);

        const grandTotal = sortedDrugs.reduce((sum, d) => sum + d.totalValue, 0);

        let cumulative = 0;
        const abcData = sortedDrugs.map((drug, index) => {
            cumulative += drug.totalValue;
            const cumulativePercent = grandTotal > 0 ? (cumulative / grandTotal) * 100 : 0;
            let group = "C";
            if (cumulativePercent <= 80) group = "A";
            else if (cumulativePercent <= 95) group = "B";

            return {
                rank: index + 1,
                drugName: drug.drugName,
                hoatChat: drug.hoatChat,
                hamLuong: drug.hamLuong,
                nhomThuoc: drug.nhomThuoc,
                isKeDon: drug.isKeDon,
                kiemSoatDacBiet: drug.kiemSoatDacBiet,
                totalValue: Math.round(drug.totalValue),
                percent: Math.round((drug.totalValue / grandTotal) * 10000) / 100,
                cumulativePercent: Math.round(cumulativePercent * 100) / 100,
                group,
            };
        }).slice(0, 200);

        const abcSummary = {
            groupA: abcData.filter(d => d.group === "A").length,
            groupB: abcData.filter(d => d.group === "B").length,
            groupC: sortedDrugs.length - abcData.filter(d => d.group === "A").length - abcData.filter(d => d.group === "B").length,
            totalDrugs: sortedDrugs.length,
        };

        // 2. Special drug monitoring
        const specialDrugs = sortedDrugs
            .filter(d => {
                const ksdb = d.kiemSoatDacBiet?.toLowerCase() || "";
                return ksdb.includes("có") || ksdb === "true" || ksdb === "1" || ksdb === "x";
            })
            .map(d => ({
                drugName: d.drugName,
                hoatChat: d.hoatChat,
                hamLuong: d.hamLuong,
                totalValue: Math.round(d.totalValue),
                isKeDon: d.isKeDon,
                kiemSoatDacBiet: d.kiemSoatDacBiet,
            }))
            .slice(0, 50);

        // No facility comparison for facility dashboard (single facility)
        // Return empty facilities list since facility users don't need comparison
        return NextResponse.json({
            abcData,
            abcSummary,
            specialDrugs,
            comparisonData: null,
            facilities: [],
        });
    } catch (error) {
        console.error("Facility dashboard analysis error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
