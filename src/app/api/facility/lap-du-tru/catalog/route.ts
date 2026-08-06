import { NextResponse } from "next/server";
import {
    loadFacilityDemandPlanCatalogPayload,
    parseDemandPlanBaseReportMonth,
    parseDemandPlanExportMonths,
} from "@/lib/facility-demand-plans";
import { normalizeOptionalText } from "@/lib/drug-orders/utils";
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
        const { user } = await requireActiveSessionUser("FACILITY");
        const { searchParams } = new URL(request.url);
        const response = await loadFacilityDemandPlanCatalogPayload({
            facilityId: user.id,
            baseReportMonth: parseDemandPlanBaseReportMonth(
                searchParams.get("baseReportMonth")
            ),
            companyName: normalizeOptionalText(searchParams.get("companyName")),
            exportMonths: parseDemandPlanExportMonths(
                searchParams.getAll("exportMonths")
            ),
        });

        return NextResponse.json(response);
    } catch (error) {
        return handleRouteError(error, "Error loading facility demand catalog:");
    }
}
