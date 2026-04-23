"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
    Activity,
    Building2,
    ClipboardList,
    Loader2,
    RefreshCcw,
    Search,
    Trash2,
    Truck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

type OrderStatus =
    | "DRAFT"
    | "SUBMITTED"
    | "REJECTED"
    | "READY_FOR_SHIPMENT"
    | "IN_DELIVERY"
    | "COMPLETED";

type LineStatus =
    | "PENDING"
    | "PENDING_CATALOG_CONFIRMATION"
    | "CONFIRMED"
    | "PARTIAL"
    | "REJECTED"
    | "COMPLETED";

type ShipmentStatus = "CREATED" | "PARTIALLY_RECEIVED" | "RECEIVED";
type SourceType = "MASTER_DRUG" | "COMPANY_DRUG";

interface FacilityOption {
    id: string;
    facilityName: string;
    facilityCode: string;
}

interface CompanyOption {
    id: string;
    code: string;
    name: string;
}

interface MasterDrugOption {
    id: string;
    maChung: string;
    tenThuoc: string;
    hoatChat: string | null;
    hamLuong: string | null;
    dangBaoChe: string | null;
    soDangKy: string | null;
    donViTinh: string | null;
}

interface CompanyDrugOption {
    id: string;
    companyDrugCode: string;
    companyDrugName: string;
    activeIngredient: string | null;
    unit: string | null;
    isActive: boolean;
    masterDrugId: string | null;
    masterDrug: MasterDrugOption | null;
}

interface OrderSummary {
    id: string;
    orderNo: string;
    facilityId: string;
    companyId: string;
    facility: FacilityOption;
    company: CompanyOption;
    status: OrderStatus;
    baseReportMonth: string | null;
    note: string | null;
    submittedAt: string | null;
    closedAt: string | null;
    createdAt: string;
    updatedAt: string;
    lineCount: number;
    totalRequestedQty: number;
    totalAcceptedQty: number;
    totalShippedQty: number;
    totalReceivedQty: number;
    pendingCatalogCount: number;
}

interface OrderDetail {
    id: string;
    orderNo: string;
    facilityId: string;
    companyId: string;
    facility: FacilityOption;
    company: CompanyOption;
    status: OrderStatus;
    baseReportMonth: string | null;
    note: string | null;
    submittedAt: string | null;
    closedAt: string | null;
    createdAt: string;
    updatedAt: string;
    lines: Array<{
        id: string;
        sourceType: SourceType;
        masterDrugId: string | null;
        companyDrugId: string | null;
        displayName: string;
        unit: string | null;
        requestedQty: number;
        acceptedQty: number;
        suggestedQty: number | null;
        lineStatus: LineStatus;
        companyResponseReason: string | null;
        suggestionBasis: string | null;
        suggestionReportMonth: string | null;
        suggestionRuleVersion: string | null;
        totalShippedQty: number;
        totalReceivedQty: number;
        remainingAcceptedQty: number;
        masterDrug: MasterDrugOption | null;
        companyDrug: CompanyDrugOption | null;
        shipmentHistory: Array<{
            id: string;
            shipmentId: string;
            shipmentNo: number;
            shippedAt: string | null;
            shipmentStatus: ShipmentStatus;
            shippedQty: number;
            reason: string | null;
            receivedQty: number;
        }>;
    }>;
    shipments: Array<{
        id: string;
        shipmentNo: number;
        status: ShipmentStatus;
        shippedAt: string | null;
        companyNote: string | null;
        createdAt: string;
        lines: Array<{
            id: string;
            orderLineId: string;
            displayName: string;
            unit: string | null;
            requestedQty: number;
            acceptedQty: number;
            shippedQty: number;
            receivedQty: number;
            reason: string | null;
        }>;
        receipts: Array<{
            id: string;
            confirmedAt: string;
            note: string | null;
            lines: Array<{
                shipmentLineId: string;
                receivedQty: number;
                differenceReason: string | null;
            }>;
        }>;
    }>;
}

interface SummaryMetrics {
    totalOrders: number;
    totalLines: number;
    totalRequestedQty: number;
    totalAcceptedQty: number;
    totalShippedQty: number;
    totalReceivedQty: number;
    openOrders: number;
    completedOrders: number;
}

const ALL_VALUE = "__all__";

const ORDER_STATUS_META: Record<
    OrderStatus,
    { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }
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
    LineStatus,
    { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }
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

