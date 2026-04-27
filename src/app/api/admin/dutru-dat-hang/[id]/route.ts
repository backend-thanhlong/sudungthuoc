import { NextResponse } from "next/server";
import { ACTIONS, ENTITY_TYPES, logActivity } from "@/lib/activity-log";
import {
    deleteAdminDrugOrder,
    loadAdminDrugOrderDetailPayload,
} from "@/lib/drug-orders/admin";
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

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await requireActiveSessionUser("ADMIN");
        const { id } = await params;
        const response = await loadAdminDrugOrderDetailPayload(id);
        return NextResponse.json(response);
    } catch (error) {
        return handleRouteError(error, "Error loading admin drug order detail:");
    }
}

export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { user } = await requireActiveSessionUser("ADMIN");
        const { id } = await params;
        const response = await deleteAdminDrugOrder(id);

        logActivity({
            userId: user.id,
            action: ACTIONS.DELETE,
            entityType: ENTITY_TYPES.DRUG_ORDER,
            entityId: response.deletedOrder.id,
            details: {
                orderNo: response.deletedOrder.orderNo,
                orderStatus: response.deletedOrder.status,
                facilityId: response.deletedOrder.facilityId,
                facilityName: response.deletedOrder.facility.facilityName,
                companyId: response.deletedOrder.companyId,
                companyName: response.deletedOrder.company.name,
                lineCount: response.deletedOrder.lineCount,
                shipmentCount: response.deletedOrder.shipmentCount,
                receiptCount: response.deletedOrder.receiptCount,
                totalRequestedQty: response.deletedOrder.totalRequestedQty,
                totalAcceptedQty: response.deletedOrder.totalAcceptedQty,
                totalShippedQty: response.deletedOrder.totalShippedQty,
                totalReceivedQty: response.deletedOrder.totalReceivedQty,
                message: `Admin xóa đơn dự trù ${response.deletedOrder.orderNo}`,
            },
        });

        return NextResponse.json({
            message: "Đã xóa đơn dự trù đặt hàng",
            ...response,
        });
    } catch (error) {
        return handleRouteError(error, "Error deleting admin drug order:");
    }
}
