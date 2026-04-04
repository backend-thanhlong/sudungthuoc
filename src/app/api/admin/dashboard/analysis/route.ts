import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(request: Request) {
    const session = await auth();
    if (!session || (session.user as any).role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const reportMonth = searchParams.get("reportMonth") || undefined;
    const facilityId = searchParams.get("facilityId") || undefined;
    const compareId1 = searchParams.get("compareId1") || undefined;
    const compareId2 = searchParams.get("compareId2") || undefined;

    try {
        const reportWhere: any = {};
        if (reportMonth) {
            reportWhere.reportMonth = reportMonth;
        }
        if (facilityId) {
            reportWhere.facilityId = facilityId;
        }

        // 1. ABC Analysis - group by drug, calculate total usage value
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

        // Group by drug (masterDrugId or tenThuocNoiBo)
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

        // Sort by value descending
        const sortedDrugs = Array.from(drugUsageMap.values())
            .filter(d => d.totalValue > 0)
            .sort((a, b) => b.totalValue - a.totalValue);

        const grandTotal = sortedDrugs.reduce((sum, d) => sum + d.totalValue, 0);

        // Assign ABC groups
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

        // 3. Facility comparison
        let comparisonData = null;
        if (compareId1 && compareId2) {
            const [facility1Reports, facility2Reports, facility1, facility2] = await Promise.all([
                prisma.inventoryReport.findMany({
                    where: { ...reportWhere, facilityId: compareId1 },
                    select: {
                        xuat: true,
                        giaVat: true,
                        thanhTienTonCuoi: true,
                        drugMap: {
                            select: {
                                masterDrug: {
                                    select: { nhomThuoc: true },
                                },
                            },
                        },
                    },
                }),
                prisma.inventoryReport.findMany({
                    where: { ...reportWhere, facilityId: compareId2 },
                    select: {
                        xuat: true,
                        giaVat: true,
                        thanhTienTonCuoi: true,
                        drugMap: {
                            select: {
                                masterDrug: {
                                    select: { nhomThuoc: true },
                                },
                            },
                        },
                    },
                }),
                prisma.user.findUnique({
                    where: { id: compareId1 },
                    select: { facilityName: true, facilityType: true },
                }),
                prisma.user.findUnique({
                    where: { id: compareId2 },
                    select: { facilityName: true, facilityType: true },
                }),
            ]);

            // Group by nhomThuoc for each facility
            const groupByNhom = (reports: typeof facility1Reports) => {
                const map = new Map<string, number>();
                reports.forEach(r => {
                    const nhom = r.drugMap?.masterDrug?.nhomThuoc || "Khác";
                    const val = Number(r.xuat) * Number(r.giaVat);
                    map.set(nhom, (map.get(nhom) || 0) + val);
                });
                return Object.fromEntries(map);
            };

            const groups1 = groupByNhom(facility1Reports);
            const groups2 = groupByNhom(facility2Reports);

            const allGroups = new Set([...Object.keys(groups1), ...Object.keys(groups2)]);
            const chartData = Array.from(allGroups).map(g => ({
                nhomThuoc: g,
                facility1: Math.round(groups1[g] || 0),
                facility2: Math.round(groups2[g] || 0),
            })).sort((a, b) => (b.facility1 + b.facility2) - (a.facility1 + a.facility2));

            comparisonData = {
                facility1: { name: facility1?.facilityName || "CSYT 1", type: facility1?.facilityType || "" },
                facility2: { name: facility2?.facilityName || "CSYT 2", type: facility2?.facilityType || "" },
                chartData,
            };
        }

        // 4. Facility list for dropdowns
        const facilities = await prisma.user.findMany({
            where: { role: "FACILITY", isActive: true },
            select: { id: true, facilityName: true, facilityType: true },
            orderBy: { facilityName: 'asc' },
        });

        return NextResponse.json({
            abcData,
            abcSummary,
            specialDrugs,
            comparisonData,
            facilities: facilities.map(f => ({
                id: f.id,
                name: f.facilityName || "Unknown",
                type: f.facilityType || "",
            })),
        });
    } catch (error) {
        console.error("Dashboard analysis error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
