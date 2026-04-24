import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import type { DrugOrderLookupPayload } from "@/lib/drug-orders/lookup";
import { formatShipmentDateRangeLabel } from "@/lib/drug-orders/shipment-date-range";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

const ORDER_STATUS_META: Record<
    string,
    { label: string; variant: BadgeVariant; className?: string }
> = {
    DRAFT: { label: "Nháp", variant: "secondary" },
    SUBMITTED: { label: "Đã gửi", variant: "default" },
    REJECTED: { label: "Bị từ chối", variant: "destructive" },
    READY_FOR_SHIPMENT: {
        label: "Sẵn sàng giao",
        variant: "outline",
        className: "border-emerald-300 text-emerald-700",
    },
    IN_DELIVERY: {
        label: "Đang giao",
        variant: "outline",
        className: "border-blue-300 text-blue-700",
    },
    COMPLETED: {
        label: "Hoàn tất",
        variant: "outline",
        className: "border-emerald-300 text-emerald-700",
    },
};

const LINE_STATUS_META: Record<
    string,
    { label: string; variant: BadgeVariant; className?: string }
> = {
    PENDING: { label: "Chờ phản hồi", variant: "secondary" },
    PENDING_CATALOG_CONFIRMATION: {
        label: "Chờ xác nhận danh mục",
        variant: "outline",
        className: "border-amber-300 text-amber-700",
    },
    CONFIRMED: {
        label: "Xác nhận đủ",
        variant: "outline",
        className: "border-emerald-300 text-emerald-700",
    },
    PARTIAL: {
        label: "Một phần",
        variant: "outline",
        className: "border-blue-300 text-blue-700",
    },
    REJECTED: { label: "Từ chối", variant: "destructive" },
    COMPLETED: {
        label: "Hoàn tất",
        variant: "outline",
        className: "border-emerald-300 text-emerald-700",
    },
};

const SHIPMENT_STATUS_META: Record<
    string,
    { label: string; variant: BadgeVariant; className?: string }
> = {
    CREATED: { label: "Đã tạo", variant: "secondary" },
    PARTIALLY_RECEIVED: {
        label: "Nhận một phần",
        variant: "outline",
        className: "border-blue-300 text-blue-700",
    },
    RECEIVED: {
        label: "Đã nhận",
        variant: "outline",
        className: "border-emerald-300 text-emerald-700",
    },
};

function formatQuantity(value: number | null | undefined) {
    if (value === null || value === undefined) {
        return "—";
    }

    return new Intl.NumberFormat("vi-VN", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(value);
}

function formatDateTime(value: string | null | undefined) {
    if (!value) {
        return "—";
    }

    return new Date(value).toLocaleString("vi-VN");
}

function StatusBadge(props: {
    status: string;
    meta: Record<string, { label: string; variant: BadgeVariant; className?: string }>;
}) {
    const item = props.meta[props.status] || {
        label: props.status,
        variant: "outline" as const,
    };

    return (
        <Badge variant={item.variant} className={item.className}>
            {item.label}
        </Badge>
    );
}

function Field(props: { label: string; value: ReactNode }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">{props.label}</p>
            <div className="mt-2 font-semibold text-slate-900">{props.value}</div>
        </div>
    );
}

function masterDrugLabel(
    masterDrug: DrugOrderLookupPayload["lines"][number]["masterDrug"]
) {
    if (!masterDrug) {
        return "—";
    }

    return `${masterDrug.maChung} - ${masterDrug.tenThuoc}`;
}

function companyDrugLabel(
    companyDrug: DrugOrderLookupPayload["lines"][number]["companyDrug"]
) {
    if (!companyDrug) {
        return "—";
    }

    return `${companyDrug.companyDrugCode} - ${companyDrug.companyDrugName}`;
}

