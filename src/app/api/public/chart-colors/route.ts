import { NextResponse } from "next/server";
import { getStoredChartColorSettings } from "@/lib/chart-colors-server";

export async function GET() {
    try {
        const stored = await getStoredChartColorSettings();

        return NextResponse.json({
            settings: stored.settings,
        });
    } catch (error) {
        console.error("Error fetching public chart colors:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
