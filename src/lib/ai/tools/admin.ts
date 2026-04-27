import prisma from "@/lib/prisma";
import type { AIAgentRequest, AIToolResult } from "@/lib/ai/types";
import {
    buildSnapshotMetrics,
    buildSupplyDashboardDataFromMetrics,
    normalizeDemandWindow,
    normalizeSupplyReportRow,
    resolveEffectiveReportMonth,
} from "@/lib/dashboard/supply-risk";

function getRequestedFacilityId(request: AIAgentRequest) {
    return request.context?.facilityId?.trim() || undefined;
}

function getRequestedReportMonth(request: AIAgentRequest) {
    return request.context?.reportMonth?.trim() || undefined;
}

export async function getDashboardOverview(request: AIAgentRequest): Promise<AIToolResult> {
    const facilityId = getRequestedFacilityId(request);
    const reportMonth = getRequestedReportMonth(request);
    const where = {
        ...(facilityId ? { facilityId } : {}),
        ...(reportMonth ? { reportMonth } : {}),
    };

    const [inventoryValue, reportRows, facilities, months] = await Promise.all([
        prisma.inventoryReport.aggregate({
            where,
            _sum: {
                thanhTienTonCuoi: true,
                nhap: true,
                xuat: true,
            },
        }),
        prisma.inventoryReport.count({ where }),
        prisma.user.count({
            where: {
                role: "FACILITY",
                isActive: true,
                ...(facilityId ? { id: facilityId } : {}),
            },
        }),
        prisma.inventoryReport.findMany({
            where,
            select: { reportMonth: true },
            distinct: ["reportMonth"],
            take: 12,
            orderBy: { reportMonth: "desc" },
        }),
    ]);

    return {
        name: "getDashboardOverview",
        status: "success",
        data: {
            scope: facilityId ? "facility" : "all",
            reportMonth: reportMonth || "all",
            activeFacilityCount: facilities,
            reportRows,
            totalEndingInventoryValue: Number(inventoryValue._sum.thanhTienTonCuoi || 0),
            totalImportQty: Number(inventoryValue._sum.nhap || 0),
            totalExportQty: Number(inventoryValue._sum.xuat || 0),
            recentMonths: months.map(month => month.reportMonth),
        },
    };
}

export async function getSupplyRisk(request: AIAgentRequest): Promise<AIToolResult> {
    const facilityId = getRequestedFacilityId(request);
    const selectedReportMonth = getRequestedReportMonth(request);
    const reports = await prisma.inventoryReport.findMany({
        where: facilityId ? { facilityId } : {},
        select: {
            facilityId: true,
            mapId: true,
            tonCuoi: true,
            xuat: true,
            giaVat: true,
            thanhTienTonCuoi: true,
            soQdTrungThau: true,
            tenCongTy: true,
            ngayBatDauHd: true,
            ngayKetThucHd: true,
            bhyt: true,
            dichVu: true,
            reportMonth: true,
            drugMap: {
                select: {
                    tenThuocNoiBo: true,
                    hoatChatNoiBo: true,
                    masterDrug: {
                        select: {
                            tenThuoc: true,
                            hoatChat: true,
                            hamLuong: true,
                            isTrongNuoc: true,
                        },
                    },
                },
            },
            facility: {
                select: {
                    facilityName: true,
                },
            },
        },
    });

    const normalizedReports = reports.map(normalizeSupplyReportRow);
    const effectiveReportMonth = resolveEffectiveReportMonth(normalizedReports, selectedReportMonth);
    const demandWindow = normalizeDemandWindow(String(request.context?.filters?.demandWindow || "3"));
    const metrics = buildSnapshotMetrics(normalizedReports, effectiveReportMonth, demandWindow);
    const supplyData = buildSupplyDashboardDataFromMetrics({
        metrics,
        effectiveReportMonth,
        demandWindow,
    });

    return {
        name: "getSupplyRisk",
        status: "success",
        data: {
            effectiveReportMonth,
            demandWindow,
            stockoutActual: supplyData.stockoutActual.slice(0, 20),
            stockoutForecast: supplyData.stockoutForecast.slice(0, 20),
            deadStockData: supplyData.deadStockData.slice(0, 10),
        },
    };
}