export default function DrugOrderLookupResult({
    payload,
}: {
    payload: DrugOrderLookupPayload;
}) {
    const { order, totals, lines, shipments } = payload;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                            <CardTitle>Thông tin đơn {order.orderNo}</CardTitle>
                            <CardDescription>
                                Dữ liệu tra cứu chỉ đọc theo quyền truy cập hiện tại.
                            </CardDescription>
                        </div>
                        <StatusBadge status={order.status} meta={ORDER_STATUS_META} />
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <Field label="Mã đơn" value={order.orderNo} />
                        <Field
                            label="Cơ sở"
                            value={
                                <div>
                                    <p>{order.facility.facilityName}</p>
                                    <p className="text-xs font-normal text-slate-500">
                                        {order.facility.facilityCode}
                                    </p>
                                </div>
                            }
                        />
                        <Field
                            label="Công ty"
                            value={
                                <div>
                                    <p>{order.company.name}</p>
                                    <p className="text-xs font-normal text-slate-500">
                                        {order.company.code}
                                    </p>
                                </div>
                            }
                        />
                        <Field label="Tháng XNT tham chiếu" value={order.baseReportMonth || "—"} />
                        <Field label="Tạo lúc" value={formatDateTime(order.createdAt)} />
                        <Field label="Gửi lúc" value={formatDateTime(order.submittedAt)} />
                        <Field label="Đóng lúc" value={formatDateTime(order.closedAt)} />
                        <Field label="Cập nhật" value={formatDateTime(order.updatedAt)} />
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                        <span className="font-medium text-slate-700">Ghi chú:</span>{" "}
                        {order.note || "Không có"}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <CardTitle>Tổng hợp giao nhận</CardTitle>
                            <CardDescription>Số lượng tổng hợp từ các dòng thuốc.</CardDescription>
                        </div>
                        <Badge variant="outline" className="border-blue-300 text-blue-700">
                            {payload.deliverySummaryLabel}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                        <Field label="Tổng số dòng" value={totals.lineCount} />
                        <Field label="Tổng yêu cầu" value={formatQuantity(totals.requestedQty)} />
                        <Field label="Tổng chấp nhận" value={formatQuantity(totals.acceptedQty)} />
                        <Field label="Tổng đã giao" value={formatQuantity(totals.shippedQty)} />
                        <Field label="Tổng đã nhận" value={formatQuantity(totals.receivedQty)} />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Chi tiết thuốc</CardTitle>
                    <CardDescription>Danh sách thuốc và tiến độ giao nhận theo từng dòng.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="min-w-[260px]">Thuốc</TableHead>
                                    <TableHead className="min-w-[220px]">Thuốc công ty</TableHead>
                                    <TableHead className="min-w-[220px]">Thuốc chuẩn</TableHead>
                                    <TableHead>Đơn vị</TableHead>
                                    <TableHead className="text-right">Yêu cầu</TableHead>
                                    <TableHead className="text-right">Chấp nhận</TableHead>
                                    <TableHead className="text-right">Đã giao</TableHead>
                                    <TableHead className="text-right">Đã nhận</TableHead>
                                    <TableHead>Trạng thái</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {lines.map((line) => (
                                    <TableRow key={line.id}>
                                        <TableCell className="min-w-[260px] whitespace-normal align-top">
                                            <div className="space-y-1">
                                                <p className="font-medium text-slate-900">
                                                    {line.displayName}
                                                </p>
                                                {line.companyResponseReason ? (
                                                    <p className="text-xs text-slate-500">
                                                        Lý do: {line.companyResponseReason}
                                                    </p>
                                                ) : null}
                                            </div>
                                        </TableCell>
                                        <TableCell className="min-w-[220px] whitespace-normal align-top text-sm text-slate-600">
                                            {companyDrugLabel(line.companyDrug)}
                                        </TableCell>
                                        <TableCell className="min-w-[220px] whitespace-normal align-top text-sm text-slate-600">
                                            {masterDrugLabel(line.masterDrug)}
                                        </TableCell>
                                        <TableCell className="align-top">{line.unit || "—"}</TableCell>
                                        <TableCell className="text-right align-top">
                                            {formatQuantity(line.requestedQty)}
                                        </TableCell>
                                        <TableCell className="text-right align-top">
                                            {formatQuantity(line.acceptedQty)}
                                        </TableCell>
                                        <TableCell className="text-right align-top">
                                            {formatQuantity(line.shippedQty)}
                                        </TableCell>
                                        <TableCell className="text-right align-top">
                                            {formatQuantity(line.receivedQty)}
                                        </TableCell>
                                        <TableCell className="align-top">
                                            <StatusBadge status={line.lineStatus} meta={LINE_STATUS_META} />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Lịch sử giao nhận</CardTitle>
                    <CardDescription>Các đợt giao và xác nhận thực nhận đã phát sinh.</CardDescription>
                </CardHeader>
                <CardContent>
                    {shipments.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                            Chưa có đợt giao nào.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {shipments.map((shipment) => (
                                <div
                                    key={shipment.id}
                                    className="rounded-xl border border-slate-200 bg-white p-4"
                                >
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="font-semibold text-slate-900">
                                                    Đợt giao #{shipment.shipmentNo}
                                                </h3>
                                                <StatusBadge
                                                    status={shipment.status}
                                                    meta={SHIPMENT_STATUS_META}
                                                />
                                            </div>
                                            <p className="mt-1 text-sm text-slate-500">
                                                Thời gian giao:{" "}
                                                {formatShipmentDateRangeLabel({
                                                    shippedFromDate: shipment.shippedFromDate,
                                                    shippedToDate: shipment.shippedToDate,
                                                    shippedAt: shipment.shippedAt,
                                                })}
                                            </p>
                                        </div>
                                        <p className="text-sm text-slate-500">
                                            Tạo lúc: {formatDateTime(shipment.createdAt)}
                                        </p>
                                    </div>

                                    {shipment.companyNote ? (
                                        <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                                            Ghi chú công ty: {shipment.companyNote}
                                        </p>
                                    ) : null}

                                    <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="min-w-[260px]">Thuốc</TableHead>
                                                    <TableHead>Đơn vị</TableHead>
                                                    <TableHead className="text-right">Giao</TableHead>
                                                    <TableHead className="text-right">Đã nhận</TableHead>
                                                    <TableHead className="min-w-[220px]">Lý do</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {shipment.lines.map((line) => (
                                                    <TableRow key={line.id}>
                                                        <TableCell className="min-w-[260px] whitespace-normal">
                                                            <div className="space-y-1">
                                                                <p className="font-medium text-slate-900">
                                                                    {line.displayName}
                                                                </p>
                                                                <p className="text-xs text-slate-500">
                                                                    {companyDrugLabel(line.companyDrug)}
                                                                </p>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>{line.unit || "—"}</TableCell>
                                                        <TableCell className="text-right">
                                                            {formatQuantity(line.shippedQty)}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {formatQuantity(line.receivedQty)}
                                                        </TableCell>
                                                        <TableCell className="min-w-[220px] whitespace-normal text-sm text-slate-600">
                                                            {line.reason || "—"}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>

                                    {shipment.receipts.length > 0 ? (
                                        <div className="mt-4 space-y-3">
                                            <Separator />
                                            {shipment.receipts.map((receipt) => (
                                                <div key={receipt.id} className="text-sm text-slate-600">
                                                    <p className="font-medium text-slate-800">
                                                        Xác nhận thực nhận: {formatDateTime(receipt.confirmedAt)}
                                                    </p>
                                                    {receipt.note ? (
                                                        <p className="mt-1">Ghi chú: {receipt.note}</p>
                                                    ) : null}
                                                    <div className="mt-2 space-y-1">
                                                        {receipt.lines.map((line) => {
                                                            const shipmentLine = shipment.lines.find(
                                                                (item) => item.id === line.shipmentLineId
                                                            );

                                                            return (
                                                                <p key={line.shipmentLineId}>
                                                                    {shipmentLine?.displayName || "Dòng thuốc"}:{" "}
                                                                    {formatQuantity(line.receivedQty)}
                                                                    {line.differenceReason
                                                                        ? ` - ${line.differenceReason}`
                                                                        : ""}
                                                                </p>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : null}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
