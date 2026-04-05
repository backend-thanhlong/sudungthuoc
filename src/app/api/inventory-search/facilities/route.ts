import { auth } from "@/auth";
import { listInventoryFacilities } from "@/lib/inventory-search/server";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const facilities = await listInventoryFacilities();
        return NextResponse.json({ results: facilities });
    } catch (error) {
        console.error("Inventory facilities list error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
