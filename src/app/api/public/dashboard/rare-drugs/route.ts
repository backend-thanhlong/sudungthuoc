import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { compareReportMonths } from "@/lib/report-month";

interface FacilityMapDatum {
    facilityId: string;
    facilityName: string;
    address: string;
    latitude: number;
    longitude: number;
    inventoryValue: number;
    exportValue: number;
}

const isPositiveFlag = (value: string | null | undefined) => {
    const normalized = value
        ?.trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    return normalized === "co" || normalized === "true" || normalized === "1" || normalized === "x";
};

const getDrugLabel = (drug: { maChung: string; tenThuoc: string }) =>
    `${drug.maChung} - ${drug.tenThuoc}`;

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const reportMonth = searchParams.get("reportMonth") || undefined;
    const facilityId = searchParams.get("facilityId") || undefined;

    const reportWhere: any = {
        drugMap: {
            masterDrug: {
                is: {
                    isThuocHiem: true,
                },
            },
        },
    };

    if (reportMonth) {
        reportWhere.reportMonth = reportMonth;
    }

    if (facilityId) {
        reportWhere.facilityId = facilityId;
    }

    try {
        const reports = await prisma.inventoryReport.findMany({
            where: reportWhere,
            select: {
                facilityId: true,
                reportMonth: true,
                xuat: true,
                giaVat: true,
                tonCuoi: true,
                thanhTienTonCuoi: true,
                bhyt: true,
                dichVu: true,
                drugMap: {
                    select: {
                        masterDrug: {
                            select: {
                                id: true,
                                maChung: true,
                                tenThuoc: true,
                                hoatChat: true,
                                donViTinh: true,
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
        });

        let totalExportValue = 0;
        let totalInventoryValue = 0;
        let totalEndingQuantity = 0;
        let bhytValue = 0;
        let serviceValue = 0;

        const facilityMetrics = new Map<string, {
            facilityId: string;
            facilityName: string;
            address: string;
            exportValue: number;
            inventoryValue: number;
            endingQuantity: number;
        }>();
        const drugMetrics = new Map<string, {
            drugId: string;
            drugName: string;
            activeIngredient: string | null;
            unit: string | null;
            inventoryValue: number;
            exportValue: number;
            endingQuantity: number;
        }>();
        const monthlyMetrics = new Map<string, {
            reportMonth: string;
            exportValue: number;
            inventoryValue: number;
        }>();
        const mapMetrics = new Map<string, FacilityMapDatum>();
        const missingCoordinateFacilityIds = new Set<string>();

        reports.forEach((report) => {
            const masterDrug = report.drugMap.masterDrug;
            if (!masterDrug) {
                return;
            }

            const exportValue = Number(report.xuat) * Number(report.giaVat);
            const inventoryValue = Number(report.thanhTienTonCuoi);
            const endingQuantity = Number(report.tonCuoi);
            const facilityName = report.facility?.facilityName || "Unknown";
            const address = report.facility?.address || "Không rõ";
            const latitude = Number(report.facility?.latitude);
            const longitude = Number(report.facility?.longitude);

            totalExportValue += exportValue;
            totalInventoryValue += inventoryValue;
            totalEndingQuantity += endingQuantity;

            if (isPositiveFlag(report.bhyt)) {
                bhytValue += exportValue;
            }

            if (isPositiveFlag(report.dichVu)) {
                serviceValue += exportValue;
            }

            const currentFacility = facilityMetrics.get(report.facilityId);
            facilityMetrics.set(report.facilityId, {
                facilityId: report.facilityId,
                facilityName,
                address,
                exportValue: (currentFacility?.exportValue || 0) + exportValue,
                inventoryValue: (currentFacility?.inventoryValue || 0) + inventoryValue,
                endingQuantity: (currentFacility?.endingQuantity || 0) + endingQuantity,
            });

            const currentDrug = drugMetrics.get(masterDrug.id);
            drugMetrics.set(masterDrug.id, {
                drugId: masterDrug.id,
                drugName: getDrugLabel(masterDrug),
                activeIngredient: masterDrug.hoatChat,
                unit: masterDrug.donViTinh,
                inventoryValue: (currentDrug?.inventoryValue || 0) + inventoryValue,
                exportValue: (currentDrug?.exportValue || 0) + exportValue,
                endingQuantity: (currentDrug?.endingQuantity || 0) + endingQuantity,
            });

            const currentMonth = monthlyMetrics.get(report.reportMonth);
            monthlyMetrics.set(report.reportMonth, {
                reportMonth: report.reportMonth,
                exportValue: (currentMonth?.exportValue || 0) + exportValue,
                inventoryValue: (currentMonth?.inventoryValue || 0) + inventoryValue,
            });

            if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
                const currentMapMetric = mapMetrics.get(report.facilityId);
                mapMetrics.set(report.facilityId, {
                    facilityId: report.facilityId,
                    facilityName,
                    address,
                    latitude,
                    longitude,
                    inventoryValue: (currentMapMetric?.inventoryValue || 0) + inventoryValue,
                    exportValue: (currentMapMetric?.exportValue || 0) + exportValue,
                });
            } else if (inventoryValue > 0) {
                missingCoordinateFacilityIds.add(report.facilityId);
            }
        });

        const facilityExportData = Array.from(facilityMetrics.values())
            .map((item) => ({
                ...item,
                exportValue: Math.round(item.exportValue),
                inventoryValue: Math.round(item.inventoryValue),
                endingQuantity: Math.round(item.endingQuantity),
            }))
            .filter((item) => item.exportValue > 0)
            .sort((a, b) => b.exportValue - a.exportValue || a.facilityName.localeCompare(b.facilityName, "vi"));

        const facilityHeatmapData = Array.from(facilityMetrics.values())
            .map((item) => ({
                ...item,
                exportValue: Math.round(item.exportValue),
                inventoryValue: Math.round(item.inventoryValue),
                endingQuantity: Math.round(item.endingQuantity),
            }))
            .filter((item) => item.inventoryValue > 0)
            .sort((a, b) => b.inventoryValue - a.inventoryValue || a.facilityName.localeCompare(b.facilityName, "vi"));

        const drugInventoryData = Array.from(drugMetrics.values())
            .map((item) => ({
                ...item,
                exportValue: Math.round(item.exportValue),
                inventoryValue: Math.round(item.inventoryValue),
                endingQuantity: Math.round(item.endingQuantity),
            }))
            .filter((item) => item.inventoryValue > 0)
            .sort((a, b) => b.inventoryValue - a.inventoryValue || a.drugName.localeCompare(b.drugName, "vi"));

        const monthlyTrend = Array.from(monthlyMetrics.values())
            .map((item) => ({
                reportMonth: item.reportMonth,
                exportValue: Math.round(item.exportValue),
                inventoryValue: Math.round(item.inventoryValue),
            }))
            .sort((a, b) => compareReportMonths(a.reportMonth, b.reportMonth));

        const facilityMapData = Array.from(mapMetrics.values())
            .map((item) => ({
                ...item,
                inventoryValue: Math.round(item.inventoryValue),
                exportValue: Math.round(item.exportValue),
            }))
            .filter((item) => item.inventoryValue > 0)
            .sort((a, b) => b.inventoryValue - a.inventoryValue || a.facilityName.localeCompare(b.facilityName, "vi"));

        return NextResponse.json({
            kpis: {
                rareDrugCount: drugMetrics.size,
                reportingFacilityCount: facilityMetrics.size,
                totalExportValue: Math.round(totalExportValue),
                totalInventoryValue: Math.round(totalInventoryValue),
                totalEndingQuantity: Math.round(totalEndingQuantity),
            },
            facilityExportData,
            facilityHeatmapData,
            drugInventoryData,
            monthlyTrend,
            insuranceServiceData: [
                { name: "Thuốc BHYT", value: Math.round(bhytValue) },
                { name: "Thuốc Dịch vụ", value: Math.round(serviceValue) },
            ],
            facilityMapData,
            mapMissingCoordinateCount: missingCoordinateFacilityIds.size,
        });
    } catch (error) {
        console.error("Rare drugs dashboard error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
