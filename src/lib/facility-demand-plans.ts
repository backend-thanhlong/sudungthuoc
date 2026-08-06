import { randomUUID } from "crypto";
import ExcelJS from "exceljs";
import {
    FacilityDemandPlanStatus,
    MappingStatus,
    Prisma,
    ReportStatus,
} from "@/../prisma/generated/client";
import prisma from "@/lib/prisma";
import { listReportMonthSummaries } from "@/lib/report-submissions";
import { RouteError } from "@/lib/server-authz";
import { buildDrugOrderSuggestionSnapshotMap } from "@/lib/drug-orders/suggestions";
import {
    DRUG_ORDER_SERIALIZABLE_TRANSACTION,
    compareReportMonthsDesc,
    normalizeOptionalText,
    normalizeText,
    parseReportMonthValue,
    toNumber,
} from "@/lib/drug-orders/utils";

const PLAN_SELECT = {
    id: true,
    planNo: true,
    facilityId: true,
    status: true,
    baseReportMonth: true,
    note: true,
    finalizedAt: true,
    createdAt: true,
    updatedAt: true,
    facility: {
        select: {
            id: true,
            username: true,
            facilityName: true,
            facilityCode: true,
        },
    },
    lines: {
        orderBy: { createdAt: "asc" },
        select: {
            id: true,
            mapId: true,
            masterDrugId: true,
            maNoiBoSnapshot: true,
            tenThuocSnapshot: true,
            hoatChatSnapshot: true,
            donViTinhSnapshot: true,
            nhomTcktSnapshot: true,
            maChungSnapshot: true,
            suggestedQty: true,
            rawSuggestedQty: true,
            roundedSuggestedQty: true,
            packageUnitSnapshot: true,
            packageSizeSnapshot: true,
            roundingNote: true,
            finalQty: true,
            suggestionBasis: true,
            suggestionReportMonth: true,
            suggestionRuleVersion: true,
            note: true,
            drugMap: {
                select: {
                    id: true,
                    maNoiBo: true,
                    tenThuocNoiBo: true,
                    hoatChatNoiBo: true,
                    donViTinhNoiBo: true,
                    nhomTckt: true,
                    demandRoundingEnabled: true,
                    demandPackageUnit: true,
                    demandPackageSize: true,
                    isActive: true,
                    status: true,
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
                },
            },
        },
    },
} satisfies Prisma.FacilityDemandPlanSelect;

const CATALOG_SELECT = {
    id: true,
    maNoiBo: true,
    tenThuocNoiBo: true,
    hoatChatNoiBo: true,
    soDangKyNoiBo: true,
    donViTinhNoiBo: true,
    nhomTckt: true,
    giaVat: true,
    bhyt: true,
    dichVu: true,
    soQdTrungThau: true,
    tenCongTy: true,
    ngayBatDauHd: true,
    ngayKetThucHd: true,
    demandRoundingEnabled: true,
    demandPackageUnit: true,
    demandPackageSize: true,
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
} satisfies Prisma.FacilityDrugMapSelect;

type PlanRecord = Prisma.FacilityDemandPlanGetPayload<{
    select: typeof PLAN_SELECT;
}>;

type CatalogRecord = Prisma.FacilityDrugMapGetPayload<{
    select: typeof CATALOG_SELECT;
}>;

type RoundingResult = {
    rawSuggestedQty: number | null;
    roundedSuggestedQty: number | null;
    displaySuggestedQty: number | null;
    packageUnit: string | null;
    packageSize: number | null;
    roundingNote: string | null;
};

const DEMAND_PLAN_ELIGIBLE_MAPPING_STATUSES = [
    MappingStatus.APPROVED,
    MappingStatus.AUTO_MAPPED,
];
const DEMAND_PLAN_EXPORT_HISTORY_STATUSES = [
    ReportStatus.APPROVED,
    ReportStatus.PENDING,
] as const;
const DEMAND_PLAN_EXPORT_HISTORY_MONTH_LIMIT = 6;

