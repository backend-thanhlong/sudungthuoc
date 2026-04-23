import { NextResponse } from "next/server";
import { loadCompanyDrugOrderDetailPayload } from "@/lib/drug-orders/company";
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

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { user } = await requireActiveSessionUser("COMPANY");
        if (!user.companyId) {
            return NextResponse.json(
                { message: "Tài khoản công ty chưa được gán công ty" },
                { status: 403 }
            );
        }

        const { id } = await params;
        const response = await loadCompanyDrugOrderDetailPayload({
            companyId: user.companyId,
            orderId: id,
        });

        return NextResponse.json(response);
    } catch (error) {
        return handleRouteError(error, "Error loading company drug order detail:");
    }
}
