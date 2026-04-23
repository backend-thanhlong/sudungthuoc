import { NextResponse } from "next/server";
import { loadCompanyDrugOrderListPayload } from "@/lib/drug-orders/company";
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

export async function GET() {
    try {
        const { user } = await requireActiveSessionUser("COMPANY");
        if (!user.companyId) {
            return NextResponse.json(
                { message: "Tài khoản công ty chưa được gán công ty" },
                { status: 403 }
            );
        }

        const response = await loadCompanyDrugOrderListPayload(user.companyId);
        return NextResponse.json(response);
    } catch (error) {
        return handleRouteError(error, "Error loading company drug orders:");
    }
}