export type DemandPlanLineInput = {
    mapId: string;
    finalQty: number;
    note: string | null;
};

function buildFacilityDemandPlanNo(now = new Date()) {
    const isoDate = now.toISOString().slice(0, 10).replace(/-/g, "");
    return `LDT-${isoDate}-${randomUUID().slice(0, 6).toUpperCase()}`;
}

export function parseDemandPlanBaseReportMonth(value: unknown) {
    const normalized = normalizeText(value);
    if (!normalized) {
        return null;
    }

    if (parseReportMonthValue(normalized) === null) {
        throw new RouteError(400, "Tháng gốc XNT phải theo định dạng MM/YYYY");
    }

    return normalized;
}

export function parseDemandPlanExportMonths(values: unknown[]) {
    const months: string[] = [];
    const seen = new Set<string>();

    for (const value of values) {
        const normalized = normalizeText(value);
        if (!normalized || seen.has(normalized)) {
            continue;
        }

        if (parseReportMonthValue(normalized) === null) {
            throw new RouteError(400, "Kỳ xuất phải theo định dạng MM/YYYY");
        }

        months.push(normalized);
        seen.add(normalized);
    }

    if (months.length > DEMAND_PLAN_EXPORT_HISTORY_MONTH_LIMIT) {
        throw new RouteError(
            400,
            `Chỉ được chọn tối đa ${DEMAND_PLAN_EXPORT_HISTORY_MONTH_LIMIT} kỳ xuất`
        );
    }

    return months;
}

export function parseDemandPlanNote(value: unknown) {
    return normalizeOptionalText(value);
}

export function parseDemandPlanLineInputs(value: unknown) {
    if (value === undefined || value === null) {
        return [];
    }

    if (!Array.isArray(value)) {
        throw new RouteError(400, "Danh sách thuốc dự trù không hợp lệ");
    }

    return value.map((line, index) => {
        const mapId =
            typeof line === "object" &&
            line !== null &&
            "mapId" in line
                ? normalizeText(line.mapId)
                : "";
        const finalQtyRaw =
            typeof line === "object" &&
            line !== null &&
            "finalQty" in line
                ? line.finalQty
                : null;
        const finalQty = Number(finalQtyRaw);
        const note =
            typeof line === "object" &&
            line !== null &&
            "note" in line
                ? normalizeOptionalText(line.note)
                : null;

        if (!mapId) {
            throw new RouteError(400, `Thiếu thuốc tại vị trí ${index + 1}`);
        }

        if (!Number.isFinite(finalQty) || finalQty < 0) {
            throw new RouteError(
                400,
                `Số lượng dự trù tại vị trí ${index + 1} phải lớn hơn hoặc bằng 0`
            );
        }

        return { mapId, finalQty, note } satisfies DemandPlanLineInput;
    });
}

function serializePlanSummary(plan: PlanRecord) {
    const totalFinalQty = plan.lines.reduce(
        (sum, line) => sum + toNumber(line.finalQty),
        0
    );

    return {
        id: plan.id,
        planNo: plan.planNo,
        facilityId: plan.facilityId,
        facility: plan.facility,
        status: plan.status,
        baseReportMonth: plan.baseReportMonth,
        note: plan.note,
        finalizedAt: plan.finalizedAt,
        createdAt: plan.createdAt,
        updatedAt: plan.updatedAt,
        lineCount: plan.lines.length,
        totalFinalQty,
    };
}

