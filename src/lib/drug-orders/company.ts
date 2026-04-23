import {
    DrugOrderLineStatus,
    DrugOrderStatus,
    DrugOrderShipmentStatus,
    MappingStatus,
    Prisma,
} from "@/../prisma/generated/client";
import prisma from "@/lib/prisma";
import { RouteError } from "@/lib/server-authz";
import {
    normalizeOptionalText,
    normalizeText,
    toNumber,
} from "@/lib/drug-orders/utils";

const MAPPED_MASTER_DRUG_STATUSES = [
    MappingStatus.APPROVED,
    MappingStatus.AUTO_MAPPED,
] as const;

type DbClient = typeof prisma | Prisma.TransactionClient;

const FACILITY_OPTION_SELECT = {
    id: true,
    facilityName: true,
    facilityCode: true,
} satisfies Prisma.UserSelect;

const MASTER_DRUG_SELECT = {
    id: true,
    maChung: true,
    tenThuoc: true,
    hoatChat: true,
    hamLuong: true,
    dangBaoChe: true,
    soDangKy: true,
    quyCach: true,
    donViTinh: true,
} satisfies Prisma.MasterDrugSelect;

const COMPANY_DRUG_SELECT = {
    id: true,
    companyDrugCode: true,
    companyDrugName: true,
    activeIngredient: true,
    quyCach: true,
    unit: true,
    isActive: true,
    masterDrugId: true,
    masterDrug: {
        select: MASTER_DRUG_SELECT,
    },
} satisfies Prisma.CompanyDrugSelect;

const COMPANY_DRUG_CATALOG_SELECT = {
    ...COMPANY_DRUG_SELECT,
    _count: {
        select: {
            drugOrderLines: true,
        },
    },
} satisfies Prisma.CompanyDrugSelect;

const ORDER_SUMMARY_SELECT = {
    id: true,
    orderNo: true,
    facilityId: true,
    status: true,
    baseReportMonth: true,
    note: true,
    submittedAt: true,
    closedAt: true,
    createdAt: true,
    updatedAt: true,
    facility: {
        select: FACILITY_OPTION_SELECT,
    },
    lines: {
        select: {
            requestedQty: true,
            acceptedQty: true,
            lineStatus: true,
            shipmentLines: {
                select: {
                    shippedQty: true,
                },
            },
        },
    },
} satisfies Prisma.DrugOrderSelect;

const ORDER_DETAIL_SELECT = {
    id: true,
    orderNo: true,
    facilityId: true,
    companyId: true,
    status: true,
    baseReportMonth: true,
    note: true,
    submittedAt: true,
    closedAt: true,
    createdAt: true,
    updatedAt: true,
    facility: {
        select: FACILITY_OPTION_SELECT,
    },
    lines: {
        orderBy: { createdAt: "asc" },
        select: {
            id: true,
            sourceType: true,
            masterDrugId: true,
            companyDrugId: true,
            displayName: true,
            unit: true,
            requestedQty: true,
            acceptedQty: true,
            suggestedQty: true,
            lineStatus: true,
            companyResponseReason: true,
            suggestionBasis: true,
            suggestionReportMonth: true,
            suggestionRuleVersion: true,
            masterDrug: {
                select: MASTER_DRUG_SELECT,
            },
            companyDrug: {
                select: COMPANY_DRUG_SELECT,
            },
            shipmentLines: {
                orderBy: [
                    { shipment: { shipmentNo: "asc" } },
                    { createdAt: "asc" },
                ],
                select: {
                    id: true,
                    shippedQty: true,
                    reason: true,
                    shipmentId: true,
                    shipment: {
                        select: {
                            id: true,
                            shipmentNo: true,
                            shippedAt: true,
                            status: true,
                        },
                    },
                    receiptLines: {
                        select: {
                            receivedQty: true,
                        },
                    },
                },
            },
            receiptLines: {
                select: {
                    receivedQty: true,
                },
            },
        },
    },
    shipments: {
        orderBy: [
            { shipmentNo: "desc" },
            { createdAt: "desc" },
        ],
        select: {
            id: true,
            shipmentNo: true,
            status: true,
            shippedAt: true,
            companyNote: true,
            createdAt: true,
            lines: {
                orderBy: { createdAt: "asc" },
                select: {
                    id: true,
                    orderLineId: true,
                    shippedQty: true,
                    reason: true,
                    orderLine: {
                        select: {
                            displayName: true,
                            unit: true,
                            acceptedQty: true,
                            requestedQty: true,
                            lineStatus: true,
                        },
                    },
                    receiptLines: {
                        select: {
                            receivedQty: true,
                        },
                    },
                },
            },
            receipts: {
                orderBy: { confirmedAt: "desc" },
                select: {
                    id: true,
                    confirmedAt: true,
                    note: true,
                    lines: {
                        select: {
                            shipmentLineId: true,
                            receivedQty: true,
                            differenceReason: true,
                        },
                    },
                },
            },
        },
    },
} satisfies Prisma.DrugOrderSelect;

type FacilityOptionRecord = Prisma.UserGetPayload<{
    select: typeof FACILITY_OPTION_SELECT;
}>;

type MasterDrugRecord = Prisma.MasterDrugGetPayload<{
    select: typeof MASTER_DRUG_SELECT;
}>;

type CompanyDrugRecord = Prisma.CompanyDrugGetPayload<{
    select: typeof COMPANY_DRUG_SELECT;
}>;

type CompanyDrugCatalogRecord = Prisma.CompanyDrugGetPayload<{
    select: typeof COMPANY_DRUG_CATALOG_SELECT;
}>;

