import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

const normalizeDomesticFlag = (value: string | null | undefined) =>
    value
        ?.trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") || "";

const isDomesticDrug = (value: string | null | undefined) => {
    const normalized = normalizeDomesticFlag(value);
    return normalized === "trong nuoc" || normalized === "co" || normalized === "true" || normalized === "1";
};

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
                    nhap: true,
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
        let totalImportValue = 0;
        allReports.forEach((r) => {
            const exportVal = Number(r.xuat) * Number(r.giaVat);
            const importVal = Number(r.nhap || 0) * Number(r.giaVat);
            totalExportValue += exportVal;
            totalImportValue += importVal;
            if (isDomesticDrug(r.drugMap?.masterDrug?.isTrongNuoc)) {
                domesticValue += exportVal;
            }
        });
        const domesticRatio = totalExportValue > 0 ? (domesticValue / totalExportValue) * 100 : 0;

        // 3. Drug groups by inventory / export / import value (single facility)
        const inventoryGroupMap = new Map<string, number>();
        const exportGroupMap = new Map<string, number>();
        const importGroupMap = new Map<string, number>();
        allReports.forEach((r) => {
            const nhom = r.drugMap?.masterDrug?.nhomThuoc || "Khác";
            const inventoryValue = Number(r.thanhTienTonCuoi);
            const exportValue = Number(r.xuat) * Number(r.giaVat);
            const importValue = Number(r.nhap || 0) * Number(r.giaVat);

            inventoryGroupMap.set(nhom, (inventoryGroupMap.get(nhom) || 0) + inventoryValue);
            exportGroupMap.set(nhom, (exportGroupMap.get(nhom) || 0) + exportValue);
            importGroupMap.set(nhom, (importGroupMap.get(nhom) || 0) + importValue);
        });

        const facilityName = allReports[0]?.facility?.facilityName || "Đơn vị";
        const allDrugGroups = Array.from(
            new Set([
                ...inventoryGroupMap.keys(),
                ...exportGroupMap.keys(),
                ...importGroupMap.keys(),
            ])
        );
        const stackedBarData = [{
            facility: facilityName,
            ...Object.fromEntries(inventoryGroupMap),
        }];

        const topExportByFacility = totalExportValue > 0
            ? [{
                facility: facilityName,
                total: Math.round(totalExportValue),
                ...Object.fromEntries(
                    Array.from(exportGroupMap.entries()).map(([group, value]) => [group, Math.round(value)])
                ),
            }]
            : [];

        const topImportChildren = Array.from(importGroupMap.entries())
            .filter(([, value]) => value > 0)
            .sort((left, right) => right[1] - left[1])
            .map(([group, value]) => ({
                name: group,
                facility: facilityName,
                drugGroup: group,
                value: Math.round(value),
            }));

        const topImportTreemap = totalImportValue > 0 && topImportChildren.length > 0
            ? [{
                name: facilityName,
                facility: facilityName,
                value: Math.round(totalImportValue),
                children: topImportChildren,
            }]
            : [];

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
        const heatmapData = Array.from(inventoryGroupMap.entries())
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
            topExportByFacility,
            topImportTreemap,
            heatmapData,
        });
    } catch (error) {
        console.error("Facility dashboard overview error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