function serializePlanDetail(plan: PlanRecord) {
    return {
        ...serializePlanSummary(plan),
        permissions: {
            canEdit: plan.status === FacilityDemandPlanStatus.DRAFT,
            canFinalize: plan.status === FacilityDemandPlanStatus.DRAFT,
            canDelete: plan.status === FacilityDemandPlanStatus.DRAFT,
        },
        lines: plan.lines.map((line) => ({
            id: line.id,
            mapId: line.mapId,
            masterDrugId: line.masterDrugId,
            maNoiBoSnapshot: line.maNoiBoSnapshot,
            tenThuocSnapshot: line.tenThuocSnapshot,
            hoatChatSnapshot: line.hoatChatSnapshot,
            donViTinhSnapshot: line.donViTinhSnapshot,
            nhomTcktSnapshot: line.nhomTcktSnapshot,
            maChungSnapshot: line.maChungSnapshot,
            suggestedQty:
                line.suggestedQty === null ? null : toNumber(line.suggestedQty),
            rawSuggestedQty:
                line.rawSuggestedQty === null ? null : toNumber(line.rawSuggestedQty),
            roundedSuggestedQty:
                line.roundedSuggestedQty === null ? null : toNumber(line.roundedSuggestedQty),
            packageUnitSnapshot: line.packageUnitSnapshot,
            packageSizeSnapshot:
                line.packageSizeSnapshot === null
                    ? null
                    : toNumber(line.packageSizeSnapshot),
            roundingNote: line.roundingNote,
            finalQty: toNumber(line.finalQty),
            suggestionBasis: line.suggestionBasis,
            suggestionReportMonth: line.suggestionReportMonth,
            suggestionRuleVersion: line.suggestionRuleVersion,
            note: line.note,
            drugMap: line.drugMap,
        })),
    };
}

function buildDemandRoundingResult(
    item: Pick<CatalogRecord, "demandRoundingEnabled" | "demandPackageUnit" | "demandPackageSize">,
    rawSuggestedQty: number | null
): RoundingResult {
    const packageSize =
        item.demandPackageSize === null ? null : toNumber(item.demandPackageSize);
    const packageUnit = normalizeOptionalText(item.demandPackageUnit);
    const canRound =
        item.demandRoundingEnabled &&
        packageSize !== null &&
        packageSize > 0 &&
        rawSuggestedQty !== null &&
        rawSuggestedQty > 0;

    if (!canRound) {
        return {
            rawSuggestedQty,
            roundedSuggestedQty: null,
            displaySuggestedQty: rawSuggestedQty,
            packageUnit,
            packageSize,
            roundingNote: null,
        };
    }

    const roundedSuggestedQty =
        Math.ceil(rawSuggestedQty / packageSize) * packageSize;
    const roundingNote =
        roundedSuggestedQty > rawSuggestedQty
            ? `Làm tròn từ ${rawSuggestedQty} lên ${roundedSuggestedQty} để đủ 1 ${packageUnit || "quy cách"} = ${packageSize}`
            : `Số lượng đã tròn theo ${packageUnit || "quy cách"} ${packageSize}`;

    return {
        rawSuggestedQty,
        roundedSuggestedQty,
        displaySuggestedQty: roundedSuggestedQty,
        packageUnit,
        packageSize,
        roundingNote,
    };
}

function serializeCatalogItem(
    item: CatalogRecord,
    suggestion: Awaited<ReturnType<typeof buildDrugOrderSuggestionSnapshotMap>>["suggestions"] extends Map<string, infer T> ? T | undefined : never,
    exportHistory: Record<string, number> = {}
) {
    const rounding = buildDemandRoundingResult(
        item,
        suggestion?.recommendedQty ?? null
    );

    return {
        id: item.id,
        maNoiBo: item.maNoiBo,
        tenThuocNoiBo: item.tenThuocNoiBo,
        hoatChatNoiBo: item.hoatChatNoiBo,
        soDangKyNoiBo: item.soDangKyNoiBo,
        donViTinhNoiBo: item.donViTinhNoiBo,
        nhomTckt: item.nhomTckt,
        giaVat: toNumber(item.giaVat),
        bhyt: item.bhyt,
        dichVu: item.dichVu,
        soQdTrungThau: item.soQdTrungThau,
        tenCongTy: item.tenCongTy,
        ngayBatDauHd: item.ngayBatDauHd,
        ngayKetThucHd: item.ngayKetThucHd,
        demandRoundingEnabled: item.demandRoundingEnabled,
        demandPackageUnit: item.demandPackageUnit,
        demandPackageSize:
            item.demandPackageSize === null ? null : toNumber(item.demandPackageSize),
        masterDrugId: item.masterDrugId,
        masterDrug: item.masterDrug,
        suggestedQty: rounding.displaySuggestedQty,
        rawSuggestedQty: rounding.rawSuggestedQty,
        roundedSuggestedQty: rounding.roundedSuggestedQty,
        packageUnit: rounding.packageUnit,
        packageSize: rounding.packageSize,
        roundingNote: rounding.roundingNote,
        exportHistory,
        suggestionBasis: suggestion?.suggestionBasis ?? null,
        suggestionReportMonth: suggestion?.suggestionReportMonth ?? null,
        suggestionRuleVersion: suggestion?.suggestionRuleVersion ?? null,
    };
}