type OrderSummaryRecord = Prisma.DrugOrderGetPayload<{
    select: typeof ORDER_SUMMARY_SELECT;
}>;

type OrderDetailRecord = Prisma.DrugOrderGetPayload<{
    select: typeof ORDER_DETAIL_SELECT;
}>;

export interface CompanyDrugCatalogInput {
    companyDrugCode: string;
    masterDrugId: string | null;
    quyCach: string | null;
    isActive: boolean;
}

export interface CompanyOrderResponseInput {
    lineId: string;
    decision: "CONFIRMED" | "PARTIAL" | "REJECTED";
    acceptedQty: number | null;
    reason: string;
    companyDrugId: string | null;
    createCompanyDrug: CompanyDrugCatalogInput | null;
}

export interface CompanyShipmentLineInput {
    orderLineId: string;
    shippedQty: number;
    reason: string | null;
}

function serializeFacilityOption(facility: FacilityOptionRecord) {
    return {
        id: facility.id,
        facilityName: facility.facilityName || "—",
        facilityCode: facility.facilityCode || "—",
    };
}

function serializeMasterDrugOption(masterDrug: MasterDrugRecord) {
    return {
        id: masterDrug.id,
        maChung: masterDrug.maChung,
        tenThuoc: masterDrug.tenThuoc,
        hoatChat: masterDrug.hoatChat,
        hamLuong: masterDrug.hamLuong,
        dangBaoChe: masterDrug.dangBaoChe,
        soDangKy: masterDrug.soDangKy,
        quyCach: masterDrug.quyCach,
        donViTinh: masterDrug.donViTinh,
    };
}

function isLegacyCompanyDrug(
    drug: Pick<CompanyDrugRecord, "masterDrugId">,
    mappedMasterDrugIds: Set<string>
) {
    return !drug.masterDrugId || !mappedMasterDrugIds.has(drug.masterDrugId);
}

function serializeCompanyDrugOption(
    drug: CompanyDrugRecord,
    mappedMasterDrugIds: Set<string>
) {
    return {
        id: drug.id,
        companyDrugCode: drug.companyDrugCode,
        companyDrugName: drug.companyDrugName,
        activeIngredient: drug.activeIngredient,
        quyCach: drug.quyCach,
        unit: drug.unit,
        isActive: drug.isActive,
        masterDrugId: drug.masterDrugId,
        isLegacy: isLegacyCompanyDrug(drug, mappedMasterDrugIds),
        masterDrug: drug.masterDrug
            ? serializeMasterDrugOption(drug.masterDrug)
            : null,
    };
}

function serializeCompanyDrugCatalogItem(
    drug: CompanyDrugCatalogRecord,
    mappedMasterDrugIds: Set<string>
) {
    return {
        ...serializeCompanyDrugOption(drug, mappedMasterDrugIds),
        canDelete: drug._count.drugOrderLines === 0,
        referencedOrderLineCount: drug._count.drugOrderLines,
    };
}

function serializeOrderSummary(order: OrderSummaryRecord) {
    const lineCount = order.lines.length;
    const totalRequestedQty = order.lines.reduce(
        (sum, line) => sum + toNumber(line.requestedQty),
        0
    );
    const totalAcceptedQty = order.lines.reduce(
        (sum, line) => sum + toNumber(line.acceptedQty),
        0
    );
    const totalShippedQty = order.lines.reduce(
        (sum, line) =>
            sum +
            line.shipmentLines.reduce(
                (shipmentSum, shipmentLine) => shipmentSum + toNumber(shipmentLine.shippedQty),
                0
            ),
        0
    );
    const pendingCatalogCount = order.lines.filter(
        (line) => line.lineStatus === DrugOrderLineStatus.PENDING_CATALOG_CONFIRMATION
    ).length;

    return {
        id: order.id,
        orderNo: order.orderNo,
        facilityId: order.facilityId,
        facility: serializeFacilityOption(order.facility),
        status: order.status,
        baseReportMonth: order.baseReportMonth,
        note: order.note,
        submittedAt: order.submittedAt,
        closedAt: order.closedAt,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        lineCount,
        totalRequestedQty,
        totalAcceptedQty,
        totalShippedQty,
        pendingCatalogCount,
    };
}

