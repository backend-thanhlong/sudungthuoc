import { NextResponse } from "next/server";
import { loadAdminDemandPlanDetailPayload } from "@/lib/facility-demand-plans";
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
        const response = await loadAdminDemandPlanDetailPayload(id);
        return NextResponse.json(response);
    } catch (error) {
        return handleRouteError(error, "Error loading admin demand plan detail:");
    }
}
