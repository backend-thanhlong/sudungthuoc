import { NextResponse } from "next/server";
import { loadFacilityDemandPlanXntHistoryPayload } from "@/lib/facility-demand-plans";
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

export async function GET(request: Request) {
    try {
        const { user } = await requireActiveSessionUser("FACILITY");
        const { searchParams } = new URL(request.url);
        const response = await loadFacilityDemandPlanXntHistoryPayload({
            facilityId: user.id,
            mapId: searchParams.get("mapId") || "",
        });

        return NextResponse.json(response);
    } catch (error) {
        return handleRouteError(error, "Error loading facility demand plan XNT history:");
    }
}