async function loadPlanOrThrow(planId: string) {
    const plan = await prisma.facilityDemandPlan.findUnique({
        where: { id: planId },
        select: PLAN_SELECT,
    });

    if (!plan) {
        throw new RouteError(404, "Dự trù không tồn tại");
    }

    return plan;
}

function assertFacilityPlanAccess(plan: PlanRecord, facilityId: string) {
    if (plan.facilityId !== facilityId) {
        throw new RouteError(403, "Forbidden");
    }
}

async function buildLineCreateInputs(params: {
    facilityId: string;
    baseReportMonth: string | null;
    lines: DemandPlanLineInput[];
}) {
    const duplicateMapIds = new Set<string>();
    const seenMapIds = new Set<string>();
    for (const line of params.lines) {
        if (seenMapIds.has(line.mapId)) {
            duplicateMapIds.add(line.mapId);
        }
        seenMapIds.add(line.mapId);
    }

    if (duplicateMapIds.size > 0) {
        throw new RouteError(400, "Dự trù không được chứa thuốc trùng lặp");
    }

    const mapIds = [...seenMapIds];
    if (mapIds.length === 0) {
        return [];
    }

    const maps = await prisma.facilityDrugMap.findMany({
        where: {
            id: { in: mapIds },
            facilityId: params.facilityId,
            isActive: true,
            status: { in: DEMAND_PLAN_ELIGIBLE_MAPPING_STATUSES },
            masterDrugId: { not: null },
        },
        select: CATALOG_SELECT,
    });

    if (maps.length !== mapIds.length) {
        throw new RouteError(
            400,
            "Có thuốc không thuộc danh mục ánh xạ đã duyệt của đơn vị"
        );
    }

    const mapById = new Map(maps.map((item) => [item.id, item]));
    const masterDrugIds = maps
        .map((item) => item.masterDrugId)
        .filter((value): value is string => Boolean(value));
    const { suggestions } = await buildDrugOrderSuggestionSnapshotMap({
        facilityId: params.facilityId,
        masterDrugIds,
        baseReportMonth: params.baseReportMonth,
        includeIncomingAcceptedQty: false,
    });

    return params.lines.map((line) => {
        const map = mapById.get(line.mapId);
        if (!map || !map.masterDrugId || !map.masterDrug) {
            throw new RouteError(400, "Thuốc dự trù không hợp lệ");
        }

        const suggestion = suggestions.get(map.masterDrugId);
        const rounding = buildDemandRoundingResult(
            map,
            suggestion?.recommendedQty ?? null
        );

        return {
            mapId: map.id,
            masterDrugId: map.masterDrugId,
            maNoiBoSnapshot: map.maNoiBo,
            tenThuocSnapshot: map.tenThuocNoiBo,
            hoatChatSnapshot: map.hoatChatNoiBo || map.masterDrug.hoatChat,
            donViTinhSnapshot: map.donViTinhNoiBo || map.masterDrug.donViTinh,
            nhomTcktSnapshot: map.nhomTckt,
            maChungSnapshot: map.masterDrug.maChung,
            suggestedQty: rounding.displaySuggestedQty,
            rawSuggestedQty: rounding.rawSuggestedQty,
            roundedSuggestedQty: rounding.roundedSuggestedQty,
            packageUnitSnapshot: rounding.packageUnit,
            packageSizeSnapshot: rounding.packageSize,
            roundingNote: rounding.roundingNote,
            finalQty: line.finalQty,
            suggestionBasis: suggestion?.suggestionBasis ?? null,
            suggestionReportMonth: suggestion?.suggestionReportMonth ?? null,
            suggestionRuleVersion: suggestion?.suggestionRuleVersion ?? null,
            note: line.note,
        } satisfies Omit<Prisma.FacilityDemandPlanLineCreateManyInput, "planId">;
    });
}

