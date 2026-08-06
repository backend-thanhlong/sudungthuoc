import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type FacilityGroupMetricMap = Map<string, Map<string, number>>;

const INVENTORY_DRUG_GROUPS = ["Hóa dược", "Dược liệu", "Sinh phẩm", "Thuốc cổ truyền", "Vắc xin", "Khác"] as const;

interface TreemapDatum {
    name: string;
    value: number;
    facility?: string;
    drugGroup?: string;
    children?: TreemapDatum[];
}

interface FacilityInventoryMapDatum {
    facilityId: string;
    facilityName: string;
    address: string;
    latitude: number;
    longitude: number;
    value: number;
}

interface FacilityImportExportInventoryDatum {
    facility: string;
    importValue: number;
    exportValue: number;
    inventoryValue: number;
    total: number;
}

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

const isForeignDrug = (value: string | null | undefined) =>
    normalizeDomesticFlag(value) === "nuoc ngoai";

const normalizeDrugGroupKey = (value: string | null | undefined) =>
    value
        ?.trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") || "";

const normalizeInventoryDrugGroup = (value: string | null | undefined) => {
    const normalized = normalizeDrugGroupKey(value);

    if (normalized.includes("hoa duoc")) return "Hóa dược";
    if (normalized.includes("duoc lieu")) return "Dược liệu";
    if (normalized.includes("sinh pham")) return "Sinh phẩm";
    if (normalized.includes("thuoc co truyen")) return "Thuốc cổ truyền";
    if (normalized.includes("vac xin") || normalized.includes("vaccine")) return "Vắc xin";

    return "Khác";
};

const addMetricToFacilityGroupMap = (
    metricMap: FacilityGroupMetricMap,
    facilityName: string,
    drugGroup: string,
    value: number
) => {
    if (!Number.isFinite(value) || value <= 0) {
        return;
    }

    if (!metricMap.has(facilityName)) {
        metricMap.set(facilityName, new Map());
    }

    const groupMap = metricMap.get(facilityName)!;
    groupMap.set(drugGroup, (groupMap.get(drugGroup) || 0) + value);
};

const getTopFacilityMetrics = (metricMap: FacilityGroupMetricMap) =>
    Array.from(metricMap.entries())
        .map(([facility, groups]) => {
            const total = Array.from(groups.values()).reduce((sum, value) => sum + value, 0);
            return { facility, total, groups };
        })
        .filter((item) => item.total > 0)
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

const buildTopStackedBarData = (metricMap: FacilityGroupMetricMap) => {
    const topFacilities = getTopFacilityMetrics(metricMap);

    return topFacilities.map((item) => ({
        facility: item.facility,
        total: Math.round(item.total),
        ...Object.fromEntries(
            Array.from(item.groups.entries()).map(([group, value]) => [group, Math.round(value)])
        ),
    }));
};

const buildTreemapData = (metricMap: FacilityGroupMetricMap): TreemapDatum[] =>
    getTopFacilityMetrics(metricMap).map((item) => ({
        name: item.facility,
        facility: item.facility,
        value: Math.round(item.total),
        children: Array.from(item.groups.entries())
            .filter(([, value]) => value > 0)
            .sort((a, b) => b[1] - a[1])
            .map(([group, value]) => ({
                name: group,
                facility: item.facility,
                drugGroup: group,
                value: Math.round(value),
            })),
    }));

const buildAllFacilityInventoryByDrugGroup = (metricMap: FacilityGroupMetricMap) =>
    Array.from(metricMap.keys())
        .map((facility) => {
            const groups = metricMap.get(facility);
            const row: Record<string, string | number> = { facility };
            let total = 0;

            INVENTORY_DRUG_GROUPS.forEach((group) => {
                const value = Math.round(groups?.get(group) || 0);
                row[group] = value;
                total += value;
            });

            row.total = total;
            return row;
        })
        .sort((a, b) => Number(b.total) - Number(a.total) || String(a.facility).localeCompare(String(b.facility), "vi"));

