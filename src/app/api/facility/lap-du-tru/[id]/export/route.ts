import { NextResponse } from "next/server";
import { ACTIONS, logActivity } from "@/lib/activity-log";
import { buildDemandPlanExportWorkbook } from "@/lib/facility-demand-plans";
import {
    isRouteError,
    requireActiveSessionUser,
} from "@/lib/server-authz";

export const runtime = "nodejs";

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
        const { plan, buffer, fileName } = await buildDemandPlanExportWorkbook(
            id,
            user.id
        );

        logActivity({
            userId: user.id,
            action: ACTIONS.EXPORT,
            entityType: ENTITY_TYPE,
            entityId: plan.id,
            details: { planNo: plan.planNo },
        });

        return new NextResponse(buffer, {
            headers: {
                "Content-Type":
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="${fileName}"`,
            },
        });
    } catch (error) {
        return handleRouteError(error, "Error exporting facility demand plan:");
    }
}