export async function loadFacilityDemandPlanListPayload(facilityId: string) {
    const [plans, reportMonths] = await Promise.all([
        prisma.facilityDemandPlan.findMany({
            where: { facilityId },
            select: PLAN_SELECT,
            orderBy: { createdAt: "desc" },
        }),
        listReportMonthSummaries({ facilityId }),
    ]);

    return {
        plans: plans.map(serializePlanSummary),
        reportMonths: reportMonths.map((summary) => summary.month),
    };
}

export async function loadFacilityDemandPlanDetailPayload(params: {
    facilityId: string;
    planId: string;
}) {
    const plan = await loadPlanOrThrow(params.planId);
    assertFacilityPlanAccess(plan, params.facilityId);
    return { plan: serializePlanDetail(plan) };
}

export async function loadAdminDemandPlanListPayload(searchParams: URLSearchParams) {
    const facilityId = normalizeText(searchParams.get("facilityId"));
    const status = normalizeText(searchParams.get("status"));
    const baseReportMonth = normalizeText(searchParams.get("baseReportMonth"));

    const where: Prisma.FacilityDemandPlanWhereInput = {
        ...(facilityId ? { facilityId } : {}),
        ...(status === FacilityDemandPlanStatus.DRAFT ||
        status === FacilityDemandPlanStatus.FINALIZED
            ? { status }
            : {}),
        ...(baseReportMonth ? { baseReportMonth } : {}),
    };

    const [plans, facilities] = await Promise.all([
        prisma.facilityDemandPlan.findMany({
            where,
            select: PLAN_SELECT,
            orderBy: { createdAt: "desc" },
        }),
        prisma.user.findMany({
            where: { role: "FACILITY", isActive: true },
            select: {
                id: true,
                username: true,
                facilityName: true,
                facilityCode: true,
            },
            orderBy: [{ facilityName: "asc" }, { username: "asc" }],
        }),
    ]);

    return {
        plans: plans.map(serializePlanSummary),
        facilities,
    };
}

export async function loadAdminDemandPlanDetailPayload(planId: string) {
    const plan = await loadPlanOrThrow(planId);
    return { plan: serializePlanDetail(plan) };
}