function serializeOrderDetail(
    order: OrderDetailRecord,
    companyDrugs: CompanyDrugRecord[],
    mappedMasterDrugIds: Set<string>
) {
    const lines = order.lines.map((line) => {
        const totalShippedQty = line.shipmentLines.reduce(
            (sum, shipmentLine) => sum + toNumber(shipmentLine.shippedQty),
            0
        );
        const totalReceivedQty = line.receiptLines.reduce(
            (sum, receiptLine) => sum + toNumber(receiptLine.receivedQty),
            0
        );
        const acceptedQty = toNumber(line.acceptedQty);

        return {
            id: line.id,
            sourceType: line.sourceType,
            masterDrugId: line.masterDrugId,
            companyDrugId: line.companyDrugId,
            displayName: line.displayName,
            unit: line.unit,
            requestedQty: toNumber(line.requestedQty),
            acceptedQty,
            suggestedQty:
                line.suggestedQty === null ? null : toNumber(line.suggestedQty),
            lineStatus: line.lineStatus,
            companyResponseReason: line.companyResponseReason,
            suggestionBasis: line.suggestionBasis,
            suggestionReportMonth: line.suggestionReportMonth,
            suggestionRuleVersion: line.suggestionRuleVersion,
            totalShippedQty,
            totalReceivedQty,
            remainingAcceptedQty: Math.max(acceptedQty - totalShippedQty, 0),
            masterDrug: line.masterDrug
                ? serializeMasterDrugOption(line.masterDrug)
                : null,
            companyDrug: line.companyDrug
                ? serializeCompanyDrugOption(line.companyDrug, mappedMasterDrugIds)
                : null,
            shipmentHistory: line.shipmentLines.map((shipmentLine) => ({
                id: shipmentLine.id,
                shipmentId: shipmentLine.shipmentId,
                shipmentNo: shipmentLine.shipment.shipmentNo,
                shippedAt: shipmentLine.shipment.shippedAt,
                shipmentStatus: shipmentLine.shipment.status,
                shippedQty: toNumber(shipmentLine.shippedQty),
                reason: shipmentLine.reason,
                receivedQty: shipmentLine.receiptLines.reduce(
                    (sum, receiptLine) => sum + toNumber(receiptLine.receivedQty),
                    0
                ),
            })),
        };
    });

    const canRespond =
        order.status === DrugOrderStatus.SUBMITTED &&
        lines.length > 0 &&
        lines.every((line) =>
            line.lineStatus === DrugOrderLineStatus.PENDING ||
            line.lineStatus === DrugOrderLineStatus.PENDING_CATALOG_CONFIRMATION
        );
    const canCreateShipment =
        (order.status === DrugOrderStatus.READY_FOR_SHIPMENT ||
            order.status === DrugOrderStatus.IN_DELIVERY) &&
        lines.some((line) => line.remainingAcceptedQty > 0);

    return {
        id: order.id,
        orderNo: order.orderNo,
        facilityId: order.facilityId,
        companyId: order.companyId,
        facility: serializeFacilityOption(order.facility),
        status: order.status,
        baseReportMonth: order.baseReportMonth,
        note: order.note,
        submittedAt: order.submittedAt,
        closedAt: order.closedAt,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        permissions: {
            canRespond,
            canCreateShipment,
        },
        lines,
        shipments: order.shipments.map((shipment) => ({
            id: shipment.id,
            shipmentNo: shipment.shipmentNo,
            status: shipment.status,
            shippedAt: shipment.shippedAt,
            companyNote: shipment.companyNote,
            createdAt: shipment.createdAt,
            lines: shipment.lines.map((line) => ({
                id: line.id,
                orderLineId: line.orderLineId,
                displayName: line.orderLine.displayName,
                unit: line.orderLine.unit,
                requestedQty: toNumber(line.orderLine.requestedQty),
                acceptedQty: toNumber(line.orderLine.acceptedQty),
                shippedQty: toNumber(line.shippedQty),
                receivedQty: line.receiptLines.reduce(
                    (sum, receiptLine) => sum + toNumber(receiptLine.receivedQty),
                    0
                ),
                reason: line.reason,
            })),
            receipts: shipment.receipts.map((receipt) => ({
                id: receipt.id,
                confirmedAt: receipt.confirmedAt,
                note: receipt.note,
                lines: receipt.lines.map((line) => ({
                    shipmentLineId: line.shipmentLineId,
                    receivedQty: toNumber(line.receivedQty),
                    differenceReason: line.differenceReason,
                })),
            })),
        })),
        options: {
            companyDrugs: companyDrugs.map((drug) =>
                serializeCompanyDrugOption(drug, mappedMasterDrugIds)
            ),
        },
    };
}

async function assertCompanyIsActive(companyId: string) {
    const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: {
            id: true,
            isActive: true,
        },
    });

    if (!company || !company.isActive) {
        throw new RouteError(403, "Công ty không tồn tại hoặc đã bị vô hiệu hóa");
    }
}

async function assertMasterDrugExists(masterDrugId: string) {
    const masterDrug = await prisma.masterDrug.findUnique({
        where: { id: masterDrugId },
        select: {
            id: true,
            maChung: true,
            tenThuoc: true,
        },
    });

    if (!masterDrug) {
        throw new RouteError(400, "Thuốc danh mục chung không tồn tại");
    }

    return masterDrug;
}

async function loadMappedMasterDrugIds(
    masterDrugIds: string[],
    db: DbClient = prisma
) {
    const uniqueIds = Array.from(new Set(masterDrugIds.filter(Boolean)));
    if (uniqueIds.length === 0) {
        return new Set<string>();
    }

    const mappedMasterDrugs = await db.masterDrug.findMany({
        where: {
            id: { in: uniqueIds },
            drugMaps: {
                some: {
                    status: {
                        in: [...MAPPED_MASTER_DRUG_STATUSES],
                    },
                },
            },
        },
        select: { id: true },
    });

    return new Set(mappedMasterDrugs.map((item) => item.id));
}

async function assertMappedMasterDrugExists(
    db: DbClient,
    masterDrugId: string
) {
    const mappedMasterDrug = await db.masterDrug.findFirst({
        where: {
            id: masterDrugId,
            drugMaps: {
                some: {
                    status: {
                        in: [...MAPPED_MASTER_DRUG_STATUSES],
                    },
                },
            },
        },
        select: MASTER_DRUG_SELECT,
    });

    if (mappedMasterDrug) {
        return mappedMasterDrug;
    }

    await assertMasterDrugExists(masterDrugId);
    throw new RouteError(
        400,
        "Thuốc danh mục chung chưa được ánh xạ nên không thể dùng cho danh mục công ty"
    );
}

