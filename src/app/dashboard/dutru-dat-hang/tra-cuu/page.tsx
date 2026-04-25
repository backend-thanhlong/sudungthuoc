import DrugOrderLookupResult from "@/components/drug-orders/DrugOrderLookupResult";
import DrugOrderQrScannerDialog from "@/components/drug-orders/DrugOrderQrScannerDialog";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    type DrugOrderLookupPayload,
    isInvalidDrugOrderLookupTokenError,
    resolveDrugOrderLookupByOrderNo,
    resolveDrugOrderLookupByToken,
} from "@/lib/drug-orders/lookup";
import {
    isRouteError,
    requireActiveSessionUser,
} from "@/lib/server-authz";

type SearchParams = Record<string, string | string[] | undefined>;

type LookupState =
    | { kind: "empty" }
    | { kind: "result"; payload: DrugOrderLookupPayload }
    | { kind: "error"; message: string };

function getSingleParam(searchParams: SearchParams, key: string) {
    const value = searchParams[key];
    if (Array.isArray(value)) {
        return value[0] || "";
    }

    return value || "";
}

async function resolveLookupState(searchParams: SearchParams): Promise<LookupState> {
    const { user } = await requireActiveSessionUser();
    const token = getSingleParam(searchParams, "t").trim();
    const orderNo = getSingleParam(searchParams, "orderNo").trim();

    try {
        if (token) {
            return {
                kind: "result",
                payload: await resolveDrugOrderLookupByToken({ token, user }),
            };
        }

        if (orderNo) {
            const payload = await resolveDrugOrderLookupByOrderNo({ orderNo, user });
            return payload ? { kind: "result", payload } : { kind: "empty" };
        }

        return { kind: "empty" };
    } catch (error) {
        if (isInvalidDrugOrderLookupTokenError(error)) {
            return {
                kind: "error",
                message: "QR không hợp lệ hoặc đã bị thay đổi",
            };
        }

        if (isRouteError(error) && [403, 404].includes(error.status)) {
            return {
                kind: "error",
                message: error.message,
            };
        }

        throw error;
    }
}

function LookupForm({ defaultOrderNo }: { defaultOrderNo: string }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Tra cứu QR đơn dự trù</CardTitle>
                <CardDescription>
                    Nhập mã đơn hoặc mở đường dẫn từ QR để xem thông tin đơn sau khi đăng nhập.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form method="GET" className="flex flex-col gap-3 sm:flex-row">
                    <Input
                        name="orderNo"
                        defaultValue={defaultOrderNo}
                        placeholder="Nhập mã đơn"
                        className="sm:max-w-md"
                    />
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <Button type="submit">Tra cứu</Button>
                        <DrugOrderQrScannerDialog />
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}

export default async function DrugOrderQrLookupPage({
    searchParams,
}: {
    searchParams?: Promise<SearchParams>;
}) {
    const resolvedSearchParams = searchParams ? await searchParams : {};
    const state = await resolveLookupState(resolvedSearchParams);
    const orderNo = getSingleParam(resolvedSearchParams, "orderNo").trim();

    return (
        <div className="space-y-6">
            <LookupForm defaultOrderNo={orderNo} />

            {state.kind === "empty" ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                    Chưa có mã đơn hoặc QR được chọn.
                </div>
            ) : null}

            {state.kind === "error" ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800">
                    {state.message}
                </div>
            ) : null}

            {state.kind === "result" ? (
                <DrugOrderLookupResult payload={state.payload} />
            ) : null}
        </div>
    );
}
