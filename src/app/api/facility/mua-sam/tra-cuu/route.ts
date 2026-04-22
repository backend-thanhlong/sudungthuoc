import { NextRequest, NextResponse } from "next/server";
import {
    isRouteError,
    requireActiveSessionUser,
} from "@/lib/server-authz";
import {
    loadProcurementLookupResponse,
    parseProcurementLookupQuery,
} from "@/lib/mua-sam-procurement-lookup";

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

export async function GET(request: NextRequest) {
    try {
        const { user } = await requireActiveSessionUser("FACILITY");

        const { searchParams } = new URL(request.url);
        const parsedQuery = parseProcurementLookupQuery(searchParams);
        const response = await loadProcurementLookupResponse({
            query: {
                ...parsedQuery,
                facilityId: user.id,
            },
            includeFacilities: false,
        });

        return NextResponse.json(response);
    } catch (error: unknown) {
        return handleRouteError(error, "Error loading facility procurement lookup:");
    }
}
