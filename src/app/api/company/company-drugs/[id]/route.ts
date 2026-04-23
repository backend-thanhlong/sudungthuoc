import { NextResponse } from "next/server";
import { ACTIONS, ENTITY_TYPES, logActivity } from "@/lib/activity-log";
import {
    deleteCompanyDrugCatalogItem,
    parseCompanyDrugCatalogPayload,
    updateCompanyDrugCatalogItem,
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

export async function PATCH(
    request: Request,
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
        const body = await request.json();
        const response = await updateCompanyDrugCatalogItem({
            companyId: user.companyId,
            companyDrugId: id,
            input: parseCompanyDrugCatalogPayload(body),
        });

        logActivity({
            userId: user.id,
            action: ACTIONS.UPDATE,
            entityType: ENTITY_TYPES.COMPANY_DRUG,
            entityId: response.item.id,
            details: {
                companyDrugCode: response.item.companyDrugCode,
                companyDrugName: response.item.companyDrugName,
                masterDrugId: response.item.masterDrugId,
                isActive: response.item.isActive,
            },
        });

        return NextResponse.json(response);
    } catch (error) {
        return handleRouteError(error, "Error updating company drug:");
    }
}

export async function DELETE(
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
        const response = await deleteCompanyDrugCatalogItem({
            companyId: user.companyId,
            companyDrugId: id,
        });

        logActivity({
            userId: user.id,
            action: ACTIONS.DELETE,
            entityType: ENTITY_TYPES.COMPANY_DRUG,
            entityId: response.deletedItem.id,
            details: {
                companyDrugCode: response.deletedItem.companyDrugCode,
                companyDrugName: response.deletedItem.companyDrugName,
                masterDrugId: response.deletedItem.masterDrugId,
                isActive: response.deletedItem.isActive,
                message: `Xóa thuốc công ty ${response.deletedItem.companyDrugCode}`,
            },
        });

        return NextResponse.json({
            message: "Đã xóa thuốc công ty",
            ...response,
        });
    } catch (error) {
        return handleRouteError(error, "Error deleting company drug:");
    }
}
