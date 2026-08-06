import { NextResponse } from "next/server";
import { getStoredChartColorSettings } from "@/lib/chart-colors-server";
import { isRouteError, requireActiveSessionUser } from "@/lib/server-authz";

export async function GET() {
    try {
        await requireActiveSessionUser();
        const stored = await getStoredChartColorSettings();

        return NextResponse.json({
            settings: stored.settings,
        });
    } catch (error) {
        if (isRouteError(error)) {
            return NextResponse.json({ message: error.message }, { status: error.status });
        }

        console.error("Error fetching chart colors:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
