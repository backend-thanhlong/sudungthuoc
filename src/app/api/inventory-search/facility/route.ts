import { auth } from "@/auth";
import { searchInventoryByFacility } from "@/lib/inventory-search/server";
import type { FacilitySortOption } from "@/lib/inventory-search/types";
import { NextRequest, NextResponse } from "next/server";

const FACILITY_SORTS: FacilitySortOption[] = ["drugNameAsc", "currentStockDesc", "priceVATAsc"];

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
        const facilityId = searchParams.get("facilityId");
        if (!facilityId) {
            return NextResponse.json({ error: "Missing facilityId" }, { status: 400 });
        }

        const query = searchParams.get("q") || "";
        const page = parsePositiveInt(searchParams.get("page"), 1);
        const limit = Math.min(parsePositiveInt(searchParams.get("limit"), 20), 100);
        const requestedSort = (searchParams.get("sort") || "drugNameAsc") as FacilitySortOption;
        const sort = FACILITY_SORTS.includes(requestedSort) ? requestedSort : "drugNameAsc";

        const data = await searchInventoryByFacility({
            facilityId,
            query,
            page,
            limit,
            sort,
        });

        return NextResponse.json(data);
    } catch (error) {
        console.error("Facility inventory search error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