function buildCompanyDrugDataFromMasterDrug(
    input: CompanyDrugCatalogInput,
    masterDrug: MasterDrugRecord
) {
    return {
        companyDrugCode: input.companyDrugCode,
        companyDrugName: masterDrug.tenThuoc,
        activeIngredient: masterDrug.hoatChat,
        quyCach: input.quyCach ?? masterDrug.quyCach,
        unit: masterDrug.donViTinh,
        isActive: input.isActive,
        masterDrugId: masterDrug.id,
    };
}

async function getOwnedCompanyDrug(companyId: string, companyDrugId: string) {
    const companyDrug = await prisma.companyDrug.findFirst({
        where: {
            id: companyDrugId,
            companyId,
        },
        select: COMPANY_DRUG_SELECT,
    });

    if (!companyDrug) {
        throw new RouteError(404, "Thuốc công ty không tồn tại");
    }

    return companyDrug;
}

async function listActiveCompanyDrugs(companyId: string) {
    return prisma.companyDrug.findMany({
        where: {
            companyId,
            isActive: true,
        },
        select: COMPANY_DRUG_SELECT,
        orderBy: [
            { companyDrugName: "asc" },
            { companyDrugCode: "asc" },
        ],
    });
}

function getTrimmedParam(searchParams: URLSearchParams, key: string) {
    return searchParams.get(key)?.trim() || "";
}

export function parseCompanyDrugCatalogPayload(value: unknown): CompanyDrugCatalogInput {
    if (typeof value !== "object" || value === null) {
        throw new RouteError(400, "Dữ liệu thuốc công ty không hợp lệ");
    }

    const companyDrugCode =
        "companyDrugCode" in value ? normalizeText(value.companyDrugCode) : "";
    const masterDrugId =
        "masterDrugId" in value ? normalizeText(value.masterDrugId) || null : null;
    const isActive =
        "isActive" in value && typeof value.isActive === "boolean"
            ? value.isActive
            : true;

    if (!companyDrugCode) {
        throw new RouteError(400, "Mã thuốc công ty là bắt buộc");
    }

    return {
        companyDrugCode,
        masterDrugId,
        quyCach:
            "quyCach" in value
                ? normalizeOptionalText(value.quyCach)
                : null,
        isActive,
    };
}

export function parseCompanyOrderResponses(value: unknown): CompanyOrderResponseInput[] {
    if (!Array.isArray(value) || value.length === 0) {
        throw new RouteError(400, "Danh sách phản hồi dòng thuốc không hợp lệ");
    }

    return value.map((item, index) => {
        if (typeof item !== "object" || item === null) {
            throw new RouteError(400, `Dòng phản hồi ${index + 1} không hợp lệ`);
        }

        const lineId = "lineId" in item ? normalizeText(item.lineId) : "";
        const decision =
            "decision" in item && typeof item.decision === "string"
                ? item.decision
                : "";
        const reason = "reason" in item ? normalizeText(item.reason) : "";
        const acceptedQtyRaw = "acceptedQty" in item ? item.acceptedQty : null;
        const acceptedQty =
            acceptedQtyRaw === null || acceptedQtyRaw === undefined || acceptedQtyRaw === ""
                ? null
                : Number(acceptedQtyRaw);
        const companyDrugId =
            "companyDrugId" in item ? normalizeText(item.companyDrugId) || null : null;
        const createCompanyDrug =
            "createCompanyDrug" in item && item.createCompanyDrug !== null
                ? parseCompanyDrugCatalogPayload(item.createCompanyDrug)
                : null;

        if (!lineId) {
            throw new RouteError(400, `Thiếu dòng thuốc tại phản hồi ${index + 1}`);
        }

        if (
            decision !== DrugOrderLineStatus.CONFIRMED &&
            decision !== DrugOrderLineStatus.PARTIAL &&
            decision !== DrugOrderLineStatus.REJECTED
        ) {
            throw new RouteError(400, `Trạng thái phản hồi tại dòng ${index + 1} không hợp lệ`);
        }

        if (!reason) {
            throw new RouteError(400, `Vui lòng nhập lý do phản hồi cho dòng ${index + 1}`);
        }

        if (
            decision === DrugOrderLineStatus.PARTIAL &&
            (acceptedQty === null || !Number.isFinite(acceptedQty) || acceptedQty <= 0)
        ) {
            throw new RouteError(
                400,
                `Số lượng chấp nhận của dòng ${index + 1} phải lớn hơn 0`
            );
        }

        if (
            decision === DrugOrderLineStatus.CONFIRMED &&
            acceptedQty !== null &&
            (!Number.isFinite(acceptedQty) || acceptedQty <= 0)
        ) {
            throw new RouteError(
                400,
                `Số lượng chấp nhận của dòng ${index + 1} không hợp lệ`
            );
        }

        return {
            lineId,
            decision,
            acceptedQty,
            reason,
            companyDrugId,
            createCompanyDrug,
        };
    });
}

export function parseCompanyShipmentLines(value: unknown): CompanyShipmentLineInput[] {
    if (!Array.isArray(value) || value.length === 0) {
        throw new RouteError(400, "Danh sách dòng giao hàng không hợp lệ");
    }

    return value.map((item, index) => {
        if (typeof item !== "object" || item === null) {
            throw new RouteError(400, `Dòng giao hàng ${index + 1} không hợp lệ`);
        }

        const orderLineId = "orderLineId" in item ? normalizeText(item.orderLineId) : "";
        const shippedQty = Number("shippedQty" in item ? item.shippedQty : null);
        const reason =
            "reason" in item ? normalizeOptionalText(item.reason) : null;

        if (!orderLineId) {
            throw new RouteError(400, `Thiếu dòng thuốc ở đợt giao ${index + 1}`);
        }

        if (!Number.isFinite(shippedQty) || shippedQty <= 0) {
            throw new RouteError(
                400,
                `Số lượng giao tại dòng ${index + 1} phải lớn hơn 0`
            );
        }

        return {
            orderLineId,
            shippedQty,
            reason,
        };
    });
}

