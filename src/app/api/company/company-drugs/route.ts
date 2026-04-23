import { NextResponse } from "next/server";
import { ACTIONS, ENTITY_TYPES, logActivity } from "@/lib/activity-log";
import {
    createCompanyDrugCatalogItem,
    loadCompanyDrugCatalogPayload,
    parseCompanyDrugCatalogPayload,
} from "@/lib/drug-orders/company";
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
        const { user } = await requireActiveSessionUser("COMPANY");
        if (!user.companyId) {
            return NextResponse.json(
                { message: "Tài khoản công ty chưa được gán công ty" },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(request.url);
        const response = await loadCompanyDrugCatalogPayload({
            companyId: user.companyId,
            searchParams,
        });

        return NextResponse.json(response);
    } catch (error) {
        return handleRouteError(error, "Error loading company drug catalog:");
    }
}

export async function POST(request: Request) {
    try {
        const { user } = await requireActiveSessionUser("COMPANY");
        if (!user.companyId) {
            return NextResponse.json(
                { message: "Tài khoản công ty chưa được gán công ty" },
                { status: 403 }
            );
        }

        const body = await request.json();
        const response = await createCompanyDrugCatalogItem({
            companyId: user.companyId,
            input: parseCompanyDrugCatalogPayload(body),
        });

        logActivity({
            userId: user.id,
            action: ACTIONS.CREATE,
            entityType: ENTITY_TYPES.COMPANY_DRUG,
            entityId: response.item.id,
            details: {
                companyDrugCode: response.item.companyDrugCode,
                companyDrugName: response.item.companyDrugName,
                masterDrugId: response.item.masterDrugId,
            },
        });

        return NextResponse.json(response, { status: 201 });
    } catch (error) {
        return handleRouteError(error, "Error creating company drug:");
    }
}
