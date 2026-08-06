import { NextResponse } from "next/server";
import { ACTIONS, logActivity } from "@/lib/activity-log";
import {
    createFacilityDemandPlan,
    loadFacilityDemandPlanListPayload,
    parseDemandPlanBaseReportMonth,
    parseDemandPlanLineInputs,
    parseDemandPlanNote,
} from "@/lib/facility-demand-plans";
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

export async function GET() {
    try {
        const { user } = await requireActiveSessionUser("FACILITY");
        const response = await loadFacilityDemandPlanListPayload(user.id);
        return NextResponse.json(response);
    } catch (error) {
        return handleRouteError(error, "Error loading facility demand plans:");
    }
}

export async function POST(request: Request) {
    try {
        const { user } = await requireActiveSessionUser("FACILITY");
        const body = await request.json();
        const response = await createFacilityDemandPlan({
            facilityId: user.id,
            baseReportMonth: parseDemandPlanBaseReportMonth(body.baseReportMonth),
            note: parseDemandPlanNote(body.note),
            lines: parseDemandPlanLineInputs(body.lines),
        });

        logActivity({
            userId: user.id,
            action: ACTIONS.CREATE,
            entityType: ENTITY_TYPE,
            entityId: response.plan.id,
            details: {
                planNo: response.plan.planNo,
                lineCount: response.plan.lines.length,
                baseReportMonth: response.plan.baseReportMonth,
            },
        });

        return NextResponse.json(response, { status: 201 });
    } catch (error) {
        return handleRouteError(error, "Error creating facility demand plan:");
    }
}
