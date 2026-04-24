import { NextResponse } from "next/server";
import { normalizeText } from "@/lib/drug-orders/utils";
import { loadFacilityCompanyDrugCatalogPayload } from "@/lib/drug-orders/facility";
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

export async function GET(request: Request) {
    try {
        await requireActiveSessionUser("FACILITY");

        const { searchParams } = new URL(request.url);
        const companyId = normalizeText(searchParams.get("companyId"));

        if (!companyId) {
            return NextResponse.json(
                { message: "Vui lòng chọn công ty cung ứng" },
                { status: 400 }
            );
        }

        const response = await loadFacilityCompanyDrugCatalogPayload(companyId);
        return NextResponse.json(response);
    } catch (error) {
        return handleRouteError(
            error,
            "Error loading facility drug order company catalog:"
        );
    }
}
