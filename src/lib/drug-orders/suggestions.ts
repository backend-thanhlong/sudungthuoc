import {
    DrugOrderLineSourceType,
    DrugOrderStatus,
    Prisma,
    ReportStatus,
} from "@/../prisma/generated/client";
import prisma from "@/lib/prisma";
import { listReportMonthSummaries } from "@/lib/report-submissions";
import { RouteError } from "@/lib/server-authz";
import {
    compareReportMonthsDesc,
    DRUG_ORDER_COMPLETE_SUGGESTION_RULE_VERSION,
    DRUG_ORDER_TARGET_COVERAGE_MONTHS,
    formatQuantityLabel,
    isReportMonthAtOrBefore,
    toNumber,
} from "@/lib/drug-orders/utils";

const APPROVED_OR_PENDING_REPORT_STATUSES = [
    ReportStatus.APPROVED,
    ReportStatus.PENDING,
] as const;

const OPEN_ORDER_STATUSES_FOR_INCOMING = [
    DrugOrderStatus.SUBMITTED,
    DrugOrderStatus.READY_FOR_SHIPMENT,
    DrugOrderStatus.IN_DELIVERY,
] as const;

const SUGGESTION_COMPANY_DRUG_SELECT = {
    id: true,
    companyDrugCode: true,
    companyDrugName: true,
    activeIngredient: true,
    quyCach: true,
    unit: true,
    masterDrugId: true,
    masterDrug: {
        select: {
            id: true,
            maChung: true,
            tenThuoc: true,
            hoatChat: true,
            hamLuong: true,
            dangBaoChe: true,
            soDangKy: true,
            quyCach: true,
            donViTinh: true,
        },
    },
} satisfies Prisma.CompanyDrugSelect;

type SuggestionCompanyDrugRecord = Prisma.CompanyDrugGetPayload<{
    select: typeof SUGGESTION_COMPANY_DRUG_SELECT;
}>;

type SuggestionLineRecord = {
    id: string;
    sourceType: DrugOrderLineSourceType;
    masterDrugId: string | null;
    companyDrugId: string | null;
};

type SuggestionBaseMetrics = {
    selectedMonthCount: number;
    avgMonthlyExport: number;
    latestEndingStock: number;
    monthsOfCover: number | null;
    xntBaseQty: number;
    suggestionReportMonth: string;
    status: DrugOrderSuggestionStatus;
};

export type DrugOrderSuggestionStatus =
    | "OFFICIAL"
    | "PROVISIONAL"
    | "UNLINKED"
    | "INSUFFICIENT_DATA";

export type DrugOrderSuggestionConfidence = "HIGH" | "LOW" | "NONE";

export interface DrugOrderSuggestionResult {
    recommendedQty: number | null;
    xntBaseQty: number | null;
    incomingAcceptedQty: number;
    avgMonthlyExport: number | null;
    latestEndingStock: number | null;
    monthsOfCover: number | null;
    confidence: DrugOrderSuggestionConfidence;
    status: DrugOrderSuggestionStatus;
    statusLabel: string;
    suggestionReportMonth: string | null;
    suggestionRuleVersion: string;
    basisLines: string[];
    suggestionBasis: string;
    isSuppressedDuplicateMasterDrug?: boolean;
}

export interface DrugOrderCatalogSuggestionItem
    extends DrugOrderSuggestionResult {
    sourceType: "COMPANY_DRUG";
    sourceId: string;
    companyDrugId: string;
    companyDrugCode: string;
    companyDrugName: string;
    activeIngredient: string | null;
    quyCach: string | null;
    unit: string | null;
    masterDrugId: string | null;
    masterDrug: SuggestionCompanyDrugRecord["masterDrug"];
}

export interface DrugOrderSuggestionsPayload {
    lineSuggestions: Record<string, DrugOrderSuggestionResult>;
    catalogSuggestions: DrugOrderCatalogSuggestionItem[];
    meta: {
        effectiveReportMonth: string | null;
        coverageTargetMonths: number;
        includeAllCatalog: boolean;
    };
}

function buildStatusLabel(status: DrugOrderSuggestionStatus) {
    switch (status) {
        case "OFFICIAL":
            return "Chính thức";
        case "PROVISIONAL":
            return "Tạm";
        case "UNLINKED":
            return "Chưa liên kết";
        case "INSUFFICIENT_DATA":
            return "Chưa đủ dữ liệu";
    }
}