export async function loadFacilityDemandPlanCatalogPayload(params: {
    facilityId: string;
    baseReportMonth: string | null;
    companyName?: string | null;
    exportMonths?: string[];
}) {
    const baseWhere = {
        facilityId: params.facilityId,
        isActive: true,
        demandPlanningLocked: false,
        status: { in: DEMAND_PLAN_ELIGIBLE_MAPPING_STATUSES },
        masterDrugId: { not: null },
    } satisfies Prisma.FacilityDrugMapWhereInput;
    const companyName = normalizeOptionalText(params.companyName);
    const [items, companyRows] = await Promise.all([
        prisma.facilityDrugMap.findMany({
            where: {
                ...baseWhere,
                ...(companyName ? { tenCongTy: companyName } : {}),
            },
            select: CATALOG_SELECT,
            orderBy: [
                { tenThuocNoiBo: "asc" },
                { maNoiBo: "asc" },
            ],
        }),
        prisma.facilityDrugMap.findMany({
            where: {
                ...baseWhere,
                tenCongTy: { not: null },
            },
            select: { tenCongTy: true },
            distinct: ["tenCongTy"],
            orderBy: { tenCongTy: "asc" },
        }),
    ]);
    const companyOptions = companyRows
        .map((row) => normalizeOptionalText(row.tenCongTy))
        .filter((value): value is string => Boolean(value));

    const masterDrugIds = items
        .map((item) => item.masterDrugId)
        .filter((value): value is string => Boolean(value));
    const { effectiveReportMonth, suggestions } =
        await buildDrugOrderSuggestionSnapshotMap({
            facilityId: params.facilityId,
            masterDrugIds,
            baseReportMonth: params.baseReportMonth,
            includeIncomingAcceptedQty: false,
        });
    const exportMonths = params.exportMonths || [];
    const exportHistoryByMapId = new Map<string, Record<string, number>>();

    if (items.length > 0 && exportMonths.length > 0) {
        const exportRows = await prisma.inventoryReport.findMany({
            where: {
                facilityId: params.facilityId,
                mapId: { in: items.map((item) => item.id) },
                reportMonth: { in: exportMonths },
                status: { in: [...DEMAND_PLAN_EXPORT_HISTORY_STATUSES] },
            },
            select: {
                mapId: true,
                reportMonth: true,
                xuat: true,
            },
        });

        for (const row of exportRows) {
            const history = exportHistoryByMapId.get(row.mapId) || {};
            history[row.reportMonth] = (history[row.reportMonth] || 0) + toNumber(row.xuat);
            exportHistoryByMapId.set(row.mapId, history);
        }
    }

    return {
        items: items.map((item) =>
            serializeCatalogItem(
                item,
                item.masterDrugId ? suggestions.get(item.masterDrugId) : undefined,
                exportHistoryByMapId.get(item.id) || {}
            )
        ),
        meta: {
            effectiveReportMonth,
            selectedCompanyName: companyName,
        },
        companyOptions,
    };
}

export async function loadFacilityDemandPlanXntHistoryPayload(params: {
    facilityId: string;
    mapId: string;
}) {
    const mapId = normalizeText(params.mapId);
    if (!mapId) {
        throw new RouteError(400, "Thiếu thuốc cần xem lịch sử XNT");
    }

    const map = await prisma.facilityDrugMap.findFirst({
        where: {
            id: mapId,
            facilityId: params.facilityId,
        },
        select: {
            id: true,
            maNoiBo: true,
            tenThuocNoiBo: true,
        },
    });

    if (!map) {
        throw new RouteError(404, "Thuốc không thuộc đơn vị hiện tại");
    }

    const rows = await prisma.inventoryReport.findMany({
        where: {
            facilityId: params.facilityId,
            mapId,
            status: { in: [...DEMAND_PLAN_EXPORT_HISTORY_STATUSES] },
        },
        select: {
            reportMonth: true,
            tonDau: true,
            nhap: true,
            xuat: true,
            tonCuoi: true,
        },
    });

    const history = rows
        .sort((left, right) =>
            compareReportMonthsDesc(left.reportMonth, right.reportMonth)
        )
        .slice(0, DEMAND_PLAN_EXPORT_HISTORY_MONTH_LIMIT)
        .map((row) => ({
            reportMonth: row.reportMonth,
            tonDau: toNumber(row.tonDau),
            nhap: toNumber(row.nhap),
            xuat: toNumber(row.xuat),
            tonCuoi: toNumber(row.tonCuoi),
        }));

    return {
        map,
        history,
    };
}