const buildFacilityImportExportInventory = (
    inventoryMetricMap: FacilityGroupMetricMap,
    exportMetricMap: FacilityGroupMetricMap,
    importMetricMap: FacilityGroupMetricMap
): FacilityImportExportInventoryDatum[] => {
    const facilities = new Set([
        ...inventoryMetricMap.keys(),
        ...exportMetricMap.keys(),
        ...importMetricMap.keys(),
    ]);

    return Array.from(facilities)
        .map((facility) => {
            const inventoryValue = Array.from(inventoryMetricMap.get(facility)?.values() || [])
                .reduce((sum, value) => sum + value, 0);
            const exportValue = Array.from(exportMetricMap.get(facility)?.values() || [])
                .reduce((sum, value) => sum + value, 0);
            const importValue = Array.from(importMetricMap.get(facility)?.values() || [])
                .reduce((sum, value) => sum + value, 0);

            return {
                facility,
                importValue: Math.round(importValue),
                exportValue: Math.round(exportValue),
                inventoryValue: Math.round(inventoryValue),
                total: Math.round(inventoryValue),
            };
        })
        .filter((item) => item.importValue > 0 || item.exportValue > 0 || item.inventoryValue > 0)
        .sort((a, b) => b.inventoryValue - a.inventoryValue || a.facility.localeCompare(b.facility, "vi"));
};