function buildConfidence(status: DrugOrderSuggestionStatus): DrugOrderSuggestionConfidence {
    if (status === "OFFICIAL") {
        return "HIGH";
    }

    if (status === "PROVISIONAL") {
        return "LOW";
    }

    return "NONE";
}

function buildSuggestionBasisLines(params: {
    monthCount?: number;
    avgMonthlyExport?: number | null;
    latestEndingStock?: number | null;
    suggestionReportMonth?: string | null;
    incomingAcceptedQty?: number;
    status: DrugOrderSuggestionStatus;
}) {
    if (params.status === "UNLINKED") {
        return [
            "Thuốc chưa liên kết thuốc chuẩn nên không thể tính gợi ý.",
        ];
    }

    if (params.status === "INSUFFICIENT_DATA") {
        const lines = ["Chưa đủ dữ liệu XNT để tính gợi ý."];
        if ((params.incomingAcceptedQty || 0) > 0) {
            lines.push(
                `Đang về: ${formatQuantityLabel(params.incomingAcceptedQty || 0)}`
            );
        }
        return lines;
    }

    return [
        `Xuất BQ ${params.monthCount}T: ${formatQuantityLabel(params.avgMonthlyExport || 0)}`,
        `Tồn cuối ${params.suggestionReportMonth}: ${formatQuantityLabel(
            params.latestEndingStock || 0
        )}`,
        `Đang về: ${formatQuantityLabel(params.incomingAcceptedQty || 0)}`,
        `Mức phủ mục tiêu: ${DRUG_ORDER_TARGET_COVERAGE_MONTHS} tháng`,
        params.status === "PROVISIONAL"
            ? "Gợi ý tạm do có dùng dữ liệu chưa duyệt"
            : "Dữ liệu gợi ý đã duyệt",
    ];
}

function buildSuggestionResult(params: {
    status: DrugOrderSuggestionStatus;
    incomingAcceptedQty?: number;
    baseMetrics?: SuggestionBaseMetrics | null;
}) {
    const incomingAcceptedQty = Math.max(0, params.incomingAcceptedQty || 0);

    if (params.status === "UNLINKED") {
        const basisLines = buildSuggestionBasisLines({
            status: "UNLINKED",
            incomingAcceptedQty,
        });

        return {
            recommendedQty: null,
            xntBaseQty: null,
            incomingAcceptedQty,
            avgMonthlyExport: null,
            latestEndingStock: null,
            monthsOfCover: null,
            confidence: buildConfidence("UNLINKED"),
            status: "UNLINKED" as const,
            statusLabel: buildStatusLabel("UNLINKED"),
            suggestionReportMonth: null,
            suggestionRuleVersion: DRUG_ORDER_COMPLETE_SUGGESTION_RULE_VERSION,
            basisLines,
            suggestionBasis: basisLines.join(" | "),
        } satisfies DrugOrderSuggestionResult;
    }

    if (!params.baseMetrics) {
        const basisLines = buildSuggestionBasisLines({
            status: "INSUFFICIENT_DATA",
            incomingAcceptedQty,
        });

        return {
            recommendedQty: null,
            xntBaseQty: null,
            incomingAcceptedQty,
            avgMonthlyExport: null,
            latestEndingStock: null,
            monthsOfCover: null,
            confidence: buildConfidence("INSUFFICIENT_DATA"),
            status: "INSUFFICIENT_DATA" as const,
            statusLabel: buildStatusLabel("INSUFFICIENT_DATA"),
            suggestionReportMonth: null,
            suggestionRuleVersion: DRUG_ORDER_COMPLETE_SUGGESTION_RULE_VERSION,
            basisLines,
            suggestionBasis: basisLines.join(" | "),
        } satisfies DrugOrderSuggestionResult;
    }

    const recommendedQty = Math.max(
        0,
        params.baseMetrics.xntBaseQty - incomingAcceptedQty
    );
    const basisLines = buildSuggestionBasisLines({
        monthCount:
            params.baseMetrics.selectedMonthCount,
        avgMonthlyExport: params.baseMetrics.avgMonthlyExport,
        latestEndingStock: params.baseMetrics.latestEndingStock,
        suggestionReportMonth: params.baseMetrics.suggestionReportMonth,
        incomingAcceptedQty,
        status: params.baseMetrics.status,
    });

    if (basisLines[0].startsWith("Xuất BQ undefinedT")) {
        basisLines[0] = `Xuất BQ: ${formatQuantityLabel(
            params.baseMetrics.avgMonthlyExport
        )}`;
    }

    return {
        recommendedQty,
        xntBaseQty: params.baseMetrics.xntBaseQty,
        incomingAcceptedQty,
        avgMonthlyExport: params.baseMetrics.avgMonthlyExport,
        latestEndingStock: params.baseMetrics.latestEndingStock,
        monthsOfCover: params.baseMetrics.monthsOfCover,
        confidence: buildConfidence(params.baseMetrics.status),
        status: params.baseMetrics.status,
        statusLabel: buildStatusLabel(params.baseMetrics.status),
        suggestionReportMonth: params.baseMetrics.suggestionReportMonth,
        suggestionRuleVersion: DRUG_ORDER_COMPLETE_SUGGESTION_RULE_VERSION,
        basisLines,
        suggestionBasis: basisLines.join(" | "),
    } satisfies DrugOrderSuggestionResult;
}

