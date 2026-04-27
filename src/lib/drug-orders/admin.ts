import {
    DrugOrderStatus,
    DrugOrderLineStatus,
    Prisma,
} from "@/../prisma/generated/client";
import prisma from "@/lib/prisma";
import { RouteError } from "@/lib/server-authz";
import { buildDrugOrderLookupPath } from "@/lib/drug-orders/qr-token";
import { normalizeText, toNumber } from "@/lib/drug-orders/utils";

const FACILITY_OPTION_SELECT = {
    id: true,
    facilityName: true,
    facilityCode: true,
} satisfies Prisma.UserSelect;

const COMPANY_OPTION_SELECT = {
    id: true,
    code: true,
    name: true,
} satisfies Prisma.CompanySelect;

const MASTER_DRUG_SELECT = {
    id: true,
    maChung: true,
    tenThuoc: true,
    hoatChat: true,
    hamLuong: true,
    dangBaoChe: true,
    soDangKy: true,
    donViTinh: true,
} satisfies Prisma.MasterDrugSelect;

const COMPANY_DRUG_SELECT = {
    id: true,
    companyDrugCode: true,
    companyDrugName: true,
    activeIngredient: true,
    unit: true,
    isActive: true,
    masterDrugId: true,
    masterDrug: {
        select: MASTER_DRUG_SELECT,
    },
} satisfies Prisma.CompanyDrugSelect;

const ADMIN_ORDER_SUMMARY_SELECT = {
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
    company: {
        select: COMPANY_OPTION_SELECT,
    },
    lines: {
        select: {
            requestedQty: true,
            acceptedQty: true,
            lineStatus: true,
            shipmentLines: {
                select: {
                    shippedQty: true,
                    receiptLines: {
                        select: {
                            receivedQty: true,
                        },
                    },
                },
            },
        },
    },
} satisfies Prisma.DrugOrderSelect;

