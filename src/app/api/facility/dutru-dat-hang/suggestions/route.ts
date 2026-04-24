import { NextResponse } from "next/server";
import { loadFacilityDrugOrderSuggestionsPayload } from "@/lib/drug-orders/suggestions";
import {
    normalizeText,
    parseReportMonthValue,
} from "@/lib/drug-orders/utils";
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

function parseOptionalBaseReportMonth(value: string | null) {
    const normalized = normalizeText(value);
    if (!normalized) {
        return null;
    }

    if (parseReportMonthValue(normalized) === null) {
        throw new Error("Tháng gốc XNT không hợp lệ");
    }

    return normalized;
}

export async function GET(request: Request) {
    try {
        const { user } = await requireActiveSessionUser("FACILITY");

        const { searchParams } = new URL(request.url);
        const companyId = normalizeText(searchParams.get("companyId"));
        const orderId = normalizeText(searchParams.get("orderId")) || null;
        const includeAllCatalog = searchParams.get("includeAllCatalog") === "1";

        if (!companyId) {
            return NextResponse.json(
                { message: "Vui lòng chọn công ty cung ứng" },
                { status: 400 }
            );
        }

        let baseReportMonth: string | null;
        try {
            baseReportMonth = parseOptionalBaseReportMonth(
                searchParams.get("baseReportMonth")
            );
        } catch {
            return NextResponse.json(
                { message: "Tháng gốc XNT không hợp lệ" },
                { status: 400 }
            );
        }

        const response = await loadFacilityDrugOrderSuggestionsPayload({
            facilityId: user.id,
            companyId,
            baseReportMonth,
            orderId,
            includeAllCatalog,
        });

        return NextResponse.json(response);
    } catch (error) {
        return handleRouteError(
            error,
            "Error loading facility drug order suggestions:"
        );
    }
}