function suppressDuplicateMasterDrugSuggestion(
    suggestion: DrugOrderSuggestionResult
): DrugOrderSuggestionResult {
    const basisLines = [
        "Thuốc chuẩn này đã xuất hiện ở dòng khác nên hệ thống tắt gợi ý để tránh nhân đôi số lượng.",
    ];

    return {
        ...suggestion,
        recommendedQty: null,
        basisLines,
        suggestionBasis: basisLines.join(" | "),
        isSuppressedDuplicateMasterDrug: true,
    };
}

async function resolveEffectiveReportMonth(params: {
    facilityId: string;
    baseReportMonth: string | null;
}) {
    if (params.baseReportMonth) {
        return params.baseReportMonth;
    }

    const summaries = await listReportMonthSummaries({ facilityId: params.facilityId });
    return summaries[0]?.month || null;
}

async function loadBaseMetricsByMasterDrug(params: {
    facilityId: string;
    masterDrugIds: string[];
    effectiveReportMonth: string | null;
}) {
    const uniqueMasterDrugIds = [...new Set(params.masterDrugIds.filter(Boolean))];
    if (uniqueMasterDrugIds.length === 0) {
        return new Map<string, SuggestionBaseMetrics>();
    }

    const rows = await prisma.inventoryReport.findMany({
        where: {
            facilityId: params.facilityId,
            status: {
                in: [...APPROVED_OR_PENDING_REPORT_STATUSES],
            },
            drugMap: {
                masterDrugId: {
                    in: uniqueMasterDrugIds,
                },
            },
        },
        select: {
            reportMonth: true,
            status: true,
            xuat: true,
            tonCuoi: true,
            drugMap: {
                select: {
                    masterDrugId: true,
                },
            },
        },
    });

    const grouped = new Map<
        string,
        Map<
            string,
            {
                reportMonth: string;
                status: ReportStatus;
                totalExport: number;
                totalEndingStock: number;
            }
        >
    >();

    for (const row of rows) {
        const masterDrugId = row.drugMap.masterDrugId;
        if (!masterDrugId) {
            continue;
        }

        if (
            params.effectiveReportMonth &&
            !isReportMonthAtOrBefore(row.reportMonth, params.effectiveReportMonth)
        ) {
            continue;
        }

        const bucketByMonth = grouped.get(masterDrugId) || new Map();
        const bucket = bucketByMonth.get(row.reportMonth) || {
            reportMonth: row.reportMonth,
            status: row.status,
            totalExport: 0,
            totalEndingStock: 0,
        };

        bucket.status =
            bucket.status === ReportStatus.APPROVED || row.status === ReportStatus.APPROVED
                ? ReportStatus.APPROVED
                : ReportStatus.PENDING;
        bucket.totalExport += toNumber(row.xuat);
        bucket.totalEndingStock += toNumber(row.tonCuoi);

        bucketByMonth.set(row.reportMonth, bucket);
        grouped.set(masterDrugId, bucketByMonth);
    }

    const baseMetricsByMasterDrug = new Map<string, SuggestionBaseMetrics>();

    for (const [masterDrugId, monthsMap] of grouped.entries()) {
        const monthBuckets = Array.from(monthsMap.values()).sort((left, right) =>
            compareReportMonthsDesc(left.reportMonth, right.reportMonth)
        );

        const approvedMonths = monthBuckets.filter(
            (bucket) => bucket.status === ReportStatus.APPROVED
        );
        const pendingMonths = monthBuckets.filter(
            (bucket) => bucket.status === ReportStatus.PENDING
        );

        const selectedBuckets = [
            ...approvedMonths.slice(0, 3),
            ...pendingMonths.slice(0, Math.max(0, 3 - approvedMonths.length)),
        ].sort((left, right) =>
            compareReportMonthsDesc(left.reportMonth, right.reportMonth)
        );

        if (selectedBuckets.length === 0) {
            continue;
        }

        const avgMonthlyExport =
            selectedBuckets.reduce((sum, bucket) => sum + bucket.totalExport, 0) /
            selectedBuckets.length;
        const latestBucket = selectedBuckets[0];
        const xntBaseQty = Math.max(
            0,
            Math.round(
                avgMonthlyExport * DRUG_ORDER_TARGET_COVERAGE_MONTHS -
                    latestBucket.totalEndingStock
            )
        );
        const monthsOfCover =
            avgMonthlyExport > 0
                ? Math.round((latestBucket.totalEndingStock / avgMonthlyExport) * 100) / 100
                : null;

        baseMetricsByMasterDrug.set(masterDrugId, {
            selectedMonthCount: selectedBuckets.length,
            avgMonthlyExport,
            latestEndingStock: latestBucket.totalEndingStock,
            monthsOfCover,
            xntBaseQty,
            suggestionReportMonth: latestBucket.reportMonth,
            status: selectedBuckets.some(
                (bucket) => bucket.status === ReportStatus.PENDING
            )
                ? "PROVISIONAL"
                : "OFFICIAL",
        });
    }

    return baseMetricsByMasterDrug;
}

