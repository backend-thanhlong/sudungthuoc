import { NextResponse } from "next/server";
import {
    createFacilityDrugOrderDraft,
    loadFacilityDrugOrderListPayload,
    parseBaseReportMonth,
    parseDraftNote,
} from "@/lib/drug-orders/facility";
import { normalizeText } from "@/lib/drug-orders/utils";
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

export async function GET() {
    try {
        const { user } = await requireActiveSessionUser("FACILITY");
        const response = await loadFacilityDrugOrderListPayload(user.id);
        return NextResponse.json(response);
    } catch (error) {
        return handleRouteError(error, "Error loading facility drug orders:");
    }
}

export async function POST(request: Request) {
    try {
        const { user } = await requireActiveSessionUser("FACILITY");
        const body = await request.json();
        const companyId = normalizeText(body.companyId);

        if (!companyId) {
            return NextResponse.json(
                { message: "Vui lòng chọn công ty cung ứng" },
                { status: 400 }
            );
        }

        const response = await createFacilityDrugOrderDraft({
            facilityId: user.id,
            companyId,
            baseReportMonth: parseBaseReportMonth(body.baseReportMonth),
            note: parseDraftNote(body.note),
        });

        logActivity({
            userId: user.id,
            action: ACTIONS.CREATE,
            entityType: ENTITY_TYPES.DRUG_ORDER,
            entityId: response.order.id,
            details: {
                orderNo: response.order.orderNo,
                companyId: response.order.companyId,
                companyName: response.order.company.name,
            },
        });

        return NextResponse.json(response, { status: 201 });
    } catch (error) {
        return handleRouteError(error, "Error creating facility drug order draft:");
    }
}
