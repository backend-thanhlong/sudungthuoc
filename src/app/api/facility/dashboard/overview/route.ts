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

        // 1. KPIs
        const [totalInventoryValue, distinctDrugCount, allReports] = await Promise.all([
            prisma.inventoryReport.aggregate({
                _sum: { thanhTienTonCuoi: true },
                where: reportWhere,
            }),
            prisma.inventoryReport.findMany({
                where: reportWhere,
                select: { mapId: true },
                distinct: ['mapId'],
            }),
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

        // 3. Top drug groups by inventory value (stacked bar - single facility so group by nhomThuoc)
        const drugGroupMap = new Map<string, number>();
        allReports.forEach((r) => {
            const nhom = r.drugMap?.masterDrug?.nhomThuoc || "Khác";
            const val = Number(r.thanhTienTonCuoi);
            drugGroupMap.set(nhom, (drugGroupMap.get(nhom) || 0) + val);
        });

        const facilityName = allReports[0]?.facility?.facilityName || "Đơn vị";
        const allDrugGroups = Array.from(drugGroupMap.keys());
        const stackedBarData = [{
            facility: facilityName,
            ...Object.fromEntries(drugGroupMap),
        }];

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

        // 5. Heatmap by nhomThuoc (since single facility, use drug groups instead of address)
        const heatmapData = Array.from(drugGroupMap.entries())
            .map(([address, value]) => ({ address, value: Math.round(value) }))
            .sort((a, b) => b.value - a.value);

        return NextResponse.json({
            kpis: {
                totalInventoryValue: Number(totalInventoryValue._sum.thanhTienTonCuoi) || 0,
                domesticRatio: Math.round(domesticRatio * 100) / 100,
                distinctDrugCount: distinctDrugCount.length,
            },
            stackedBarData,
            drugGroups: allDrugGroups,
            donutData,
            heatmapData,
        });
    } catch (error) {
        console.error("Facility dashboard overview error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
