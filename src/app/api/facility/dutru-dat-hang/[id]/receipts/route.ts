import { NextResponse } from "next/server";
import { ACTIONS, ENTITY_TYPES, logActivity } from "@/lib/activity-log";
import {
    confirmFacilityDrugOrderReceipt,
    parseReceiptLineInputs,
    parseReceiptNote,
    parseReceiptShipmentId,
} from "@/lib/drug-orders/facility";
import {
    createNotificationForAdmins,
    createNotificationForCompany,
} from "@/lib/notifications";
import {
    isRouteError,
    requireActiveSessionUser,
} from "@/lib/server-authz";

const handleRouteError = (error: unknown, context: string) => {
    if (isRouteError(error)) {
        return NextResponse.json({ message: error.message }, { status: error.status });
    }

    console.error(context, error);
    return NextResponse.json(
        { message: "Internal server error" },
        { status: 500 }
    );
};

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { user } = await requireActiveSessionUser("FACILITY");
        const { id } = await params;
        const body = await request.json();
        const shipmentId = parseReceiptShipmentId(body.shipmentId);

        const response = await confirmFacilityDrugOrderReceipt({
            facilityId: user.id,
            orderId: id,
            shipmentId,
            note: parseReceiptNote(body.note),
            lines: parseReceiptLineInputs(body.lines),
        });

        const facilityName = user.facilityName || user.username;
        const shipment = response.order.shipments.find(
            (item: { id: string }) => item.id === shipmentId
        );
        const isCompleted = response.order.status === "COMPLETED";

        logActivity({
            userId: user.id,
            action: ACTIONS.CONFIRM,
            entityType: ENTITY_TYPES.DRUG_ORDER_RECEIPT,
            entityId: shipment?.receipts?.[0]?.id,
            details: {
                orderId: response.order.id,
                orderNo: response.order.orderNo,
                shipmentId,
                shipmentNo: shipment?.shipmentNo,
                orderStatus: response.order.status,
            },
        });

        createNotificationForCompany(
            response.order.companyId,
            isCompleted ? "DRUG_ORDER_COMPLETED" : "DRUG_ORDER_RECEIPT_CONFIRMED",
            isCompleted ? "Đơn đã hoàn tất" : "Cơ sở đã xác nhận thực nhận",
            isCompleted
                ? `${facilityName} đã xác nhận đủ và hoàn tất đơn ${response.order.orderNo}`
                : `${facilityName} đã xác nhận thực nhận cho đợt giao #${shipment?.shipmentNo || "?"} của đơn ${response.order.orderNo}`,
            ENTITY_TYPES.DRUG_ORDER,
            response.order.id,
            "/dashboard/company/dutru-dat-hang"
        );

        createNotificationForAdmins(
            isCompleted ? "DRUG_ORDER_COMPLETED" : "DRUG_ORDER_RECEIPT_CONFIRMED",
            isCompleted ? "Đơn đã hoàn tất" : "Có xác nhận thực nhận mới",
            isCompleted
                ? `${facilityName} đã hoàn tất đơn ${response.order.orderNo}`
                : `${facilityName} đã xác nhận thực nhận cho đơn ${response.order.orderNo}`,
            ENTITY_TYPES.DRUG_ORDER,
            response.order.id
        );

        return NextResponse.json(response, { status: 201 });
    } catch (error) {
        return handleRouteError(error, "Error confirming facility drug order receipt:");
    }
}