export async function createFacilityDemandPlan(params: {
    facilityId: string;
    baseReportMonth: string | null;
    note: string | null;
    lines: DemandPlanLineInput[];
}) {
    const lineInputs = await buildLineCreateInputs({
        facilityId: params.facilityId,
        baseReportMonth: params.baseReportMonth,
        lines: params.lines,
    });

    const plan = await prisma.$transaction(async (tx) => {
        const created = await tx.facilityDemandPlan.create({
            data: {
                planNo: buildFacilityDemandPlanNo(),
                facilityId: params.facilityId,
                baseReportMonth: params.baseReportMonth,
                note: params.note,
                lines: {
                    createMany: {
                        data: lineInputs,
                    },
                },
            },
            select: { id: true },
        });

        return tx.facilityDemandPlan.findUniqueOrThrow({
            where: { id: created.id },
            select: PLAN_SELECT,
        });
    }, DRUG_ORDER_SERIALIZABLE_TRANSACTION);

    return { plan: serializePlanDetail(plan) };
}

export async function updateFacilityDemandPlan(params: {
    facilityId: string;
    planId: string;
    baseReportMonth: string | null;
    note: string | null;
    lines: DemandPlanLineInput[];
}) {
    const existing = await loadPlanOrThrow(params.planId);
    assertFacilityPlanAccess(existing, params.facilityId);

    if (existing.status !== FacilityDemandPlanStatus.DRAFT) {
        throw new RouteError(400, "Dự trù đã chốt nên không thể chỉnh sửa");
    }

    const lineInputs = await buildLineCreateInputs({
        facilityId: params.facilityId,
        baseReportMonth: params.baseReportMonth,
        lines: params.lines,
    });

    const plan = await prisma.$transaction(async (tx) => {
        await tx.facilityDemandPlanLine.deleteMany({
            where: { planId: params.planId },
        });
        await tx.facilityDemandPlan.update({
            where: { id: params.planId },
            data: {
                baseReportMonth: params.baseReportMonth,
                note: params.note,
                lines: {
                    createMany: {
                        data: lineInputs,
                    },
                },
            },
            select: { id: true },
        });

        return tx.facilityDemandPlan.findUniqueOrThrow({
            where: { id: params.planId },
            select: PLAN_SELECT,
        });
    }, DRUG_ORDER_SERIALIZABLE_TRANSACTION);

    return { plan: serializePlanDetail(plan) };
}

export async function deleteFacilityDemandPlan(params: {
    facilityId: string;
    planId: string;
}) {
    const existing = await loadPlanOrThrow(params.planId);
    assertFacilityPlanAccess(existing, params.facilityId);

    if (existing.status !== FacilityDemandPlanStatus.DRAFT) {
        throw new RouteError(400, "Dự trù đã chốt nên không thể xóa");
    }

    await prisma.facilityDemandPlan.delete({ where: { id: params.planId } });
    return { ok: true };
}

export async function finalizeFacilityDemandPlan(params: {
    facilityId: string;
    planId: string;
}) {
    const existing = await loadPlanOrThrow(params.planId);
    assertFacilityPlanAccess(existing, params.facilityId);

    if (existing.status !== FacilityDemandPlanStatus.DRAFT) {
        throw new RouteError(400, "Dự trù đã được chốt");
    }

    if (existing.lines.length === 0) {
        throw new RouteError(400, "Dự trù cần có ít nhất một dòng thuốc");
    }

    if (existing.lines.some((line) => toNumber(line.finalQty) <= 0)) {
        throw new RouteError(
            400,
            "Tất cả dòng thuốc cần có số lượng dự trù lớn hơn 0 trước khi chốt"
        );
    }

    const plan = await prisma.facilityDemandPlan.update({
        where: { id: params.planId },
        data: {
            status: FacilityDemandPlanStatus.FINALIZED,
            finalizedAt: new Date(),
        },
        select: PLAN_SELECT,
    });

    return { plan: serializePlanDetail(plan) };
}