async function loadIncomingAcceptedQtyByMasterDrug(params: {
    facilityId: string;
    masterDrugIds: string[];
    excludeOrderId?: string | null;
}) {
    const uniqueMasterDrugIds = [...new Set(params.masterDrugIds.filter(Boolean))];
    if (uniqueMasterDrugIds.length === 0) {
        return new Map<string, number>();
    }

    const lines = await prisma.drugOrderLine.findMany({
        where: {
            masterDrugId: {
                in: uniqueMasterDrugIds,
            },
            acceptedQty: {
                gt: 0,
            },
            order: {
                facilityId: params.facilityId,
                status: {
                    in: [...OPEN_ORDER_STATUSES_FOR_INCOMING],
                },
                ...(params.excludeOrderId
                    ? {
                          id: {
                              not: params.excludeOrderId,
                          },
                      }
                    : {}),
            },
        },
        select: {
            masterDrugId: true,
            acceptedQty: true,
            receiptLines: {
                select: {
                    receivedQty: true,
                },
            },
        },
    });

    const incomingByMasterDrug = new Map<string, number>();

    for (const line of lines) {
        const masterDrugId = line.masterDrugId;
        if (!masterDrugId) {
            continue;
        }

        const acceptedQty = toNumber(line.acceptedQty);
        const receivedQty = line.receiptLines.reduce(
            (sum, receiptLine) => sum + toNumber(receiptLine.receivedQty),
            0
        );
        const outstandingQty = Math.max(acceptedQty - receivedQty, 0);

        if (outstandingQty <= 0) {
            continue;
        }

        incomingByMasterDrug.set(
            masterDrugId,
            (incomingByMasterDrug.get(masterDrugId) || 0) + outstandingQty
        );
    }

    return incomingByMasterDrug;
}

