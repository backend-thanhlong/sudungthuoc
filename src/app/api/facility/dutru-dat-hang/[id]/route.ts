import { NextResponse } from "next/server";
import {
    loadFacilityDrugOrderDetailPayload,
    parseBaseReportMonth,
    parseDraftLineInputs,
    parseDraftNote,
    updateFacilityDrugOrderDraft,
} from "@/lib/drug-orders/facility";
import { ACTIONS, ENTITY_TYPES, logActivity } from "@/lib/activity-log";
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
        const { user } = await requireActiveSessionUser("FACILITY");
        const { id } = await params;
        const response = await loadFacilityDrugOrderDetailPayload({
            facilityId: user.id,
            orderId: id,
        });

        return NextResponse.json(response);
    } catch (error) {
        return handleRouteError(error, "Error loading facility drug order detail:");
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { user } = await requireActiveSessionUser("FACILITY");
        const { id } = await params;
        const body = await request.json();

        const response = await updateFacilityDrugOrderDraft({
            facilityId: user.id,
            orderId: id,
            baseReportMonth: parseBaseReportMonth(body.baseReportMonth),
            note: parseDraftNote(body.note),
            lines: parseDraftLineInputs(body.lines),
        });

        logActivity({
            userId: user.id,
            action: ACTIONS.UPDATE,
            entityType: ENTITY_TYPES.DRUG_ORDER,
            entityId: response.order.id,
            details: {
                orderNo: response.order.orderNo,
                lineCount: response.order.lines.length,
                baseReportMonth: response.order.baseReportMonth,
            },
        });

        return NextResponse.json(response);
    } catch (error) {
        return handleRouteError(error, "Error updating facility drug order draft:");
    }
}
