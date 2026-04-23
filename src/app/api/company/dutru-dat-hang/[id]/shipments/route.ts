import { NextResponse } from "next/server";
import { ACTIONS, ENTITY_TYPES, logActivity } from "@/lib/activity-log";
import {
    createCompanyDrugOrderShipment,
    parseCompanyShipmentLines,
    parseCompanyShipmentNote,
    parseShipmentTimestamp,
} from "@/lib/drug-orders/company";
import {
    createNotificationForAdmins,
    createNotificationForFacility,
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
        const { user } = await requireActiveSessionUser("COMPANY");
        if (!user.companyId) {
            return NextResponse.json(
                { message: "Tài khoản công ty chưa được gán công ty" },
                { status: 403 }
            );
        }

        const { id } = await params;
        const body = await request.json();
        const response = await createCompanyDrugOrderShipment({
            companyId: user.companyId,
            orderId: id,
            shippedAt: parseShipmentTimestamp(body.shippedAt),
            companyNote: parseCompanyShipmentNote(body.companyNote),
            lines: parseCompanyShipmentLines(body.lines),
        });

        const latestShipment = response.order.shipments[0];

        logActivity({
            userId: user.id,
            action: ACTIONS.CREATE,
            entityType: ENTITY_TYPES.DRUG_ORDER_SHIPMENT,
            entityId: latestShipment?.id,
            details: {
                orderId: response.order.id,
                orderNo: response.order.orderNo,
                shipmentNo: latestShipment?.shipmentNo,
                shippedAt: latestShipment?.shippedAt,
                lineCount: latestShipment?.lines.length || 0,
            },
        });

        createNotificationForFacility(
            response.order.facilityId,
            "DRUG_ORDER_SHIPMENT_CREATED",
            "Có đợt giao hàng mới",
            `Đơn ${response.order.orderNo} đã có đợt giao số ${latestShipment?.shipmentNo || "mới"}`,
            ENTITY_TYPES.DRUG_ORDER,
            response.order.id,
            "/dashboard/facility/dutru-dat-hang"
        );

        createNotificationForAdmins(
            "DRUG_ORDER_SHIPMENT_CREATED",
            "Có đợt giao hàng mới",
            `${user.company?.name || user.username} đã tạo đợt giao cho đơn ${response.order.orderNo}`,
            ENTITY_TYPES.DRUG_ORDER,
            response.order.id
        );

        return NextResponse.json(response, { status: 201 });
    } catch (error) {
        return handleRouteError(error, "Error creating company shipment:");
    }
}