export function parseShipmentTimestamp(value: unknown) {
    if (value === null || value === undefined || value === "") {
        return new Date();
    }

    const normalized = typeof value === "string" ? value.trim() : "";
    const parsed = new Date(normalized);
    if (!normalized || Number.isNaN(parsed.getTime())) {
        throw new RouteError(400, "Thời điểm giao hàng không hợp lệ");
    }

    return parsed;
}

export function parseCompanyShipmentNote(value: unknown) {
    return normalizeOptionalText(value);
}

export async function loadCompanyDrugCatalogPayload(params: {
    companyId: string;
    searchParams: URLSearchParams;
}) {
    const search = getTrimmedParam(params.searchParams, "search");
    const kind = getTrimmedParam(params.searchParams, "kind") || "all";
    const active = getTrimmedParam(params.searchParams, "active") || "active";
    const masterSearch = getTrimmedParam(params.searchParams, "masterSearch");

    const whereClauses: Prisma.CompanyDrugWhereInput[] = [
        { companyId: params.companyId },
    ];

    if (search) {
        whereClauses.push({
            OR: [
                { companyDrugCode: { contains: search, mode: "insensitive" } },
                { companyDrugName: { contains: search, mode: "insensitive" } },
                { activeIngredient: { contains: search, mode: "insensitive" } },
                { quyCach: { contains: search, mode: "insensitive" } },
                { masterDrug: { tenThuoc: { contains: search, mode: "insensitive" } } },
                { masterDrug: { maChung: { contains: search, mode: "insensitive" } } },
            ],
        });
    }

    if (active === "active") {
        whereClauses.push({ isActive: true });
    } else if (active === "inactive") {
        whereClauses.push({ isActive: false });
    }

    const [items, masterDrugOptions] = await Promise.all([
        prisma.companyDrug.findMany({
            where: { AND: whereClauses },
            select: COMPANY_DRUG_CATALOG_SELECT,
            orderBy: [
                { isActive: "desc" },
                { companyDrugName: "asc" },
                { companyDrugCode: "asc" },
            ],
        }),
        masterSearch
            ? prisma.masterDrug.findMany({
                where: {
                    OR: [
                        { tenThuoc: { contains: masterSearch, mode: "insensitive" } },
                        { maChung: { contains: masterSearch, mode: "insensitive" } },
                        { hoatChat: { contains: masterSearch, mode: "insensitive" } },
                        { soDangKy: { contains: masterSearch, mode: "insensitive" } },
                    ],
                    drugMaps: {
                        some: {
                            status: {
                                in: [...MAPPED_MASTER_DRUG_STATUSES],
                            },
                        },
                    },
                },
                select: MASTER_DRUG_SELECT,
                orderBy: { tenThuoc: "asc" },
                take: 20,
            })
            : Promise.resolve([]),
    ]);

    const mappedMasterDrugIds = await loadMappedMasterDrugIds(
        items
            .map((item) => item.masterDrugId)
            .filter((masterDrugId): masterDrugId is string => Boolean(masterDrugId))
    );

    const serializedItems = items.map((item) =>
        serializeCompanyDrugCatalogItem(item, mappedMasterDrugIds)
    );
    const filteredItems =
        kind === "mapped"
            ? serializedItems.filter((item) => !item.isLegacy)
            : kind === "legacy"
                ? serializedItems.filter((item) => item.isLegacy)
                : serializedItems;

    return {
        items: filteredItems,
        masterDrugOptions: masterDrugOptions.map(serializeMasterDrugOption),
    };
}

export async function createCompanyDrugCatalogItem(params: {
    companyId: string;
    input: CompanyDrugCatalogInput;
}) {
    await assertCompanyIsActive(params.companyId);
    if (!params.input.masterDrugId) {
        throw new RouteError(400, "Vui lòng chọn thuốc chuẩn đã được ánh xạ");
    }
    const masterDrug = await assertMappedMasterDrugExists(
        prisma,
        params.input.masterDrugId
    );

    const duplicate = await prisma.companyDrug.findFirst({
        where: {
            companyId: params.companyId,
            companyDrugCode: params.input.companyDrugCode,
        },
        select: { id: true },
    });

    if (duplicate) {
        throw new RouteError(400, "Mã thuốc công ty đã tồn tại");
    }

    const created = await prisma.companyDrug.create({
        data: {
            companyId: params.companyId,
            ...buildCompanyDrugDataFromMasterDrug(params.input, masterDrug),
        },
        select: COMPANY_DRUG_SELECT,
    });

    const mappedMasterDrugIds = await loadMappedMasterDrugIds(
        created.masterDrugId ? [created.masterDrugId] : []
    );

    return {
        item: serializeCompanyDrugOption(created, mappedMasterDrugIds),
    };
}

