import { NextResponse } from "next/server";
import { loadAdminDrugOrderListPayload } from "@/lib/drug-orders/admin";
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
        await requireActiveSessionUser("ADMIN");
        const { searchParams } = new URL(request.url);
        const response = await loadAdminDrugOrderListPayload(searchParams);
        return NextResponse.json(response);
    } catch (error) {
        return handleRouteError(error, "Error loading admin drug orders:");
    }
}
