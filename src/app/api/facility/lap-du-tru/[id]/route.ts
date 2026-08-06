import { NextResponse } from "next/server";
import { ACTIONS, logActivity } from "@/lib/activity-log";
import {
    deleteFacilityDemandPlan,
    loadFacilityDemandPlanDetailPayload,
    parseDemandPlanBaseReportMonth,
    parseDemandPlanLineInputs,
    parseDemandPlanNote,
    updateFacilityDemandPlan,
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

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { user } = await requireActiveSessionUser("FACILITY");
        const { id } = await params;
        const response = await loadFacilityDemandPlanDetailPayload({
            facilityId: user.id,
            planId: id,
        });

        return NextResponse.json(response);
    } catch (error) {
        return handleRouteError(error, "Error loading facility demand plan detail:");
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
        const response = await updateFacilityDemandPlan({
            facilityId: user.id,
            planId: id,
            baseReportMonth: parseDemandPlanBaseReportMonth(body.baseReportMonth),
            note: parseDemandPlanNote(body.note),
            lines: parseDemandPlanLineInputs(body.lines),
        });

        logActivity({
            userId: user.id,
            action: ACTIONS.UPDATE,
            entityType: ENTITY_TYPE,
            entityId: response.plan.id,
            details: {
                planNo: response.plan.planNo,
                lineCount: response.plan.lines.length,
                baseReportMonth: response.plan.baseReportMonth,
            },
        });

        return NextResponse.json(response);
    } catch (error) {
        return handleRouteError(error, "Error updating facility demand plan:");
    }
}

export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { user } = await requireActiveSessionUser("FACILITY");
        const { id } = await params;
        const response = await deleteFacilityDemandPlan({
            facilityId: user.id,
            planId: id,
        });

        logActivity({
            userId: user.id,
            action: ACTIONS.DELETE,
            entityType: ENTITY_TYPE,
            entityId: id,
        });

        return NextResponse.json(response);
    } catch (error) {
        return handleRouteError(error, "Error deleting facility demand plan:");
    }
}