export async function updateCompanyDrugCatalogItem(params: {
    companyId: string;
    companyDrugId: string;
    input: CompanyDrugCatalogInput;
}) {
    const existingDrug = await getOwnedCompanyDrug(
        params.companyId,
        params.companyDrugId
    );
    const mappedExistingIds = await loadMappedMasterDrugIds(
        existingDrug.masterDrugId ? [existingDrug.masterDrugId] : []
    );
    const isLegacy = isLegacyCompanyDrug(existingDrug, mappedExistingIds);
    const isToggleOnlyLegacyUpdate =
        isLegacy &&
        params.input.masterDrugId === existingDrug.masterDrugId &&
        params.input.companyDrugCode === existingDrug.companyDrugCode &&
        (params.input.quyCach ?? null) === (existingDrug.quyCach ?? null);

    let masterDrug: MasterDrugRecord | null = null;
    if (params.input.masterDrugId) {
        masterDrug = await assertMappedMasterDrugExists(
            prisma,
            params.input.masterDrugId
        );
    }

    const duplicate = await prisma.companyDrug.findFirst({
        where: {
            companyId: params.companyId,
            companyDrugCode: params.input.companyDrugCode,
            id: {
                not: params.companyDrugId,
            },
        },
        select: { id: true },
    });

    if (duplicate) {
        throw new RouteError(400, "Mã thuốc công ty đã tồn tại");
    }

    if (isLegacy && !masterDrug && !isToggleOnlyLegacyUpdate) {
        throw new RouteError(
            400,
            "Thuốc công ty legacy phải liên kết một thuốc chuẩn đã được ánh xạ trước khi lưu"
        );
    }

    if (
        !isLegacy &&
        params.input.masterDrugId !== existingDrug.masterDrugId
    ) {
        throw new RouteError(
            400,
            "Không thể đổi thuốc chuẩn của thuốc công ty đã tồn tại"
        );
    }

    const updated = await prisma.companyDrug.update({
        where: { id: params.companyDrugId },
        data:
            masterDrug
                ? buildCompanyDrugDataFromMasterDrug(params.input, masterDrug)
                : {
                    companyDrugCode: existingDrug.companyDrugCode,
                    companyDrugName: existingDrug.companyDrugName,
                    activeIngredient: existingDrug.activeIngredient,
                    quyCach: existingDrug.quyCach,
                    unit: existingDrug.unit,
                    masterDrugId: existingDrug.masterDrugId,
                    isActive: params.input.isActive,
                },
        select: COMPANY_DRUG_SELECT,
    });

    const mappedMasterDrugIds = await loadMappedMasterDrugIds(
        updated.masterDrugId ? [updated.masterDrugId] : []
    );

    return {
        item: serializeCompanyDrugOption(updated, mappedMasterDrugIds),
    };
}

export async function deleteCompanyDrugCatalogItem(params: {
    companyId: string;
    companyDrugId: string;
}) {
    const companyDrug = await prisma.companyDrug.findFirst({
        where: {
            id: params.companyDrugId,
            companyId: params.companyId,
        },
        select: {
            id: true,
            companyDrugCode: true,
            companyDrugName: true,
            activeIngredient: true,
            quyCach: true,
            unit: true,
            isActive: true,
            masterDrugId: true,
            _count: {
                select: {
                    drugOrderLines: true,
                },
            },
        },
    });

    if (!companyDrug) {
        throw new RouteError(404, "Thuốc công ty không tồn tại");
    }

    if (companyDrug._count.drugOrderLines > 0) {
        throw new RouteError(
            409,
            "Không thể xóa thuốc công ty đã phát sinh trong đơn. Hãy ngừng sử dụng hoặc xóa các đơn test liên quan trước."
        );
    }

    await prisma.companyDrug.delete({
        where: {
            id: params.companyDrugId,
        },
    });

    return {
        deletedItem: {
            id: companyDrug.id,
            companyDrugCode: companyDrug.companyDrugCode,
            companyDrugName: companyDrug.companyDrugName,
            activeIngredient: companyDrug.activeIngredient,
            quyCach: companyDrug.quyCach,
            unit: companyDrug.unit,
            isActive: companyDrug.isActive,
            masterDrugId: companyDrug.masterDrugId,
        },
    };
}

export async function loadCompanyDrugOrderListPayload(companyId: string) {
    await assertCompanyIsActive(companyId);

    const orders = await prisma.drugOrder.findMany({
        where: {
            companyId,
        },
        select: ORDER_SUMMARY_SELECT,
        orderBy: [
            { updatedAt: "desc" },
            { createdAt: "desc" },
        ],
    });

    const facilities = new Map<string, ReturnType<typeof serializeFacilityOption>>();
    orders.forEach((order) => {
        facilities.set(order.facilityId, serializeFacilityOption(order.facility));
    });

    return {
        orders: orders.map(serializeOrderSummary),
        options: {
            facilities: Array.from(facilities.values()).sort((left, right) =>
                left.facilityName.localeCompare(right.facilityName, "vi")
            ),
        },
    };
}

export async function loadCompanyDrugOrderDetailPayload(params: {
    companyId: string;
    orderId: string;
}) {
    const [order, companyDrugs] = await Promise.all([
        prisma.drugOrder.findFirst({
            where: {
                id: params.orderId,
                companyId: params.companyId,
            },
            select: ORDER_DETAIL_SELECT,
        }),
        listActiveCompanyDrugs(params.companyId),
    ]);

    if (!order) {
        throw new RouteError(404, "Đơn đặt hàng không tồn tại");
    }

    const mappedMasterDrugIds = await loadMappedMasterDrugIds([
        ...companyDrugs
            .map((drug) => drug.masterDrugId)
            .filter((masterDrugId): masterDrugId is string => Boolean(masterDrugId)),
        ...order.lines
            .map((line) => line.companyDrug?.masterDrugId)
            .filter((masterDrugId): masterDrugId is string => Boolean(masterDrugId)),
    ]);

    return {
        order: serializeOrderDetail(order, companyDrugs, mappedMasterDrugIds),
    };
}

