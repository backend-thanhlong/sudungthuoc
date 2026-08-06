import { NextResponse } from "next/server";
import { getPublicDashboardData, PublicDashboardError } from "@/lib/public-dashboard";

export const revalidate = 300;

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const reportMonth = searchParams.get("reportMonth") || undefined;

    try {
        const data = await getPublicDashboardData(reportMonth);
        return NextResponse.json(data);
    } catch (error) {
        if (error instanceof PublicDashboardError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }

        console.error("Public dashboard error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