const EXPORT_COLUMNS = [
    { header: "STT", key: "stt", width: 6 },
    { header: "Mã nội bộ", key: "maNoiBo", width: 16 },
    { header: "Mã chung", key: "maChung", width: 16 },
    { header: "Tên thuốc", key: "tenThuoc", width: 34 },
    { header: "Hoạt chất", key: "hoatChat", width: 24 },
    { header: "Đơn vị", key: "donViTinh", width: 12 },
    { header: "Nhóm TCKT", key: "nhomTckt", width: 12 },
    { header: "SL gợi ý XNT", key: "rawSuggestedQty", width: 14 },
    { header: "SL đề xuất", key: "suggestedQty", width: 12 },
    { header: "Quy cách dự trù", key: "packageRule", width: 18 },
    { header: "SL dự trù", key: "finalQty", width: 12 },
    { header: "Tháng gợi ý", key: "suggestionReportMonth", width: 14 },
    { header: "Cơ sở gợi ý", key: "suggestionBasis", width: 52 },
    { header: "Ghi chú làm tròn", key: "roundingNote", width: 44 },
    { header: "Ghi chú", key: "note", width: 28 },
] as const;

export async function buildDemandPlanExportWorkbook(
    planId: string,
    facilityId?: string
) {
    const plan = await loadPlanOrThrow(planId);

    if (facilityId && plan.facilityId !== facilityId) {
        throw new RouteError(403, "Forbidden");
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "sudungthuoc";
    workbook.created = new Date();
    workbook.modified = new Date();

    const infoSheet = workbook.addWorksheet("ThongTin");
    infoSheet.columns = [
        { header: "Trường", key: "field", width: 24 },
        { header: "Giá trị", key: "value", width: 80 },
    ];
    infoSheet.addRows([
        { field: "Số dự trù", value: plan.planNo },
        {
            field: "Cơ sở",
            value:
                plan.facility.facilityName ||
                plan.facility.facilityCode ||
                plan.facility.username,
        },
        { field: "Trạng thái", value: plan.status },
        { field: "Tháng gốc XNT", value: plan.baseReportMonth || "" },
        { field: "Ngày chốt", value: plan.finalizedAt?.toISOString() || "" },
        { field: "Ghi chú", value: plan.note || "" },
    ]);

    const dataSheet = workbook.addWorksheet("DuTru");
    dataSheet.columns = [...EXPORT_COLUMNS];
    dataSheet.addRows(
        plan.lines.map((line, index) => ({
            stt: index + 1,
            maNoiBo: line.maNoiBoSnapshot,
            maChung: line.maChungSnapshot || "",
            tenThuoc: line.tenThuocSnapshot,
            hoatChat: line.hoatChatSnapshot || "",
            donViTinh: line.donViTinhSnapshot || "",
            nhomTckt: line.nhomTcktSnapshot || "",
            rawSuggestedQty:
                line.rawSuggestedQty === null
                    ? line.suggestedQty === null
                        ? ""
                        : toNumber(line.suggestedQty)
                    : toNumber(line.rawSuggestedQty),
            suggestedQty:
                line.suggestedQty === null ? "" : toNumber(line.suggestedQty),
            packageRule:
                line.packageUnitSnapshot && line.packageSizeSnapshot !== null
                    ? `1 ${line.packageUnitSnapshot} = ${toNumber(line.packageSizeSnapshot)}`
                    : "",
            finalQty: toNumber(line.finalQty),
            suggestionReportMonth: line.suggestionReportMonth || "",
            suggestionBasis: line.suggestionBasis || "",
            roundingNote: line.roundingNote || "",
            note: line.note || "",
        }))
    );

    for (const worksheet of [infoSheet, dataSheet]) {
        worksheet.views = [{ state: "frozen", ySplit: 1 }];
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).alignment = {
            vertical: "middle",
            horizontal: "center",
            wrapText: true,
        };
        worksheet.eachRow((row) => {
            row.eachCell((cell) => {
                cell.alignment = { vertical: "middle", wrapText: true };
                cell.border = {
                    top: { style: "thin", color: { argb: "FFD1D5DB" } },
                    left: { style: "thin", color: { argb: "FFD1D5DB" } },
                    bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
                    right: { style: "thin", color: { argb: "FFD1D5DB" } },
                };
            });
        });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return {
        plan,
        buffer,
        fileName: `${plan.planNo}.xlsx`,
    };
}