export async function respondToCompanyDrugOrder(params: {
    companyId: string;
    orderId: string;
    responses: CompanyOrderResponseInput[];
}) {
    const order = await prisma.drugOrder.findFirst({
        where: {
            id: params.orderId,
            companyId: params.companyId,
        },
        select: {
            id: true,
            orderNo: true,
            facilityId: true,
            status: true,
            lines: {
                orderBy: { createdAt: "asc" },
                select: {
                    id: true,
                    sourceType: true,
                    masterDrugId: true,
                    companyDrugId: true,
                    requestedQty: true,
                    lineStatus: true,
                },
            },
        },
    });

    if (!order) {
        throw new RouteError(404, "Đơn đặt hàng không tồn tại");
    }

    if (order.status !== DrugOrderStatus.SUBMITTED) {
        throw new RouteError(400, "Chỉ có thể phản hồi đơn ở trạng thái đã gửi");
    }

    if (
        !order.lines.every((line) =>
            line.lineStatus === DrugOrderLineStatus.PENDING ||
            line.lineStatus === DrugOrderLineStatus.PENDING_CATALOG_CONFIRMATION
        )
    ) {
        throw new RouteError(400, "Đơn đã được phản hồi trước đó");
    }

    if (order.lines.length !== params.responses.length) {
        throw new RouteError(
            400,
            "Công ty phải phản hồi đầy đủ tất cả các dòng của đơn"
        );
    }

    const lineMap = new Map(order.lines.map((line) => [line.id, line]));
    const responseMap = new Map<string, CompanyOrderResponseInput>();

    params.responses.forEach((response, index) => {
        if (!lineMap.has(response.lineId)) {
            throw new RouteError(
                400,
                `Dòng phản hồi ${index + 1} không thuộc đơn hiện tại`
            );
        }

        if (responseMap.has(response.lineId)) {
            throw new RouteError(400, "Mỗi dòng thuốc chỉ được phản hồi một lần");
        }

        responseMap.set(response.lineId, response);
    });

    const activeCompanyDrugs = await listActiveCompanyDrugs(params.companyId);
    const companyDrugMap = new Map(activeCompanyDrugs.map((drug) => [drug.id, drug]));

    await prisma.$transaction(async (tx) => {
        for (const line of order.lines) {
            const response = responseMap.get(line.id);
            if (!response) {
                throw new RouteError(
                    400,
                    "Công ty phải phản hồi đầy đủ tất cả các dòng của đơn"
                );
            }

            const requestedQty = toNumber(line.requestedQty);
            let acceptedQty = 0;
            let companyDrugIdToConnect = line.companyDrugId;

            if (response.decision === DrugOrderLineStatus.CONFIRMED) {
                acceptedQty =
                    response.acceptedQty === null ? requestedQty : response.acceptedQty;
                if (acceptedQty !== requestedQty) {
                    throw new RouteError(
                        400,
                        "Dòng xác nhận đủ phải có số lượng chấp nhận bằng số lượng yêu cầu"
                    );
                }
            } else if (response.decision === DrugOrderLineStatus.PARTIAL) {
                acceptedQty = response.acceptedQty ?? 0;
                if (acceptedQty >= requestedQty) {
                    throw new RouteError(
                        400,
                        "Dòng giao một phần phải có số lượng chấp nhận nhỏ hơn số lượng yêu cầu"
                    );
                }
            }

            if (
                line.lineStatus === DrugOrderLineStatus.PENDING_CATALOG_CONFIRMATION &&
                response.decision !== DrugOrderLineStatus.REJECTED
            ) {
                if (!line.masterDrugId) {
                    throw new RouteError(
                        400,
                        "Dòng chờ xác nhận danh mục không có liên kết thuốc chuẩn"
                    );
                }

                if (!response.companyDrugId && !response.createCompanyDrug) {
                    throw new RouteError(
                        400,
                        "Vui lòng liên kết hoặc tạo thuốc công ty trước khi xác nhận dòng chờ danh mục"
                    );
                }

                if (response.companyDrugId) {
                    const existingDrug = companyDrugMap.get(response.companyDrugId);
                    if (!existingDrug) {
                        throw new RouteError(
                            400,
                            "Thuốc công ty được chọn không thuộc công ty hiện tại hoặc đã ngừng dùng"
                        );
                    }

                    if (existingDrug.masterDrugId !== line.masterDrugId) {
                        throw new RouteError(
                            400,
                            "Thuốc công ty được chọn không map với thuốc chuẩn của dòng này"
                        );
                    }

                    companyDrugIdToConnect = existingDrug.id;
                } else if (response.createCompanyDrug) {
                    const createInput = response.createCompanyDrug;
                    const masterDrugId = createInput.masterDrugId;

                    if (!masterDrugId) {
                        throw new RouteError(
                            400,
                            "Thuốc công ty mới phải liên kết đúng thuốc chuẩn của dòng chờ danh mục"
                        );
                    }

                    if (masterDrugId !== line.masterDrugId) {
                        throw new RouteError(
                            400,
                            "Thuốc công ty mới phải liên kết đúng thuốc chuẩn của dòng chờ danh mục"
                        );
                    }

                    const mappedMasterDrug = await assertMappedMasterDrugExists(
                        tx,
                        masterDrugId
                    );

                    const duplicate = await tx.companyDrug.findFirst({
                        where: {
                            companyId: params.companyId,
                            companyDrugCode: createInput.companyDrugCode,
                        },
                        select: {
                            id: true,
                        },
                    });

                    if (duplicate) {
                        throw new RouteError(
                            400,
                            "Mã thuốc công ty mới đã tồn tại"
                        );
                    }

                    const createdCompanyDrug = await tx.companyDrug.create({
                        data: {
                            companyId: params.companyId,
                            ...buildCompanyDrugDataFromMasterDrug(
                                createInput,
                                mappedMasterDrug
                            ),
                        },
                        select: {
                            id: true,
                        },
                    });

                    companyDrugIdToConnect = createdCompanyDrug.id;
                }
            }

            await tx.drugOrderLine.update({
                where: { id: line.id },
                data: {
                    acceptedQty,
                    lineStatus: response.decision,
                    companyResponseReason: response.reason,
                    companyDrugId: companyDrugIdToConnect,
                },
            });
        }

        const updatedLines = await tx.drugOrderLine.findMany({
            where: { orderId: order.id },
            select: {
                lineStatus: true,
                acceptedQty: true,
            },
        });
        const hasAcceptedLines = updatedLines.some(
            (line) => toNumber(line.acceptedQty) > 0
        );

        await tx.drugOrder.update({
            where: { id: order.id },
            data: {
                status: hasAcceptedLines
                    ? DrugOrderStatus.READY_FOR_SHIPMENT
                    : DrugOrderStatus.REJECTED,
                closedAt: hasAcceptedLines ? null : new Date(),
            },
        });
    });

    return loadCompanyDrugOrderDetailPayload({
        companyId: params.companyId,
        orderId: order.id,
    });
}

