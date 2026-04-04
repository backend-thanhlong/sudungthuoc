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

    try {
        // Build where clause for inventory reports
        const reportWhere: any = {};
        if (reportMonth) {
            reportWhere.reportMonth = reportMonth;
        }
        if (facilityId) {
            reportWhere.facilityId = facilityId;
        }

        // 1. KPIs
        const [totalInventoryValue, distinctDrugCount, allReports] = await Promise.all([
            // Total inventory value
            prisma.inventoryReport.aggregate({
                _sum: { thanhTienTonCuoi: true },
                where: reportWhere,
            }),
            // Distinct drug count
            prisma.inventoryReport.findMany({
                where: reportWhere,
                select: { mapId: true },
                distinct: ['mapId'],
            }),
            // All reports for further processing
            prisma.inventoryReport.findMany({
                where: reportWhere,
                select: {
                    facilityId: true,
                    thanhTienTonCuoi: true,
                    xuat: true,
                    giaVat: true,
                    bhyt: true,
                    dichVu: true,
                    drugMap: {
                        select: {
                            masterDrug: {
                                select: {
                                    nhomThuoc: true,
                                    isTrongNuoc: true,
                                },
                            },
                        },
                    },
                    facility: {
                        select: {
                            facilityName: true,
                            address: true,
                        },
                    },
                },
            }),
        ]);

        // 2. Domestic drug usage ratio
        let domesticValue = 0;
        let totalExportValue = 0;
        allReports.forEach((r) => {
            const exportVal = Number(r.xuat) * Number(r.giaVat);
            totalExportValue += exportVal;
            if (r.drugMap?.masterDrug?.isTrongNuoc === "Có" || r.drugMap?.masterDrug?.isTrongNuoc === "có" || r.drugMap?.masterDrug?.isTrongNuoc === "TRUE" || r.drugMap?.masterDrug?.isTrongNuoc === "true" || r.drugMap?.masterDrug?.isTrongNuoc === "1") {
                domesticValue += exportVal;
            }
        });
        const domesticRatio = totalExportValue > 0 ? (domesticValue / totalExportValue) * 100 : 0;

        // 3. Top 10 CSYT by inventory value (grouped by nhomThuoc for stacked bar)
        const facilityDrugGroupMap = new Map<string, Map<string, number>>();
        allReports.forEach((r) => {
            const fname = r.facility?.facilityName || "Unknown";
            const nhom = r.drugMap?.masterDrug?.nhomThuoc || "Khác";
            const val = Number(r.thanhTienTonCuoi);
            if (!facilityDrugGroupMap.has(fname)) {
                facilityDrugGroupMap.set(fname, new Map());
            }
            const groupMap = facilityDrugGroupMap.get(fname)!;
            groupMap.set(nhom, (groupMap.get(nhom) || 0) + val);
        });

        // Sort by total value, take top 10
        const facilityTotals = Array.from(facilityDrugGroupMap.entries()).map(([name, groups]) => {
            const total = Array.from(groups.values()).reduce((s, v) => s + v, 0);
            return { name, groups: Object.fromEntries(groups), total };
        }).sort((a, b) => b.total - a.total).slice(0, 10);

        // Collect all unique drug groups from top 10
        const allDrugGroups = new Set<string>();
        facilityTotals.forEach(f => Object.keys(f.groups).forEach(g => allDrugGroups.add(g)));

        const stackedBarData = facilityTotals.map(f => ({
            facility: f.name,
            ...f.groups,
        }));

        // 4. BHYT vs Dịch vụ donut
        let bhytValue = 0;
        let dichvuValue = 0;
        allReports.forEach((r) => {
            const exportVal = Number(r.xuat) * Number(r.giaVat);
            if (r.bhyt === "Có" || r.bhyt === "có" || r.bhyt === "TRUE" || r.bhyt === "true" || r.bhyt === "1" || r.bhyt === "x" || r.bhyt === "X") {
                bhytValue += exportVal;
            }
            if (r.dichVu === "Có" || r.dichVu === "có" || r.dichVu === "TRUE" || r.dichVu === "true" || r.dichVu === "1" || r.dichVu === "x" || r.dichVu === "X") {
                dichvuValue += exportVal;
            }
        });

        const donutData = [
            { name: "Thuốc BHYT", value: Math.round(bhytValue) },
            { name: "Thuốc Dịch vụ", value: Math.round(dichvuValue) },
        ];

        // 5. Heatmap by address
        const addressMap = new Map<string, number>();
        allReports.forEach((r) => {
            const addr = r.facility?.address || "Không rõ";
            addressMap.set(addr, (addressMap.get(addr) || 0) + Number(r.thanhTienTonCuoi));
        });
        const heatmapData = Array.from(addressMap.entries())
            .map(([address, value]) => ({ address, value: Math.round(value) }))
            .sort((a, b) => b.value - a.value);

        return NextResponse.json({
            kpis: {
                totalInventoryValue: Number(totalInventoryValue._sum.thanhTienTonCuoi) || 0,
                domesticRatio: Math.round(domesticRatio * 100) / 100,
                distinctDrugCount: distinctDrugCount.length,
            },
            stackedBarData,
            drugGroups: Array.from(allDrugGroups),
            donutData,
            heatmapData,
        });
    } catch (error) {
        console.error("Dashboard overview error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
