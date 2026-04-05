import { auth } from "@/auth";
import { searchDrugOptions } from "@/lib/inventory-search/server";
import { NextRequest, NextResponse } from "next/server";

const parsePositiveInt = (value: string | null, fallback: number) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 1) return fallback;
    return Math.floor(parsed);
};

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const query = searchParams.get("q") || "";
        const limit = Math.min(parsePositiveInt(searchParams.get("limit"), 10), 20);

        const results = await searchDrugOptions({
            query,
            limit,
        });

        return NextResponse.json({ results });
    } catch (error) {
        console.error("Drug options search error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