export async function createCompanyDrugOrderShipment(params: {
    companyId: string;
    orderId: string;
    shippedAt: Date;
    companyNote: string | null;
    lines: CompanyShipmentLineInput[];
}) {
    const order = await prisma.drugOrder.findFirst({
        where: {
            id: params.orderId,
            companyId: params.companyId,
        },
        select: {
            id: true,
            status: true,
            lines: {
                select: {
                    id: true,
                    acceptedQty: true,
                    lineStatus: true,
                    shipmentLines: {
                        select: {
                            shippedQty: true,
                        },
                    },
                },
            },
            shipments: {
                select: {
                    shipmentNo: true,
                },
                orderBy: { shipmentNo: "desc" },
                take: 1,
            },
        },
    });

    if (!order) {
        throw new RouteError(404, "Đơn đặt hàng không tồn tại");
    }

    if (
        order.status !== DrugOrderStatus.READY_FOR_SHIPMENT &&
        order.status !== DrugOrderStatus.IN_DELIVERY
    ) {
        throw new RouteError(
            400,
            "Chỉ có thể tạo đợt giao cho đơn đang sẵn sàng giao hoặc đang giao"
        );
    }

    const lineMap = new Map(order.lines.map((line) => [line.id, line]));
    const requestLineIds = new Set<string>();

    params.lines.forEach((line, index) => {
        if (!lineMap.has(line.orderLineId)) {
            throw new RouteError(
                400,
                `Dòng giao hàng ${index + 1} không thuộc đơn hiện tại`
            );
        }

        if (requestLineIds.has(line.orderLineId)) {
            throw new RouteError(400, "Mỗi dòng thuốc chỉ được khai báo một lần trong đợt giao");
        }

        requestLineIds.add(line.orderLineId);
    });

    const shipmentNo = (order.shipments[0]?.shipmentNo || 0) + 1;

    await prisma.$transaction(async (tx) => {
        const shipment = await tx.drugOrderShipment.create({
            data: {
                orderId: order.id,
                shipmentNo,
                status: DrugOrderShipmentStatus.CREATED,
                shippedAt: params.shippedAt,
                companyNote: params.companyNote,
            },
            select: { id: true },
        });

        for (const lineInput of params.lines) {
            const line = lineMap.get(lineInput.orderLineId);
            if (!line) {
                throw new RouteError(400, "Dòng giao hàng không tồn tại");
            }

            if (
                line.lineStatus !== DrugOrderLineStatus.CONFIRMED &&
                line.lineStatus !== DrugOrderLineStatus.PARTIAL &&
                line.lineStatus !== DrugOrderLineStatus.COMPLETED
            ) {
                throw new RouteError(
                    400,
                    "Chỉ được giao cho dòng đã được chấp nhận"
                );
            }

            const acceptedQty = toNumber(line.acceptedQty);
            const shippedQty = line.shipmentLines.reduce(
                (sum, shipmentLine) => sum + toNumber(shipmentLine.shippedQty),
                0
            );
            const remainingQty = acceptedQty - shippedQty;

            if (remainingQty <= 0) {
                throw new RouteError(400, "Dòng thuốc này đã được giao đủ");
            }

            if (lineInput.shippedQty > remainingQty) {
                throw new RouteError(
                    400,
                    "Số lượng giao không được vượt quá số lượng còn lại đã chấp nhận"
                );
            }

            if (lineInput.shippedQty < remainingQty && !lineInput.reason) {
                throw new RouteError(
                    400,
                    "Vui lòng nhập lý do khi giao chưa đủ số lượng còn lại của dòng thuốc"
                );
            }

            await tx.drugOrderShipmentLine.create({
                data: {
                    shipmentId: shipment.id,
                    orderLineId: line.id,
                    shippedQty: lineInput.shippedQty,
                    reason: lineInput.reason,
                },
            });
        }

        await tx.drugOrder.update({
            where: { id: order.id },
            data: {
                status: DrugOrderStatus.IN_DELIVERY,
            },
        });
    });

    return loadCompanyDrugOrderDetailPayload({
        companyId: params.companyId,
        orderId: order.id,
    });
}
