import { auth } from "@/auth";
import { searchInventoryByDrug } from "@/lib/inventory-search/server";
import type { DrugSortOption } from "@/lib/inventory-search/types";
import { NextRequest, NextResponse } from "next/server";

const DRUG_SORTS: DrugSortOption[] = ["drugNameAsc", "totalStockDesc", "facilityCountDesc"];

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
        const page = parsePositiveInt(searchParams.get("page"), 1);
        const limit = Math.min(parsePositiveInt(searchParams.get("limit"), 20), 100);
        const requestedSort = (searchParams.get("sort") || "drugNameAsc") as DrugSortOption;
        const sort = DRUG_SORTS.includes(requestedSort) ? requestedSort : "drugNameAsc";
        const controlledSpecial = searchParams.get("controlledSpecial") === "true";
        const rareDrug = searchParams.get("rareDrug") === "true";

        const data = await searchInventoryByDrug({
            query,
            page,
            limit,
            sort,
            controlledSpecial,
            rareDrug,
        });

        return NextResponse.json(data);
    } catch (error) {
        console.error("Drug inventory search error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
