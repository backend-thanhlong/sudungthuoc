import { NextResponse } from "next/server";
import { ACTIONS, logActivity } from "@/lib/activity-log";
import { finalizeFacilityDemandPlan } from "@/lib/facility-demand-plans";
import {
    isRouteError,
    requireActiveSessionUser,
} from "@/lib/server-authz";

const ENTITY_TYPE = "facility_demand_plan";

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
        const response = await finalizeFacilityDemandPlan({
            facilityId: user.id,
            planId: id,
        });

        logActivity({
            userId: user.id,
            action: ACTIONS.CONFIRM,
            entityType: ENTITY_TYPE,
            entityId: response.plan.id,
            details: {
                planNo: response.plan.planNo,
                lineCount: response.plan.lines.length,
            },
        });

        return NextResponse.json(response);
    } catch (error) {
        return handleRouteError(error, "Error finalizing facility demand plan:");
    }
}
