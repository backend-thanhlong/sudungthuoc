import { NextResponse } from "next/server";
import { ACTIONS, ENTITY_TYPES, logActivity } from "@/lib/activity-log";
import { submitFacilityDrugOrder } from "@/lib/drug-orders/facility";
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
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { user } = await requireActiveSessionUser("FACILITY");
        const { id } = await params;
        const response = await submitFacilityDrugOrder({
            facilityId: user.id,
            orderId: id,
        });

        const facilityName = user.facilityName || user.username;

        logActivity({
            userId: user.id,
            action: ACTIONS.SUBMIT,
            entityType: ENTITY_TYPES.DRUG_ORDER,
            entityId: response.order.id,
            details: {
                orderNo: response.order.orderNo,
                companyId: response.order.companyId,
                companyName: response.order.company.name,
                lineCount: response.order.lines.length,
            },
        });

        createNotificationForAdmins(
            "DRUG_ORDER_SUBMITTED",
            "Có đơn dự trù mới",
            `${facilityName} đã gửi đơn ${response.order.orderNo} đến ${response.order.company.name}`,
            ENTITY_TYPES.DRUG_ORDER,
            response.order.id
        );

        createNotificationForCompany(
            response.order.companyId,
            "DRUG_ORDER_SUBMITTED",
            "Có đơn dự trù mới",
            `${facilityName} đã gửi đơn ${response.order.orderNo} cho công ty của bạn`,
            ENTITY_TYPES.DRUG_ORDER,
            response.order.id,
            "/dashboard/company/dutru-dat-hang"
        );

        return NextResponse.json(response);
    } catch (error) {
        return handleRouteError(error, "Error submitting facility drug order:");
    }
}