const ADMIN_ORDER_DETAIL_SELECT = {
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
    company: {
        select: COMPANY_OPTION_SELECT,
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
                    shipmentId: true,
                    shippedQty: true,
                    reason: true,
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

type CompanyOptionRecord = Prisma.CompanyGetPayload<{
    select: typeof COMPANY_OPTION_SELECT;
}>;

type CompanyDrugRecord = Prisma.CompanyDrugGetPayload<{
    select: typeof COMPANY_DRUG_SELECT;
}>;

type AdminOrderSummaryRecord = Prisma.DrugOrderGetPayload<{
    select: typeof ADMIN_ORDER_SUMMARY_SELECT;
}>;

type AdminOrderDetailRecord = Prisma.DrugOrderGetPayload<{
    select: typeof ADMIN_ORDER_DETAIL_SELECT;
}>;

function serializeFacilityOption(facility: FacilityOptionRecord) {
    return {
        id: facility.id,
        facilityName: facility.facilityName || "—",
        facilityCode: facility.facilityCode || "—",
    };
}

function serializeCompanyOption(company: CompanyOptionRecord) {
    return {
        id: company.id,
        code: company.code,
        name: company.name,
    };
}

function serializeCompanyDrugOption(drug: CompanyDrugRecord) {
    return {
        id: drug.id,
        companyDrugCode: drug.companyDrugCode,
        companyDrugName: drug.companyDrugName,
        activeIngredient: drug.activeIngredient,
        unit: drug.unit,
        isActive: drug.isActive,
        masterDrugId: drug.masterDrugId,
        masterDrug: drug.masterDrug,
    };
}

function serializeOrderSummary(order: AdminOrderSummaryRecord) {
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
    const totalReceivedQty = order.lines.reduce(
        (sum, line) =>
            sum +
            line.shipmentLines.reduce(
                (shipmentSum, shipmentLine) =>
                    shipmentSum +
                    shipmentLine.receiptLines.reduce(
                        (receiptSum, receiptLine) => receiptSum + toNumber(receiptLine.receivedQty),
                        0
                    ),
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
        lookupUrl: buildDrugOrderLookupPath(order.id),
        facilityId: order.facilityId,
        companyId: order.companyId,
        facility: serializeFacilityOption(order.facility),
        company: serializeCompanyOption(order.company),
        status: order.status,
        baseReportMonth: order.baseReportMonth,
        note: order.note,
        submittedAt: order.submittedAt,
        closedAt: order.closedAt,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        lineCount: order.lines.length,
        totalRequestedQty,
        totalAcceptedQty,
        totalShippedQty,
        totalReceivedQty,
        pendingCatalogCount,
    };
}

function serializeOrderDetail(order: AdminOrderDetailRecord) {
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
            remainingAcceptedQty: Math.max(acceptedQty - totalReceivedQty, 0),
            masterDrug: line.masterDrug,
            companyDrug: line.companyDrug
                ? serializeCompanyDrugOption(line.companyDrug)
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

    return {
        id: order.id,
        orderNo: order.orderNo,
        lookupUrl: buildDrugOrderLookupPath(order.id),
        facilityId: order.facilityId,
        companyId: order.companyId,
        facility: serializeFacilityOption(order.facility),
        company: serializeCompanyOption(order.company),
        status: order.status,
        baseReportMonth: order.baseReportMonth,
        note: order.note,
        submittedAt: order.submittedAt,
        closedAt: order.closedAt,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
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
    };
}

function parseDateParam(value: string | null, boundary: "start" | "end") {
    if (!value) {
        return null;
    }

    const normalized = value.trim();
    if (!normalized) {
        return null;
    }

    const parsed = new Date(boundary === "start" ? `${normalized}T00:00:00.000Z` : `${normalized}T23:59:59.999Z`);
    if (Number.isNaN(parsed.getTime())) {
        throw new RouteError(400, "Khoảng thời gian lọc không hợp lệ");
    }

    return parsed;
}

export async function loadAdminDrugOrderListPayload(searchParams: URLSearchParams) {
    const search = normalizeText(searchParams.get("search"));
    const status = normalizeText(searchParams.get("status"));
    const facilityId = normalizeText(searchParams.get("facilityId"));
    const companyId = normalizeText(searchParams.get("companyId"));
    const dateFrom = parseDateParam(searchParams.get("dateFrom"), "start");
    const dateTo = parseDateParam(searchParams.get("dateTo"), "end");

    if (status) {
        const allowedStatuses = new Set<string>(Object.values(DrugOrderStatus));
        if (!allowedStatuses.has(status)) {
            throw new RouteError(400, "Trạng thái lọc không hợp lệ");
        }
    }

    if (dateFrom && dateTo && dateFrom > dateTo) {
        throw new RouteError(400, "Khoảng thời gian lọc không hợp lệ");
    }

    const whereClauses: Prisma.DrugOrderWhereInput[] = [];

    if (search) {
        whereClauses.push({
            OR: [
                { orderNo: { contains: search, mode: "insensitive" } },
                { note: { contains: search, mode: "insensitive" } },
                { company: { name: { contains: search, mode: "insensitive" } } },
                { company: { code: { contains: search, mode: "insensitive" } } },
                { facility: { facilityName: { contains: search, mode: "insensitive" } } },
                { facility: { facilityCode: { contains: search, mode: "insensitive" } } },
            ],
        });
    }

    if (status) {
        whereClauses.push({
            status: status as DrugOrderStatus,
        });
    }

    if (facilityId) {
        whereClauses.push({ facilityId });
    }

    if (companyId) {
        whereClauses.push({ companyId });
    }

    if (dateFrom || dateTo) {
        whereClauses.push({
            createdAt: {
                ...(dateFrom ? { gte: dateFrom } : {}),
                ...(dateTo ? { lte: dateTo } : {}),
            },
        });
    }

    const where: Prisma.DrugOrderWhereInput =
        whereClauses.length > 0 ? { AND: whereClauses } : {};

    const [orders, facilities, companies] = await Promise.all([
        prisma.drugOrder.findMany({
            where,
            select: ADMIN_ORDER_SUMMARY_SELECT,
            orderBy: [
                { updatedAt: "desc" },
                { createdAt: "desc" },
            ],
        }),
        prisma.user.findMany({
            where: {
                role: "FACILITY",
                isActive: true,
            },
            select: FACILITY_OPTION_SELECT,
            orderBy: { facilityName: "asc" },
        }),
        prisma.company.findMany({
            select: COMPANY_OPTION_SELECT,
            orderBy: { name: "asc" },
        }),
    ]);

    const serializedOrders = orders.map(serializeOrderSummary);
    const summary = serializedOrders.reduce(
        (acc, order) => {
            acc.totalOrders += 1;
            acc.totalLines += order.lineCount;
            acc.totalRequestedQty += order.totalRequestedQty;
            acc.totalAcceptedQty += order.totalAcceptedQty;
            acc.totalShippedQty += order.totalShippedQty;
            acc.totalReceivedQty += order.totalReceivedQty;
            if (order.status === "COMPLETED") {
                acc.completedOrders += 1;
            } else {
                acc.openOrders += 1;
            }
            return acc;
        },
        {
            totalOrders: 0,
            totalLines: 0,
            totalRequestedQty: 0,
            totalAcceptedQty: 0,
            totalShippedQty: 0,
            totalReceivedQty: 0,
            openOrders: 0,
            completedOrders: 0,
        }
    );

    return {
        summary,
        orders: serializedOrders,
        options: {
            facilities: facilities.map(serializeFacilityOption),
            companies: companies.map(serializeCompanyOption),
        },
    };
}

export async function loadAdminDrugOrderDetailPayload(orderId: string) {
    const order = await prisma.drugOrder.findUnique({
        where: { id: orderId },
        select: ADMIN_ORDER_DETAIL_SELECT,
    });

    if (!order) {
        throw new RouteError(404, "Đơn đặt hàng không tồn tại");
    }

    return {
        order: serializeOrderDetail(order),
    };
}

export async function deleteAdminDrugOrder(orderId: string) {
    const existing = await prisma.drugOrder.findUnique({
        where: { id: orderId },
        select: {
            id: true,
            orderNo: true,
            status: true,
            facilityId: true,
            companyId: true,
            facility: {
                select: FACILITY_OPTION_SELECT,
            },
            company: {
                select: COMPANY_OPTION_SELECT,
            },
            lines: {
                select: {
                    requestedQty: true,
                    acceptedQty: true,
                    shipmentLines: {
                        select: {
                            shippedQty: true,
                        },
                    },
                    receiptLines: {
                        select: {
                            receivedQty: true,
                        },
                    },
                },
            },
            _count: {
                select: {
                    lines: true,
                    shipments: true,
                    receipts: true,
                },
            },
        },
    });

    if (!existing) {
        throw new RouteError(404, "Đơn đặt hàng không tồn tại");
    }

    const totalRequestedQty = existing.lines.reduce(
        (sum, line) => sum + toNumber(line.requestedQty),
        0
    );
    const totalAcceptedQty = existing.lines.reduce(
        (sum, line) => sum + toNumber(line.acceptedQty),
        0
    );
    const totalShippedQty = existing.lines.reduce(
        (sum, line) =>
            sum +
            line.shipmentLines.reduce(
                (shipmentSum, shipmentLine) => shipmentSum + toNumber(shipmentLine.shippedQty),
                0
            ),
        0
    );
    const totalReceivedQty = existing.lines.reduce(
        (sum, line) =>
            sum +
            line.receiptLines.reduce(
                (receiptSum, receiptLine) => receiptSum + toNumber(receiptLine.receivedQty),
                0
            ),
        0
    );

    await prisma.$transaction(async (tx) => {
        await tx.drugOrderReceiptLine.deleteMany({
            where: {
                receipt: {
                    orderId,
                },
            },
        });
        await tx.drugOrderReceipt.deleteMany({
            where: {
                orderId,
            },
        });
        await tx.drugOrderShipmentLine.deleteMany({
            where: {
                shipment: {
                    orderId,
                },
            },
        });
        await tx.drugOrderShipment.deleteMany({
            where: {
                orderId,
            },
        });
        await tx.drugOrderLine.deleteMany({
            where: {
                orderId,
            },
        });
        const deleted = await tx.drugOrder.deleteMany({
            where: {
                id: orderId,
            },
        });

        if (deleted.count === 0) {
            throw new RouteError(
                409,
                "Đơn đặt hàng vừa bị thay đổi hoặc đã bị xóa. Vui lòng tải lại và thử lại."
            );
        }
    });

    return {
        deletedOrder: {
            id: existing.id,
            orderNo: existing.orderNo,
            status: existing.status,
            facilityId: existing.facilityId,
            companyId: existing.companyId,
            facility: serializeFacilityOption(existing.facility),
            company: serializeCompanyOption(existing.company),
            lineCount: existing._count.lines,
            shipmentCount: existing._count.shipments,
            receiptCount: existing._count.receipts,
            totalRequestedQty,
            totalAcceptedQty,
            totalShippedQty,
            totalReceivedQty,
        },
    };
}
