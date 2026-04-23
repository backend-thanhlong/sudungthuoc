import { NextResponse } from "next/server";
import { ACTIONS, ENTITY_TYPES, logActivity } from "@/lib/activity-log";
import { recallFacilityDrugOrder } from "@/lib/drug-orders/facility";
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
        const response = await recallFacilityDrugOrder({
            facilityId: user.id,
            orderId: id,
        });

        const facilityName = user.facilityName || user.username;

        logActivity({
            userId: user.id,
            action: ACTIONS.RECALL,
            entityType: ENTITY_TYPES.DRUG_ORDER,
            entityId: response.order.id,
            details: {
                orderNo: response.order.orderNo,
                companyId: response.order.companyId,
                companyName: response.order.company.name,
            },
        });

        createNotificationForAdmins(
            "DRUG_ORDER_RECALLED",
            "Đơn dự trù đã bị thu hồi",
            `${facilityName} đã thu hồi đơn ${response.order.orderNo}`,
            ENTITY_TYPES.DRUG_ORDER,
            response.order.id
        );

        createNotificationForCompany(
            response.order.companyId,
            "DRUG_ORDER_RECALLED",
            "Đơn dự trù đã bị thu hồi",
            `${facilityName} đã thu hồi đơn ${response.order.orderNo}`,
            ENTITY_TYPES.DRUG_ORDER,
            response.order.id,
            "/dashboard/company/dutru-dat-hang"
        );

        return NextResponse.json(response);
    } catch (error) {
        return handleRouteError(error, "Error recalling facility drug order:");
    }
}