export async function GET(request: Request) {

    const { searchParams } = new URL(request.url);
    const reportMonth = searchParams.get("reportMonth") || undefined;
    const facilityId = searchParams.get("facilityId") || undefined;
    const mapMasterDrugIdParam = searchParams.get("mapMasterDrugId")?.trim();
    const mapMasterDrugId = mapMasterDrugIdParam && mapMasterDrugIdParam !== "all"
        ? mapMasterDrugIdParam
        : undefined;

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
        const mapReportWhere = mapMasterDrugId
            ? {
                ...reportWhere,
                drugMap: {
                    masterDrugId: mapMasterDrugId,
                },
            }
            : reportWhere;

        const [totalInventoryValue, distinctDrugCount, allReports, mapReports] = await Promise.all([
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
                            latitude: true,
                            longitude: true,
                        },
                    },
                },
            }),
            // Reports used only by the inventory map. This can be filtered by selected drug.
            prisma.inventoryReport.findMany({
                where: mapReportWhere,
                select: {
                    facilityId: true,
                    thanhTienTonCuoi: true,
                    facility: {
                        select: {
                            facilityName: true,
                            address: true,
                            latitude: true,
                            longitude: true,
                        },
                    },
                },
            }),
        ]);

        // 2. Domestic drug usage ratio
        let domesticValue = 0;
        let totalExportValue = 0;
        let domesticUsageLineCount = 0;
        let classifiedUsageLineCount = 0;
        let bhytValue = 0;
        let dichvuValue = 0;
        const inventoryMetricMap: FacilityGroupMetricMap = new Map();
        const exportMetricMap: FacilityGroupMetricMap = new Map();
        const importMetricMap: FacilityGroupMetricMap = new Map();
        const addressMap = new Map<string, number>();
        const facilityMap = new Map<string, FacilityInventoryMapDatum>();
        const mapMissingCoordinateFacilityIds = new Set<string>();

        allReports.forEach((r) => {
            const facilityName = r.facility?.facilityName || "Unknown";
            const drugGroup = normalizeInventoryDrugGroup(r.drugMap?.masterDrug?.nhomThuoc);
            const inventoryValue = Number(r.thanhTienTonCuoi);
            const exportVal = Number(r.xuat) * Number(r.giaVat);
            const importVal = Number(r.nhap) * Number(r.giaVat);
            const addr = r.facility?.address || "Không rõ";

            addMetricToFacilityGroupMap(inventoryMetricMap, facilityName, drugGroup, inventoryValue);
            addMetricToFacilityGroupMap(exportMetricMap, facilityName, drugGroup, exportVal);
            addMetricToFacilityGroupMap(importMetricMap, facilityName, drugGroup, importVal);
            addressMap.set(addr, (addressMap.get(addr) || 0) + inventoryValue);

            totalExportValue += exportVal;
            if (isDomesticDrug(r.drugMap?.masterDrug?.isTrongNuoc)) {
                domesticValue += exportVal;
            }
            if (Number(r.xuat) > 0) {
                const domesticFlag = r.drugMap?.masterDrug?.isTrongNuoc;
                if (isDomesticDrug(domesticFlag)) {
                    domesticUsageLineCount += 1;
                    classifiedUsageLineCount += 1;
                } else if (isForeignDrug(domesticFlag)) {
                    classifiedUsageLineCount += 1;
                }
            }

            if (r.bhyt === "Có" || r.bhyt === "có" || r.bhyt === "TRUE" || r.bhyt === "true" || r.bhyt === "1" || r.bhyt === "x" || r.bhyt === "X") {
                bhytValue += exportVal;
            }
            if (r.dichVu === "Có" || r.dichVu === "có" || r.dichVu === "TRUE" || r.dichVu === "true" || r.dichVu === "1" || r.dichVu === "x" || r.dichVu === "X") {
                dichvuValue += exportVal;
            }
        });

        mapReports.forEach((r) => {
            const facilityName = r.facility?.facilityName || "Unknown";
            const inventoryValue = Number(r.thanhTienTonCuoi);
            const addr = r.facility?.address || "Không rõ";
            const latitude = Number(r.facility?.latitude);
            const longitude = Number(r.facility?.longitude);

            if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
                const current = facilityMap.get(r.facilityId);
                facilityMap.set(r.facilityId, {
                    facilityId: r.facilityId,
                    facilityName,
                    address: addr,
                    latitude,
                    longitude,
                    value: (current?.value || 0) + inventoryValue,
                });
            } else if (inventoryValue > 0) {
                mapMissingCoordinateFacilityIds.add(r.facilityId);
            }
        });

        const domesticRatio = totalExportValue > 0 ? (domesticValue / totalExportValue) * 100 : 0;
        const domesticUsageLineRatio = classifiedUsageLineCount > 0
            ? (domesticUsageLineCount / classifiedUsageLineCount) * 100
            : 0;

        // 3. Top 10 CSYT by inventory value (grouped by nhomThuoc for stacked bar)
        const inventoryTopFacilities = getTopFacilityMetrics(inventoryMetricMap);
        const allDrugGroups = new Set<string>();
        inventoryTopFacilities.forEach((item) => {
            item.groups.forEach((_, group) => allDrugGroups.add(group));
        });

        const stackedBarData = inventoryTopFacilities.map((item) => ({
            facility: item.facility,
            ...Object.fromEntries(item.groups.entries()),
        }));
        const inventoryByFacilityDrugGroup = buildAllFacilityInventoryByDrugGroup(inventoryMetricMap);
        const facilityImportExportInventory = buildFacilityImportExportInventory(
            inventoryMetricMap,
            exportMetricMap,
            importMetricMap
        );

        const topExportByFacility = buildTopStackedBarData(exportMetricMap);
        const topImportTreemap = buildTreemapData(importMetricMap);

        const donutData = [
            { name: "Thuốc BHYT", value: Math.round(bhytValue) },
            { name: "Thuốc Dịch vụ", value: Math.round(dichvuValue) },
        ];

        // 5. Heatmap by address
        const heatmapData = Array.from(addressMap.entries())
            .map(([address, value]) => ({ address, value: Math.round(value) }))
            .sort((a, b) => b.value - a.value);
        const inventoryMapData = Array.from(facilityMap.values())
            .map((item) => ({ ...item, value: Math.round(item.value) }))
            .filter((item) => item.value > 0)
            .sort((a, b) => b.value - a.value);

        return NextResponse.json({
            kpis: {
                totalInventoryValue: Number(totalInventoryValue._sum.thanhTienTonCuoi) || 0,
                domesticRatio: Math.round(domesticRatio * 100) / 100,
                domesticUsageLineRatio: Math.round(domesticUsageLineRatio * 100) / 100,
                domesticUsageLineCount,
                classifiedUsageLineCount,
                distinctDrugCount: distinctDrugCount.length,
            },
            stackedBarData,
            facilityImportExportInventory,
            inventoryByFacilityDrugGroup,
            inventoryDrugGroups: INVENTORY_DRUG_GROUPS,
            drugGroups: Array.from(allDrugGroups),
            donutData,
            topExportByFacility,
            topImportTreemap,
            heatmapData,
            inventoryMapData,
            mapMissingCoordinateCount: mapMissingCoordinateFacilityIds.size,
        });
    } catch (error) {
        console.error("Dashboard overview error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
