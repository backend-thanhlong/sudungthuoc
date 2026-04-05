import { auth } from "@/auth";
import { compareDrugAcrossFacilities } from "@/lib/inventory-search/server";
import { NextRequest, NextResponse } from "next/server";

const parseFacilityIds = (searchParams: URLSearchParams) =>
    searchParams
        .getAll("facilityIds")
        .flatMap((value) => value.split(","))
        .map((value) => value.trim())
        .filter(Boolean);

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const masterDrugId = searchParams.get("masterDrugId") || undefined;
        const maChung = searchParams.get("maChung") || undefined;
        const facilityIds = parseFacilityIds(searchParams);

        if (!masterDrugId && !maChung) {
            return NextResponse.json({ error: "Missing drug selection" }, { status: 400 });
        }

        if (facilityIds.length < 2) {
            return NextResponse.json({ error: "Select at least 2 facilities" }, { status: 400 });
        }

        const data = await compareDrugAcrossFacilities({
            masterDrugId,
            maChung,
            facilityIds,
        });

        if (!data) {
            return NextResponse.json({ error: "Comparison data not found" }, { status: 404 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("Inventory compare error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