export default function AdminDrugOrdersPage() {
    const [summary, setSummary] = useState<SummaryMetrics>({
        totalOrders: 0,
        totalLines: 0,
        totalRequestedQty: 0,
        totalAcceptedQty: 0,
        totalShippedQty: 0,
        totalReceivedQty: 0,
        openOrders: 0,
        completedOrders: 0,
    });
    const [orders, setOrders] = useState<OrderSummary[]>([]);
    const [facilities, setFacilities] = useState<FacilityOption[]>([]);
    const [companies, setCompanies] = useState<CompanyOption[]>([]);
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
    const [isListLoading, setIsListLoading] = useState(true);
    const [isDetailLoading, setIsDetailLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState(ALL_VALUE);
    const [facilityFilter, setFacilityFilter] = useState(ALL_VALUE);
    const [companyFilter, setCompanyFilter] = useState(ALL_VALUE);
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");

    const refreshOrders = useCallback(async (preferredOrderId?: string | null) => {
        setIsListLoading(true);
        try {
            const params = new URLSearchParams();
            if (search.trim()) {
                params.set("search", search.trim());
            }
            if (statusFilter !== ALL_VALUE) {
                params.set("status", statusFilter);
            }
            if (facilityFilter !== ALL_VALUE) {
                params.set("facilityId", facilityFilter);
            }
            if (companyFilter !== ALL_VALUE) {
                params.set("companyId", companyFilter);
            }
            if (dateFrom) {
                params.set("dateFrom", dateFrom);
            }
            if (dateTo) {
                params.set("dateTo", dateTo);
            }

            const res = await fetch(`/api/admin/dutru-dat-hang?${params.toString()}`);
            const payload = await res.json();

            if (!res.ok) {
                throw new Error(payload.message || "Không thể tải danh sách đơn");
            }

            setSummary(payload.summary || {});
            setOrders(payload.orders || []);
            setFacilities(payload.options?.facilities || []);
            setCompanies(payload.options?.companies || []);

            let nextSelectedOrderId: string | null = preferredOrderId ?? null;
            setSelectedOrderId((currentSelectedOrderId) => {
                nextSelectedOrderId =
                    preferredOrderId && payload.orders.some((order: OrderSummary) => order.id === preferredOrderId)
                        ? preferredOrderId
                        : currentSelectedOrderId &&
                            payload.orders.some((order: OrderSummary) => order.id === currentSelectedOrderId)
                            ? currentSelectedOrderId
                            : payload.orders[0]?.id || null;

                return nextSelectedOrderId;
            });

            if (!nextSelectedOrderId) {
                setSelectedOrder(null);
            }
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Không thể tải danh sách đơn");
        } finally {
            setIsListLoading(false);
        }
    }, [companyFilter, dateFrom, dateTo, facilityFilter, search, statusFilter]);

    const loadOrderDetail = useCallback(async (orderId: string) => {
        setIsDetailLoading(true);
        try {
            const res = await fetch(`/api/admin/dutru-dat-hang/${orderId}`);
            const payload = await res.json();

            if (!res.ok) {
                throw new Error(payload.message || "Không thể tải chi tiết đơn");
            }

            setSelectedOrder(payload.order || null);
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Không thể tải chi tiết đơn");
        } finally {
            setIsDetailLoading(false);
        }
    }, []);

    useEffect(() => {
        void refreshOrders();
    }, [refreshOrders]);

    useEffect(() => {
        if (!selectedOrderId) {
            setSelectedOrder(null);
            return;
        }

        void loadOrderDetail(selectedOrderId);
    }, [selectedOrderId, loadOrderDetail]);

    const handleDeleteOrder = async () => {
        if (!selectedOrder) {
            return;
        }

        const confirmed = window.confirm(
            `Xóa vĩnh viễn đơn ${selectedOrder.orderNo}?\n\nThao tác này sẽ xóa toàn bộ dòng thuốc, đợt giao và biên nhận liên quan, không thể hoàn tác.`
        );

        if (!confirmed) {
            return;
        }

        setIsDeleting(true);
        try {
            const res = await fetch(`/api/admin/dutru-dat-hang/${selectedOrder.id}`, {
                method: "DELETE",
            });
            const payload = await res.json();

            if (!res.ok) {
                throw new Error(payload.message || "Không thể xóa đơn");
            }

            setSelectedOrder(null);
            await refreshOrders();
            toast.success(payload.message || "Đã xóa đơn dự trù đặt hàng");
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Không thể xóa đơn");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800">Giám sát dự trù đặt hàng</h2>
                    <p className="mt-1 text-gray-500">
                        Theo dõi toàn bộ luồng từ tạo đơn, phản hồi công ty, giao hàng đến xác nhận thực nhận. Admin có thể xóa cứng đơn khi cần xử lý dữ liệu sai.
                    </p>
                </div>

                <Button type="button" variant="outline" onClick={() => void refreshOrders(selectedOrderId)} disabled={isListLoading}>
                    {isListLoading ? (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                        <RefreshCcw className="mr-2 size-4" />
                    )}
                    Làm mới
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Card className="border-slate-200">
                    <CardContent className="flex items-center gap-3 p-4">
                        <ClipboardList className="size-5 text-blue-600" />
                        <div>
                            <p className="text-xs text-slate-500">Tổng đơn</p>
                            <p className="text-xl font-semibold text-slate-900">{summary.totalOrders}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200">
                    <CardContent className="flex items-center gap-3 p-4">
                        <Activity className="size-5 text-emerald-600" />
                        <div>
                            <p className="text-xs text-slate-500">Đơn đang mở</p>
                            <p className="text-xl font-semibold text-slate-900">{summary.openOrders}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200">
                    <CardContent className="flex items-center gap-3 p-4">
                        <Truck className="size-5 text-indigo-600" />
                        <div>
                            <p className="text-xs text-slate-500">Đã giao / đã nhận</p>
                            <p className="text-xl font-semibold text-slate-900">
                                {formatQuantity(summary.totalShippedQty)} / {formatQuantity(summary.totalReceivedQty)}
                            </p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200">
                    <CardContent className="flex items-center gap-3 p-4">
                        <Building2 className="size-5 text-amber-600" />
                        <div>
                            <p className="text-xs text-slate-500">Đơn hoàn tất</p>
                            <p className="text-xl font-semibold text-slate-900">{summary.completedOrders}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Bộ lọc giám sát</CardTitle>
                    <CardDescription>Lọc theo cơ sở, công ty, trạng thái và khoảng thời gian tạo đơn.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_220px_220px_180px_180px]">
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Tìm mã đơn, cơ sở, công ty"
                                className="pl-9"
                            />
                        </div>

                        <Select value={facilityFilter} onValueChange={setFacilityFilter}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Tất cả cơ sở" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL_VALUE}>Tất cả cơ sở</SelectItem>
                                {facilities.map((facility) => (
                                    <SelectItem key={facility.id} value={facility.id}>
                                        {facility.facilityName}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={companyFilter} onValueChange={setCompanyFilter}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Tất cả công ty" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL_VALUE}>Tất cả công ty</SelectItem>
                                {companies.map((company) => (
                                    <SelectItem key={company.id} value={company.id}>
                                        {company.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Tất cả trạng thái" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL_VALUE}>Tất cả trạng thái</SelectItem>
                                {Object.entries(ORDER_STATUS_META).map(([status, meta]) => (
                                    <SelectItem key={status} value={status}>
                                        {meta.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <div className="grid grid-cols-2 gap-3 xl:col-span-2">
                            <div className="space-y-2">
                                <Label>Từ ngày</Label>
                                <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Đến ngày</Label>
                                <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
                <Card>
                    <CardHeader>
                        <CardTitle>Danh sách đơn</CardTitle>
                        <CardDescription>{orders.length} đơn khớp bộ lọc hiện tại.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {isListLoading ? (
                            <div className="flex items-center gap-2 rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                                <Loader2 className="size-4 animate-spin" />
                                Đang tải danh sách đơn...
                            </div>
                        ) : orders.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-slate-200 p-5 text-sm text-slate-500">
                                Không có đơn nào khớp bộ lọc.
                            </div>
                        ) : (
                            orders.map((order) => (
                                <button
                                    key={order.id}
                                    type="button"
                                    onClick={() => setSelectedOrderId(order.id)}
                                    className={`w-full rounded-xl border p-4 text-left transition ${
                                        selectedOrderId === order.id
                                            ? "border-blue-400 bg-blue-50 shadow-sm"
                                            : "border-slate-200 bg-white hover:border-slate-300"
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-semibold text-slate-900">{order.orderNo}</p>
                                            <p className="mt-1 text-sm text-slate-500">
                                                {order.facility.facilityName}
                                            </p>
                                            <p className="text-sm text-slate-500">{order.company.name}</p>
                                        </div>
                                        <Badge
                                            variant={ORDER_STATUS_META[order.status].variant}
                                            className={ORDER_STATUS_META[order.status].className}
                                        >
                                            {ORDER_STATUS_META[order.status].label}
                                        </Badge>
                                    </div>
                                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
                                        <p>{order.lineCount} dòng</p>
                                        <p>Tạo: {formatDateTime(order.createdAt)}</p>
                                        <p>Accepted: {formatQuantity(order.totalAcceptedQty)}</p>
                                        <p>Received: {formatQuantity(order.totalReceivedQty)}</p>
                                    </div>
                                </button>
                            ))
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                                <CardTitle>Chi tiết giám sát</CardTitle>
                                <CardDescription>Xem luồng đầy đủ của đơn đã chọn.</CardDescription>
                            </div>
                            {selectedOrder && (
                                <Button
                                    type="button"
                                    variant="destructive"
                                    onClick={() => void handleDeleteOrder()}
                                    disabled={isDeleting}
                                >
                                    {isDeleting ? (
                                        <Loader2 className="mr-2 size-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="mr-2 size-4" />
                                    )}
                                    Xóa đơn
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {!selectedOrderId ? (
                            <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                                Chọn một đơn ở cột bên trái để xem chi tiết.
                            </div>
                        ) : isDetailLoading && !selectedOrder ? (
                            <div className="flex items-center gap-2 rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                                <Loader2 className="size-4 animate-spin" />
                                Đang tải chi tiết đơn...
                            </div>
                        ) : !selectedOrder ? (
                            <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                                Không thể tải chi tiết đơn.
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                        <p className="text-xs uppercase tracking-wide text-slate-500">Số đơn</p>
                                        <p className="mt-2 font-semibold text-slate-900">{selectedOrder.orderNo}</p>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                        <p className="text-xs uppercase tracking-wide text-slate-500">Cơ sở</p>
                                        <p className="mt-2 font-semibold text-slate-900">{selectedOrder.facility.facilityName}</p>
                                        <p className="text-xs text-slate-500">{selectedOrder.facility.facilityCode}</p>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                        <p className="text-xs uppercase tracking-wide text-slate-500">Công ty</p>
                                        <p className="mt-2 font-semibold text-slate-900">{selectedOrder.company.name}</p>
                                        <p className="text-xs text-slate-500">{selectedOrder.company.code}</p>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                        <p className="text-xs uppercase tracking-wide text-slate-500">Trạng thái</p>
                                        <div className="mt-2">
                                            <Badge
                                                variant={ORDER_STATUS_META[selectedOrder.status].variant}
                                                className={ORDER_STATUS_META[selectedOrder.status].className}
                                            >
                                                {ORDER_STATUS_META[selectedOrder.status].label}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                                    <p>
                                        <span className="font-medium text-slate-700">Tạo lúc:</span> {formatDateTime(selectedOrder.createdAt)}
                                    </p>
                                    <p>
                                        <span className="font-medium text-slate-700">Gửi lúc:</span> {formatDateTime(selectedOrder.submittedAt)}
                                    </p>
                                    <p>
                                        <span className="font-medium text-slate-700">Đóng lúc:</span> {formatDateTime(selectedOrder.closedAt)}
                                    </p>
                                    <p className="mt-2">
                                        <span className="font-medium text-slate-700">Ghi chú:</span> {selectedOrder.note || "Không có"}
                                    </p>
                                </div>

                                <div className="overflow-x-auto rounded-xl border border-slate-200">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Thuốc</TableHead>
                                                <TableHead>Nguồn</TableHead>
                                                <TableHead className="text-right">Yêu cầu</TableHead>
                                                <TableHead className="text-right">Chấp nhận</TableHead>
                                                <TableHead className="text-right">Đã giao</TableHead>
                                                <TableHead className="text-right">Đã nhận</TableHead>
                                                <TableHead>Trạng thái</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {selectedOrder.lines.map((line) => (
                                                <TableRow key={line.id}>
                                                    <TableCell className="min-w-[320px]">
                                                        <div className="space-y-1">
                                                            <p className="font-medium text-slate-900">{line.displayName}</p>
                                                            <p className="text-xs text-slate-500">
                                                                Đơn vị: {line.unit || "—"}
                                                            </p>
                                                            {line.masterDrug && (
                                                                <p className="text-xs text-slate-500">
                                                                    Thuốc chuẩn: {line.masterDrug.maChung} - {line.masterDrug.tenThuoc}
                                                                </p>
                                                            )}
                                                            {line.companyResponseReason && (
                                                                <p className="text-xs text-slate-500">
                                                                    Lý do công ty: {line.companyResponseReason}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">
                                                            {line.sourceType === "MASTER_DRUG" ? "Danh mục chung" : "Danh mục công ty"}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">{formatQuantity(line.requestedQty)}</TableCell>
                                                    <TableCell className="text-right">{formatQuantity(line.acceptedQty)}</TableCell>
                                                    <TableCell className="text-right">{formatQuantity(line.totalShippedQty)}</TableCell>
                                                    <TableCell className="text-right">{formatQuantity(line.totalReceivedQty)}</TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant={LINE_STATUS_META[line.lineStatus].variant}
                                                            className={LINE_STATUS_META[line.lineStatus].className}
                                                        >
                                                            {LINE_STATUS_META[line.lineStatus].label}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Truck className="size-4 text-slate-500" />
                                        <h3 className="font-semibold text-slate-900">Timeline giao và nhận</h3>
                                    </div>

                                    {selectedOrder.shipments.length === 0 ? (
                                        <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                                            Đơn này chưa có đợt giao.
                                        </div>
                                    ) : (
                                        selectedOrder.shipments.map((shipment) => (
                                            <Card key={shipment.id} className="border-slate-200 shadow-none">
                                                <CardHeader className="pb-3">
                                                    <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                                                        <div>
                                                            <CardTitle className="text-base">Đợt giao #{shipment.shipmentNo}</CardTitle>
                                                            <CardDescription>
                                                                Giao lúc {formatDateTime(shipment.shippedAt)}
                                                            </CardDescription>
                                                        </div>
                                                        <Badge variant="outline" className="border-blue-300 text-blue-700">
                                                            {shipment.status === "CREATED"
                                                                ? "Đã tạo"
                                                                : shipment.status === "PARTIALLY_RECEIVED"
                                                                    ? "Nhận một phần"
                                                                    : "Đã nhận"}
                                                        </Badge>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="space-y-3">
                                                    {shipment.companyNote && (
                                                        <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                                                            {shipment.companyNote}
                                                        </div>
                                                    )}

                                                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                                                        <Table>
                                                            <TableHeader>
                                                                <TableRow>
                                                                    <TableHead>Thuốc</TableHead>
                                                                    <TableHead className="text-right">Giao</TableHead>
                                                                    <TableHead className="text-right">Nhận</TableHead>
                                                                    <TableHead>Lý do</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {shipment.lines.map((line) => (
                                                                    <TableRow key={line.id}>
                                                                        <TableCell>
                                                                            <p className="font-medium text-slate-900">{line.displayName}</p>
                                                                            <p className="text-xs text-slate-500">
                                                                                Đơn vị: {line.unit || "—"}
                                                                            </p>
                                                                        </TableCell>
                                                                        <TableCell className="text-right">{formatQuantity(line.shippedQty)}</TableCell>
                                                                        <TableCell className="text-right">{formatQuantity(line.receivedQty)}</TableCell>
                                                                        <TableCell className="text-sm text-slate-600">{line.reason || "—"}</TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    </div>

                                                    {shipment.receipts.length > 0 && (
                                                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                                                            {shipment.receipts.map((receipt) => (
                                                                <div key={receipt.id} className="space-y-1">
                                                                    <p>
                                                                        Xác nhận lúc: {formatDateTime(receipt.confirmedAt)}
                                                                    </p>
                                                                    <p>Ghi chú: {receipt.note || "Không có"}</p>
                                                                    {receipt.lines.some((line) => line.differenceReason) && (
                                                                        <div className="pt-1 text-xs">
                                                                            {receipt.lines
                                                                                .filter((line) => line.differenceReason)
                                                                                .map((line) => (
                                                                                    <p key={line.shipmentLineId}>
                                                                                        Chênh lệch: {line.differenceReason}
                                                                                    </p>
                                                                                ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
