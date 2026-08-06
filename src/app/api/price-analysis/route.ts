import { NextResponse } from "next/server";
import { loadPriceAnalysisPayload } from "@/lib/price-analysis";
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
        const { user } = await requireActiveSessionUser();
        const response = await loadPriceAnalysisPayload(user);

        return NextResponse.json(response);
    } catch (error) {
        return handleRouteError(error, "Error loading price analysis:");
    }
}
