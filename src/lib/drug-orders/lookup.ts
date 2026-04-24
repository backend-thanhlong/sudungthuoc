import { Prisma } from "@/../prisma/generated/client";
import prisma from "@/lib/prisma";
import {
    type ActiveUserRecord,
    RouteError,
} from "@/lib/server-authz";
import { verifyDrugOrderQrToken } from "@/lib/drug-orders/qr-token";
import { toNumber } from "@/lib/drug-orders/utils";

const FACILITY_LOOKUP_SELECT = {
    id: true,
    facilityName: true,
    facilityCode: true,
} satisfies Prisma.UserSelect;

const COMPANY_LOOKUP_SELECT = {
    id: true,
    name: true,
    code: true,
} satisfies Prisma.CompanySelect;

const MASTER_DRUG_LOOKUP_SELECT = {
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

const COMPANY_DRUG_LOOKUP_SELECT = {
    id: true,
    companyDrugCode: true,
    companyDrugName: true,
    activeIngredient: true,
    quyCach: true,
    unit: true,
    masterDrugId: true,
    masterDrug: {
        select: MASTER_DRUG_LOOKUP_SELECT,
    },
} satisfies Prisma.CompanyDrugSelect;

const DRUG_ORDER_LOOKUP_SELECT = {
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
        select: FACILITY_LOOKUP_SELECT,
    },
    company: {
        select: COMPANY_LOOKUP_SELECT,
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
            lineStatus: true,
            companyResponseReason: true,
            masterDrug: {
                select: MASTER_DRUG_LOOKUP_SELECT,
            },
            companyDrug: {
                select: COMPANY_DRUG_LOOKUP_SELECT,
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
                            shippedFromDate: true,
                            shippedToDate: true,
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
            shippedFromDate: true,
            shippedToDate: true,
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
                            requestedQty: true,
                            acceptedQty: true,
                            lineStatus: true,
                            masterDrug: {
                                select: MASTER_DRUG_LOOKUP_SELECT,
                            },
                            companyDrug: {
                                select: COMPANY_DRUG_LOOKUP_SELECT,
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

type DrugOrderLookupRecord = Prisma.DrugOrderGetPayload<{
    select: typeof DRUG_ORDER_LOOKUP_SELECT;
}>;

export class InvalidDrugOrderLookupTokenError extends Error {
    constructor() {
        super("Invalid drug order lookup token");
        this.name = "InvalidDrugOrderLookupTokenError";
    }
}

export const isInvalidDrugOrderLookupTokenError = (
    error: unknown
): error is InvalidDrugOrderLookupTokenError =>
    error instanceof InvalidDrugOrderLookupTokenError;

const toIsoString = (value: Date | null) => (value ? value.toISOString() : null);

const serializeFacility = (facility: DrugOrderLookupRecord["facility"]) => ({
    id: facility.id,
    facilityName: facility.facilityName || "—",
    facilityCode: facility.facilityCode || "—",
});

const serializeMasterDrug = (
    masterDrug: NonNullable<DrugOrderLookupRecord["lines"][number]["masterDrug"]>
) => ({
    id: masterDrug.id,
    maChung: masterDrug.maChung,
    tenThuoc: masterDrug.tenThuoc,
    hoatChat: masterDrug.hoatChat,
    hamLuong: masterDrug.hamLuong,
    dangBaoChe: masterDrug.dangBaoChe,
    soDangKy: masterDrug.soDangKy,
    quyCach: masterDrug.quyCach,
    donViTinh: masterDrug.donViTinh,
});

const serializeCompanyDrug = (
    companyDrug: NonNullable<DrugOrderLookupRecord["lines"][number]["companyDrug"]>
) => ({
    id: companyDrug.id,
    companyDrugCode: companyDrug.companyDrugCode,
    companyDrugName: companyDrug.companyDrugName,
    activeIngredient: companyDrug.activeIngredient,
    quyCach: companyDrug.quyCach,
    unit: companyDrug.unit,
    masterDrugId: companyDrug.masterDrugId,
    masterDrug: companyDrug.masterDrug
        ? serializeMasterDrug(companyDrug.masterDrug)
        : null,
});

const buildDeliverySummaryLabel = (params: {
    totalAcceptedQty: number;
    totalShippedQty: number;
    totalReceivedQty: number;
}) => {
    if (
        params.totalAcceptedQty > 0 &&
        params.totalReceivedQty >= params.totalAcceptedQty
    ) {
        return "Hoàn tất";
    }

    if (params.totalReceivedQty > 0) {
        return "Đã nhận một phần";
    }

    if (params.totalShippedQty > 0) {
        return "Đang giao";
    }

    return "Chưa giao";
};

export function assertCanViewDrugOrderLookup(
    order: Pick<DrugOrderLookupRecord, "facilityId" | "companyId">,
    user: ActiveUserRecord
) {
    if (user.role === "ADMIN") {
        return;
    }

    if (user.role === "FACILITY" && order.facilityId === user.id) {
        return;
    }

    if (user.role === "COMPANY" && order.companyId === user.companyId) {
        return;
    }

    throw new RouteError(403, "Bạn không có quyền xem đơn này");
}

function serializeDrugOrderLookup(order: DrugOrderLookupRecord) {
    const lines = order.lines.map((line) => {
        const totalShippedQty = line.shipmentLines.reduce(
            (sum, shipmentLine) => sum + toNumber(shipmentLine.shippedQty),
            0
        );
        const totalReceivedQty = line.receiptLines.reduce(
            (sum, receiptLine) => sum + toNumber(receiptLine.receivedQty),
            0
        );

        return {
            id: line.id,
            sourceType: line.sourceType,
            masterDrugId: line.masterDrugId,
            companyDrugId: line.companyDrugId,
            displayName: line.displayName,
            unit: line.unit,
            requestedQty: toNumber(line.requestedQty),
            acceptedQty: toNumber(line.acceptedQty),
            shippedQty: totalShippedQty,
            receivedQty: totalReceivedQty,
            lineStatus: line.lineStatus,
            companyResponseReason: line.companyResponseReason,
            masterDrug: line.masterDrug ? serializeMasterDrug(line.masterDrug) : null,
            companyDrug: line.companyDrug ? serializeCompanyDrug(line.companyDrug) : null,
            shipmentHistory: line.shipmentLines.map((shipmentLine) => ({
                id: shipmentLine.id,
                shipmentId: shipmentLine.shipmentId,
                shipmentNo: shipmentLine.shipment.shipmentNo,
                shipmentStatus: shipmentLine.shipment.status,
                shippedAt: toIsoString(shipmentLine.shipment.shippedAt),
                shippedFromDate: toIsoString(shipmentLine.shipment.shippedFromDate),
                shippedToDate: toIsoString(shipmentLine.shipment.shippedToDate),
                shippedQty: toNumber(shipmentLine.shippedQty),
                receivedQty: shipmentLine.receiptLines.reduce(
                    (sum, receiptLine) => sum + toNumber(receiptLine.receivedQty),
                    0
                ),
                reason: shipmentLine.reason,
            })),
        };
    });

    const totals = {
        lineCount: lines.length,
        requestedQty: lines.reduce((sum, line) => sum + line.requestedQty, 0),
        acceptedQty: lines.reduce((sum, line) => sum + line.acceptedQty, 0),
        shippedQty: lines.reduce((sum, line) => sum + line.shippedQty, 0),
        receivedQty: lines.reduce((sum, line) => sum + line.receivedQty, 0),
    };

    return {
        order: {
            id: order.id,
            orderNo: order.orderNo,
            facilityId: order.facilityId,
            companyId: order.companyId,
            facility: serializeFacility(order.facility),
            company: {
                id: order.company.id,
                name: order.company.name,
                code: order.company.code,
            },
            status: order.status,
            baseReportMonth: order.baseReportMonth,
            note: order.note,
            submittedAt: toIsoString(order.submittedAt),
            closedAt: toIsoString(order.closedAt),
            createdAt: order.createdAt.toISOString(),
            updatedAt: order.updatedAt.toISOString(),
        },
        totals,
        deliverySummaryLabel: buildDeliverySummaryLabel({
            totalAcceptedQty: totals.acceptedQty,
            totalShippedQty: totals.shippedQty,
            totalReceivedQty: totals.receivedQty,
        }),
        lines,
        shipments: order.shipments.map((shipment) => ({
            id: shipment.id,
            shipmentNo: shipment.shipmentNo,
            status: shipment.status,
            shippedAt: toIsoString(shipment.shippedAt),
            shippedFromDate: toIsoString(shipment.shippedFromDate),
            shippedToDate: toIsoString(shipment.shippedToDate),
            companyNote: shipment.companyNote,
            createdAt: shipment.createdAt.toISOString(),
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
                lineStatus: line.orderLine.lineStatus,
                reason: line.reason,
                masterDrug: line.orderLine.masterDrug
                    ? serializeMasterDrug(line.orderLine.masterDrug)
                    : null,
                companyDrug: line.orderLine.companyDrug
                    ? serializeCompanyDrug(line.orderLine.companyDrug)
                    : null,
            })),
            receipts: shipment.receipts.map((receipt) => ({
                id: receipt.id,
                confirmedAt: receipt.confirmedAt.toISOString(),
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

export type DrugOrderLookupPayload = ReturnType<typeof serializeDrugOrderLookup>;

async function loadDrugOrderLookupById(orderId: string) {
    return prisma.drugOrder.findUnique({
        where: { id: orderId },
        select: DRUG_ORDER_LOOKUP_SELECT,
    });
}

async function loadDrugOrderLookupByOrderNo(orderNo: string) {
    return prisma.drugOrder.findUnique({
        where: { orderNo },
        select: DRUG_ORDER_LOOKUP_SELECT,
    });
}

export async function resolveDrugOrderLookupByToken(params: {
    token: string;
    user: ActiveUserRecord;
}) {
    let payload;

    try {
        payload = verifyDrugOrderQrToken(params.token);
    } catch {
        throw new InvalidDrugOrderLookupTokenError();
    }

    const order = await loadDrugOrderLookupById(payload.orderId);
    if (!order) {
        throw new RouteError(404, "Không tìm thấy đơn dự trù");
    }

    assertCanViewDrugOrderLookup(order, params.user);
    return serializeDrugOrderLookup(order);
}

export async function resolveDrugOrderLookupByOrderNo(params: {
    orderNo: string;
    user: ActiveUserRecord;
}) {
    const orderNo = params.orderNo.trim();
    if (!orderNo) {
        return null;
    }

    const order = await loadDrugOrderLookupByOrderNo(orderNo);
    if (!order) {
        throw new RouteError(404, "Không tìm thấy đơn dự trù");
    }

    assertCanViewDrugOrderLookup(order, params.user);
    return serializeDrugOrderLookup(order);
}
