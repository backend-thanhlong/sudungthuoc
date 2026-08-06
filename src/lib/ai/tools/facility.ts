import type { ActiveSessionContext } from "@/lib/server-authz";
import prisma from "@/lib/prisma";
import type { AIAgentRequest, AIToolResult } from "@/lib/ai/types";
import {
    buildSnapshotMetrics,
    buildSupplyDashboardDataFromMetrics,
    normalizeDemandWindow,
    normalizeSupplyReportRow,
    resolveEffectiveReportMonth,
} from "@/lib/dashboard/supply-risk";

function getRequestedReportMonth(request: AIAgentRequest) {
    return request.context?.reportMonth?.trim() || undefined;
}

export async function getMyReportSummary(
    sessionContext: ActiveSessionContext,
    request: AIAgentRequest
): Promise<AIToolResult> {
    const facilityId = sessionContext.user.id;
    const reportMonth = getRequestedReportMonth(request);
    const where = {
        facilityId,
        ...(reportMonth ? { reportMonth } : {}),
    };

    const [aggregate, rowCount, latestSubmission] = await Promise.all([
        prisma.inventoryReport.aggregate({
            where,
            _sum: {
                tonDau: true,
                nhap: true,
                xuat: true,
                tonCuoi: true,
                thanhTienTonCuoi: true,
            },
        }),
        prisma.inventoryReport.count({ where }),
        prisma.facilityReportSubmission.findFirst({
            where: {
                facilityId,
                ...(reportMonth ? { reportMonth } : {}),
            },
            orderBy: { submittedAt: "desc" },
            select: {
                reportMonth: true,
                submittedAt: true,
                reportedRowCount: true,
                skippedRowCount: true,
            },
        }),
    ]);

    return {
        name: "getMyReportSummary",
        status: "success",
        data: {
            facilityName: sessionContext.user.facilityName || sessionContext.user.username,
            reportMonth: reportMonth || latestSubmission?.reportMonth || "all",
            rowCount,
            submittedAt: latestSubmission?.submittedAt || null,
            reportedRowCount: latestSubmission?.reportedRowCount || null,
            skippedRowCount: latestSubmission?.skippedRowCount || null,
            totals: {
                tonDau: Number(aggregate._sum.tonDau || 0),
                nhap: Number(aggregate._sum.nhap || 0),
                xuat: Number(aggregate._sum.xuat || 0),
                tonCuoi: Number(aggregate._sum.tonCuoi || 0),
                thanhTienTonCuoi: Number(aggregate._sum.thanhTienTonCuoi || 0),
            },
        },
    };
}

export async function getMyReportAnomalies(
    sessionContext: ActiveSessionContext,
    request: AIAgentRequest
): Promise<AIToolResult> {
    const facilityId = sessionContext.user.id;
    const reportMonth = getRequestedReportMonth(request);
    const reports = await prisma.inventoryReport.findMany({
        where: {
            facilityId,
            ...(reportMonth ? { reportMonth } : {}),
        },
        select: {
            reportMonth: true,
            tonDau: true,
            nhap: true,
            nhapHoanTra: true,
            xuat: true,
            tonCuoi: true,
            giaVat: true,
            thanhTienTonCuoi: true,
            drugMap: {
                select: {
                    maNoiBo: true,
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
        const nhapHoanTra = Number(report.nhapHoanTra);
        const xuat = Number(report.xuat);
        const tonCuoi = Number(report.tonCuoi);
        const expectedTonCuoi = tonDau + nhap + nhapHoanTra - xuat;
        const drugName = report.drugMap.masterDrug?.tenThuoc || report.drugMap.tenThuocNoiBo;
        const base = {
            reportMonth: report.reportMonth,
            maNoiBo: report.drugMap.maNoiBo,
            drugName,
        };
        const items = [];
        if (Math.abs(expectedTonCuoi - tonCuoi) > 0.01) {
            items.push({ ...base, type: "BALANCE_MISMATCH", expectedTonCuoi, actualTonCuoi: tonCuoi });
        }
        if (xuat > tonDau + nhap + nhapHoanTra) {
            items.push({ ...base, type: "EXPORT_EXCEEDS_AVAILABLE", tonDau, nhap, nhapHoanTra, xuat });
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
        name: "getMyReportAnomalies",
        status: "success",
        data: {
            reportMonth: reportMonth || "all",
            anomalyCount: anomalies.length,
            anomalies,
        },
    };
}

export async function getMyMappingIssues(sessionContext: ActiveSessionContext): Promise<AIToolResult> {
    const mappings = await prisma.facilityDrugMap.findMany({
        where: { facilityId: sessionContext.user.id },
        select: {
            id: true,
            maNoiBo: true,
            tenThuocNoiBo: true,
            hoatChatNoiBo: true,
            soDangKyNoiBo: true,
            donViTinhNoiBo: true,
            status: true,
            adminNote: true,
            isOutOfCatalog: true,
            masterDrugId: true,
        },
        orderBy: { updatedAt: "desc" },
        take: 500,
    });

    const missingInfo = mappings
        .filter(mapping => !mapping.hoatChatNoiBo || !mapping.soDangKyNoiBo || !mapping.donViTinhNoiBo)
        .slice(0, 30)
        .map(mapping => ({
            maNoiBo: mapping.maNoiBo,
            tenThuocNoiBo: mapping.tenThuocNoiBo,
            missing: [
                !mapping.hoatChatNoiBo ? "hoatChatNoiBo" : null,
                !mapping.soDangKyNoiBo ? "soDangKyNoiBo" : null,
                !mapping.donViTinhNoiBo ? "donViTinhNoiBo" : null,
            ].filter(Boolean),
            status: mapping.status,
        }));

    const rejected = mappings
        .filter(mapping => mapping.status === "REJECTED")
        .slice(0, 30)
        .map(mapping => ({
            maNoiBo: mapping.maNoiBo,
            tenThuocNoiBo: mapping.tenThuocNoiBo,
            adminNote: mapping.adminNote,
        }));

    return {
        name: "getMyMappingIssues",
        status: "success",
        data: {
            total: mappings.length,
            pending: mappings.filter(mapping => mapping.status === "PENDING_MAPPING").length,
            waitingApproval: mappings.filter(mapping => mapping.status === "WAITING_APPROVAL").length,
            approved: mappings.filter(mapping => mapping.status === "APPROVED").length,
            rejected: mappings.filter(mapping => mapping.status === "REJECTED").length,
            outOfCatalog: mappings.filter(mapping => mapping.isOutOfCatalog).length,
            missingInfo,
            rejectedRows: rejected,
        },
    };
}

export async function getMySupplyRisks(
    sessionContext: ActiveSessionContext,
    request: AIAgentRequest
): Promise<AIToolResult> {
    const selectedReportMonth = getRequestedReportMonth(request);
    const reports = await prisma.inventoryReport.findMany({
        where: { facilityId: sessionContext.user.id },
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
        name: "getMySupplyRisks",
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