function buildMasterDrugSuggestionMap(params: {
    masterDrugIds: string[];
    baseMetricsByMasterDrug: Map<string, SuggestionBaseMetrics>;
    incomingAcceptedQtyByMasterDrug: Map<string, number>;
}) {
    const suggestions = new Map<string, DrugOrderSuggestionResult>();

    for (const masterDrugId of [...new Set(params.masterDrugIds.filter(Boolean))]) {
        const baseMetrics = params.baseMetricsByMasterDrug.get(masterDrugId) || null;
        const incomingAcceptedQty =
            params.incomingAcceptedQtyByMasterDrug.get(masterDrugId) || 0;

        suggestions.set(
            masterDrugId,
            buildSuggestionResult({
                status: baseMetrics?.status || "INSUFFICIENT_DATA",
                incomingAcceptedQty,
                baseMetrics,
            })
        );
    }

    return suggestions;
}

function sortCatalogSuggestions(
    left: DrugOrderCatalogSuggestionItem,
    right: DrugOrderCatalogSuggestionItem
) {
    const leftSuggested = left.recommendedQty ?? -1;
    const rightSuggested = right.recommendedQty ?? -1;
    if (rightSuggested !== leftSuggested) {
        return rightSuggested - leftSuggested;
    }

    const leftCover = left.monthsOfCover ?? Number.POSITIVE_INFINITY;
    const rightCover = right.monthsOfCover ?? Number.POSITIVE_INFINITY;
    if (leftCover !== rightCover) {
        return leftCover - rightCover;
    }

    return left.companyDrugName.localeCompare(right.companyDrugName, "vi");
}

function dedupeCatalogSuggestionsByMasterDrug(
    items: DrugOrderCatalogSuggestionItem[]
) {
    const seenMasterDrugIds = new Set<string>();

    return items.filter((item) => {
        if (!item.masterDrugId) {
            return true;
        }

        if (seenMasterDrugIds.has(item.masterDrugId)) {
            return false;
        }

        seenMasterDrugIds.add(item.masterDrugId);
        return true;
    });
}

export async function buildDrugOrderSuggestionSnapshotMap(params: {
    facilityId: string;
    masterDrugIds: string[];
    baseReportMonth: string | null;
    excludeOrderId?: string | null;
}) {
    const uniqueMasterDrugIds = [...new Set(params.masterDrugIds.filter(Boolean))];
    if (uniqueMasterDrugIds.length === 0) {
        return {
            effectiveReportMonth: await resolveEffectiveReportMonth({
                facilityId: params.facilityId,
                baseReportMonth: params.baseReportMonth,
            }),
            suggestions: new Map<string, DrugOrderSuggestionResult>(),
        };
    }

    const effectiveReportMonth = await resolveEffectiveReportMonth({
        facilityId: params.facilityId,
        baseReportMonth: params.baseReportMonth,
    });

    const [baseMetricsByMasterDrug, incomingAcceptedQtyByMasterDrug] = await Promise.all([
        loadBaseMetricsByMasterDrug({
            facilityId: params.facilityId,
            masterDrugIds: uniqueMasterDrugIds,
            effectiveReportMonth,
        }),
        loadIncomingAcceptedQtyByMasterDrug({
            facilityId: params.facilityId,
            masterDrugIds: uniqueMasterDrugIds,
            excludeOrderId: params.excludeOrderId,
        }),
    ]);

    return {
        effectiveReportMonth,
        suggestions: buildMasterDrugSuggestionMap({
            masterDrugIds: uniqueMasterDrugIds,
            baseMetricsByMasterDrug,
            incomingAcceptedQtyByMasterDrug,
        }),
    };
}

