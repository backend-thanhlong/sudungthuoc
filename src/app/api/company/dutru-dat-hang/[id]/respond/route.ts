import { NextResponse } from "next/server";
import { ACTIONS, ENTITY_TYPES, logActivity } from "@/lib/activity-log";
import {
    loadCompanyDrugOrderDetailPayload,
    parseCompanyOrderResponses,
    respondToCompanyDrugOrder,
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
        const response = await respondToCompanyDrugOrder({
            companyId: user.companyId,
            orderId: id,
            responses: parseCompanyOrderResponses(body.responses),
        });

        const latestOrder = await loadCompanyDrugOrderDetailPayload({
            companyId: user.companyId,
            orderId: id,
        });
        const isRejected = latestOrder.order.status === "REJECTED";
        const title = isRejected ? "Đơn đã bị từ chối" : "Công ty đã phản hồi đơn";
        const message = isRejected
            ? `${latestOrder.order.orderNo} đã bị công ty từ chối toàn bộ`
            : `${latestOrder.order.orderNo} đã được công ty phản hồi và sẵn sàng giao`;

        logActivity({
            userId: user.id,
            action: ACTIONS.UPDATE,
            entityType: ENTITY_TYPES.DRUG_ORDER,
            entityId: response.order.id,
            details: {
                orderNo: response.order.orderNo,
                orderStatus: response.order.status,
                facilityId: response.order.facilityId,
                lineCount: response.order.lines.length,
            },
        });

        if (isRejected) {
            logActivity({
                userId: user.id,
                action: ACTIONS.REJECT,
                entityType: ENTITY_TYPES.DRUG_ORDER,
                entityId: response.order.id,
                details: {
                    orderNo: response.order.orderNo,
                    facilityId: response.order.facilityId,
                },
            });
        }

        createNotificationForFacility(
            response.order.facilityId,
            isRejected ? "DRUG_ORDER_REJECTED" : "DRUG_ORDER_RESPONDED",
            title,
            message,
            ENTITY_TYPES.DRUG_ORDER,
            response.order.id,
            "/dashboard/facility/dutru-dat-hang"
        );

        createNotificationForAdmins(
            isRejected ? "DRUG_ORDER_REJECTED" : "DRUG_ORDER_RESPONDED",
            title,
            `${user.company?.name || user.username}: ${message}`,
            ENTITY_TYPES.DRUG_ORDER,
            response.order.id
        );

        return NextResponse.json(response);
    } catch (error) {
        return handleRouteError(error, "Error responding to company drug order:");
    }
}
