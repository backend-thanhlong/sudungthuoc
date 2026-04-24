import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import DrugOrderPrintDocument from "@/components/drug-orders/DrugOrderPrintDocument";
import { loadFacilityDrugOrderPrintPayload } from "@/lib/drug-orders/facility";
import {
    isRouteError,
    requireActiveSessionUser,
} from "@/lib/server-authz";

function getForwardedHeaderValue(value: string | null) {
    return value?.split(",")[0]?.trim() || null;
}

async function buildAbsoluteLookupUrl(path: string) {
    const requestHeaders = await headers();
    const host =
        getForwardedHeaderValue(requestHeaders.get("x-forwarded-host")) ||
        requestHeaders.get("host");
    const proto =
        getForwardedHeaderValue(requestHeaders.get("x-forwarded-proto")) || "https";

    if (!host) {
        return path;
    }

    return new URL(path, `${proto}://${host}`).toString();
}

async function loadPrintPageData(orderId: string) {
    try {
        const { user } = await requireActiveSessionUser("FACILITY");
        const payload = await loadFacilityDrugOrderPrintPayload({
            facilityId: user.id,
            orderId,
        });
        const lookupUrl = await buildAbsoluteLookupUrl(payload.order.lookupUrl);

        return { payload, lookupUrl };
    } catch (error) {
        if (isRouteError(error)) {
            if (error.status === 404) {
                notFound();
            }

            if (error.status === 401 || error.status === 403) {
                redirect("/login?reauth=1");
            }
        }

        throw error;
    }
}

export default async function FacilityDrugOrderPrintPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const { payload, lookupUrl } = await loadPrintPageData(id);

    return <DrugOrderPrintDocument payload={payload} lookupUrl={lookupUrl} />;
}