export async function loadFacilityDrugOrderSuggestionsPayload(params: {
    facilityId: string;
    companyId: string;
    baseReportMonth: string | null;
    orderId?: string | null;
    includeAllCatalog?: boolean;
}) {
    let order:
        | {
              id: string;
              companyId: string;
              lines: SuggestionLineRecord[];
              companyDrugIds: string[];
          }
        | null = null;

    const company = await prisma.company.findUnique({
        where: { id: params.companyId },
        select: {
            id: true,
            isActive: true,
        },
    });

    if (!company || !company.isActive) {
        throw new RouteError(400, "Công ty không tồn tại hoặc đã bị vô hiệu hóa");
    }

    if (params.orderId) {
        const existingOrder = await prisma.drugOrder.findFirst({
            where: {
                id: params.orderId,
                facilityId: params.facilityId,
            },
            select: {
                id: true,
                companyId: true,
                lines: {
                    select: {
                        id: true,
                        sourceType: true,
                        masterDrugId: true,
                        companyDrugId: true,
                    },
                },
            },
        });

        if (!existingOrder) {
            throw new RouteError(404, "Đơn đặt hàng không tồn tại");
        }

        if (existingOrder.companyId !== params.companyId) {
            throw new RouteError(400, "Công ty của đơn không khớp với yêu cầu gợi ý");
        }

        order = {
            ...existingOrder,
            companyDrugIds: existingOrder.lines
                .map((line) => line.companyDrugId)
                .filter((value): value is string => Boolean(value)),
        };
    }

    const companyDrugs = await prisma.companyDrug.findMany({
        where: {
            companyId: params.companyId,
            isActive: true,
        },
        select: SUGGESTION_COMPANY_DRUG_SELECT,
    });

    const existingCompanyDrugIds = new Set(
        order?.companyDrugIds || []
    );

    const masterDrugIds = [
        ...new Set(
            [
                ...(order?.lines
                    .map((line) => line.masterDrugId)
                    .filter((value): value is string => Boolean(value)) || []),
                ...companyDrugs
                    .map((drug) => drug.masterDrugId)
                    .filter((value): value is string => Boolean(value)),
            ].filter(Boolean)
        ),
    ];

    const { effectiveReportMonth, suggestions } =
        await buildDrugOrderSuggestionSnapshotMap({
            facilityId: params.facilityId,
            masterDrugIds,
            baseReportMonth: params.baseReportMonth,
            excludeOrderId: params.orderId,
        });

    const existingMasterDrugIds = new Set(
        order?.lines
            .map((line) => line.masterDrugId)
            .filter((value): value is string => Boolean(value)) || []
    );
    const seenLineMasterDrugIds = new Set<string>();
    const lineSuggestions: Record<string, DrugOrderSuggestionResult> = {};
    for (const line of order?.lines || []) {
        if (!line.masterDrugId) {
            lineSuggestions[line.id] = buildSuggestionResult({
                status: "UNLINKED",
            });
            continue;
        }

        const suggestion =
            suggestions.get(line.masterDrugId) ||
            buildSuggestionResult({
                status: "INSUFFICIENT_DATA",
            });

        if (seenLineMasterDrugIds.has(line.masterDrugId)) {
            lineSuggestions[line.id] =
                suppressDuplicateMasterDrugSuggestion(suggestion);
            continue;
        }

        seenLineMasterDrugIds.add(line.masterDrugId);
        lineSuggestions[line.id] = suggestion;
    }

    const includeAllCatalog = params.includeAllCatalog ?? false;
    const catalogSuggestions = companyDrugs
        .filter(
            (drug) =>
                !existingCompanyDrugIds.has(drug.id) &&
                (!drug.masterDrugId ||
                    !existingMasterDrugIds.has(drug.masterDrugId))
        )
        .map((drug) => {
            const suggestion = drug.masterDrugId
                ? suggestions.get(drug.masterDrugId) ||
                  buildSuggestionResult({
                      status: "INSUFFICIENT_DATA",
                  })
                : buildSuggestionResult({
                      status: "UNLINKED",
                  });

            return {
                sourceType: "COMPANY_DRUG" as const,
                sourceId: drug.id,
                companyDrugId: drug.id,
                companyDrugCode: drug.companyDrugCode,
                companyDrugName: drug.companyDrugName,
                activeIngredient: drug.activeIngredient,
                quyCach: drug.quyCach,
                unit: drug.unit,
                masterDrugId: drug.masterDrugId,
                masterDrug: drug.masterDrug,
                ...suggestion,
            } satisfies DrugOrderCatalogSuggestionItem;
        })
        .filter((item) =>
            includeAllCatalog
                ? item.masterDrugId !== null
                : item.recommendedQty !== null && item.recommendedQty > 0
        )
        .sort(sortCatalogSuggestions);

    return {
        lineSuggestions,
        catalogSuggestions: dedupeCatalogSuggestionsByMasterDrug(
            catalogSuggestions
        ),
        meta: {
            effectiveReportMonth,
            coverageTargetMonths: DRUG_ORDER_TARGET_COVERAGE_MONTHS,
            includeAllCatalog,
        },
    } satisfies DrugOrderSuggestionsPayload;
}