export async function getReportSubmissionStatus(request: AIAgentRequest): Promise<AIToolResult> {
    const reportMonth = getRequestedReportMonth(request);
    const facilities = await prisma.user.findMany({
        where: {
            role: "FACILITY",
            isActive: true,
        },
        select: {
            id: true,
            facilityName: true,
            username: true,
        },
        orderBy: {
            facilityName: "asc",
        },
        take: 300,
    });

    const submissions = reportMonth
        ? await prisma.facilityReportSubmission.findMany({
            where: { reportMonth },
            select: {
                facilityId: true,
                reportedRowCount: true,
                skippedRowCount: true,
                submittedAt: true,
            },
        })
        : [];

    const submittedByFacility = new Map(submissions.map(item => [item.facilityId, item]));
    const missing = facilities
        .filter(facility => !submittedByFacility.has(facility.id))
        .slice(0, 80)
        .map(facility => ({
            facilityId: facility.id,
            facilityName: facility.facilityName || facility.username,
        }));

    return {
        name: "getReportSubmissionStatus",
        status: reportMonth ? "success" : "skipped",
        warning: reportMonth ? undefined : "Chưa có reportMonth nên bỏ qua trạng thái nộp báo cáo",
        data: reportMonth
            ? {
                reportMonth,
                totalFacilities: facilities.length,
                submittedCount: submissions.length,
                missingCount: Math.max(facilities.length - submissions.length, 0),
                missing,
            }
            : undefined,
    };
}

export async function getMappingBacklog(request: AIAgentRequest): Promise<AIToolResult> {
    const facilityId = getRequestedFacilityId(request);
    const where = facilityId ? { facilityId } : {};
    const [pending, waiting, rejected, outOfCatalog] = await Promise.all([
        prisma.facilityDrugMap.count({ where: { ...where, status: "PENDING_MAPPING" } }),
        prisma.facilityDrugMap.count({ where: { ...where, status: "WAITING_APPROVAL" } }),
        prisma.facilityDrugMap.count({ where: { ...where, status: "REJECTED" } }),
        prisma.facilityDrugMap.count({ where: { ...where, isOutOfCatalog: true } }),
    ]);

    return {
        name: "getMappingBacklog",
        status: "success",
        data: {
            scope: facilityId ? "facility" : "all",
            pending,
            waitingApproval: waiting,
            rejected,
            outOfCatalog,
        },
    };
}

export async function getFacilityReportAnomalies(request: AIAgentRequest): Promise<AIToolResult> {
    const facilityId = getRequestedFacilityId(request);
    const reportMonth = getRequestedReportMonth(request);
    const reports = await prisma.inventoryReport.findMany({
        where: {
            ...(facilityId ? { facilityId } : {}),
            ...(reportMonth ? { reportMonth } : {}),
        },
        select: {
            id: true,
            reportMonth: true,
            tonDau: true,
            nhap: true,
            xuat: true,
            tonCuoi: true,
            giaVat: true,
            thanhTienTonCuoi: true,
            facility: { select: { facilityName: true, username: true } },
            drugMap: {
                select: {
                    tenThuocNoiBo: true,
                    masterDrugId: true,
                    masterDrug: { select: { tenThuoc: true } },
                },
            },
        },
        take: 1000,
        orderBy: { updatedAt: "desc" },
    });

    const anomalies = reports.flatMap(report => {
        const tonDau = Number(report.tonDau);
        const nhap = Number(report.nhap);
        const xuat = Number(report.xuat);
        const tonCuoi = Number(report.tonCuoi);
        const expectedTonCuoi = tonDau + nhap - xuat;
        const drugName = report.drugMap.masterDrug?.tenThuoc || report.drugMap.tenThuocNoiBo;
        const base = {
            facility: report.facility.facilityName || report.facility.username,
            reportMonth: report.reportMonth,
            drugName,
        };
        const items = [];
        if (Math.abs(expectedTonCuoi - tonCuoi) > 0.01) {
            items.push({ ...base, type: "BALANCE_MISMATCH", expectedTonCuoi, actualTonCuoi: tonCuoi });
        }
        if (xuat > tonDau + nhap) {
            items.push({ ...base, type: "EXPORT_EXCEEDS_AVAILABLE", tonDau, nhap, xuat });
        }
        if (!report.drugMap.masterDrugId) {
            items.push({ ...base, type: "UNMAPPED_DRUG" });
        }
        if (Number(report.giaVat) === 0 && (tonCuoi > 0 || Number(report.thanhTienTonCuoi) > 0)) {
            items.push({ ...base, type: "ZERO_PRICE_WITH_STOCK" });
        }
        return items;
    }).slice(0, 50);

    return {
        name: "getFacilityReportAnomalies",
        status: "success",
        data: {
            reportMonth: reportMonth || "all",
            anomalyCount: anomalies.length,
            anomalies,
        },
    };
}
