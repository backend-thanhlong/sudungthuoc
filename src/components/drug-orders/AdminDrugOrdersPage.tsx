"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
    Activity,
    ArrowLeft,
    Building2,
    ClipboardList,
    FileText,
    ListChecks,
    Loader2,
    QrCode,
    RefreshCcw,
    Search,
    Trash2,
    Truck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import DrugOrderLineMobileCard from "@/components/drug-orders/DrugOrderLineMobileCard";
import DrugOrderMobileFilterPanel from "@/components/drug-orders/DrugOrderMobileFilterPanel";
import DrugOrderMobileSectionTabs, {
    type DrugOrderMobileSectionTab,
} from "@/components/drug-orders/DrugOrderMobileSectionTabs";
import DrugOrderQrCode from "@/components/drug-orders/DrugOrderQrCode";
import DrugOrderShipmentMobileCard from "@/components/drug-orders/DrugOrderShipmentMobileCard";
import DrugOrderSummaryCard from "@/components/drug-orders/DrugOrderSummaryCard";

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
    lookupUrl: string;
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

type AdminMobilePane = "list" | "detail";
type AdminMobileSection = "info" | "lines" | "timeline" | "qr";
type DrugOrderLine = OrderDetail["lines"][number];

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

const SHIPMENT_STATUS_META: Record<
    ShipmentStatus,
    { label: string; className: string }
> = {
    CREATED: { label: "Đã tạo", className: "border-blue-300 text-blue-700" },
    PARTIALLY_RECEIVED: {
        label: "Nhận một phần",
        className: "border-amber-300 text-amber-700",
    },
    RECEIVED: {
        label: "Đã nhận",
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

function formatDrugText(value: string | null | undefined) {
    const normalized = value?.trim();
    return normalized || "—";
}

function getLineCompanyDrugName(line: DrugOrderLine) {
    return line.companyDrug?.companyDrugName || line.displayName;
}

function getLineCompanyDrugCode(line: DrugOrderLine) {
    return line.companyDrug?.companyDrugCode || null;
}

function getLineActiveIngredient(line: DrugOrderLine) {
    return (
        line.companyDrug?.activeIngredient ||
        line.companyDrug?.masterDrug?.hoatChat ||
        line.masterDrug?.hoatChat ||
        null
    );
}

function getLineRegistrationNumber(line: DrugOrderLine) {
    return (
        line.companyDrug?.masterDrug?.soDangKy ||
        line.masterDrug?.soDangKy ||
        null
    );
}

function getLineDosageForm(line: DrugOrderLine) {
    return (
        line.companyDrug?.masterDrug?.dangBaoChe ||
        line.masterDrug?.dangBaoChe ||
        null
    );
}

function getLineUnit(line: DrugOrderLine) {
    return (
        line.companyDrug?.unit ||
        line.unit ||
        line.companyDrug?.masterDrug?.donViTinh ||
        line.masterDrug?.donViTinh ||
        null
    );
}

function OrderStatusBadge({ status }: { status: OrderStatus }) {
    const meta = ORDER_STATUS_META[status];

    return (
        <Badge variant={meta.variant} className={meta.className}>
            {meta.label}
        </Badge>
    );
}

function LineStatusBadge({ status }: { status: LineStatus }) {
    const meta = LINE_STATUS_META[status];

    return (
        <Badge variant={meta.variant} className={meta.className}>
            {meta.label}
        </Badge>
    );
}

function ShipmentStatusBadge({ status }: { status: ShipmentStatus }) {
    const meta = SHIPMENT_STATUS_META[status];

    return (
        <Badge variant="outline" className={meta.className}>
            {meta.label}
        </Badge>
    );
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
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
    const [mobilePane, setMobilePane] = useState<AdminMobilePane>("list");
    const [mobileSection, setMobileSection] = useState<AdminMobileSection>("info");
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

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
        setSelectedOrder(null);
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

    const selectedOrderShipmentCount = selectedOrder?.shipments.length || 0;
    const selectedOrderReceiptCount =
        selectedOrder?.shipments.reduce(
            (sum, shipment) => sum + shipment.receipts.length,
            0
        ) || 0;
    const canDeleteSelectedOrder = Boolean(selectedOrder);
    const deleteConfirmationMatches = Boolean(
        selectedOrder &&
            deleteConfirmationText.trim() === selectedOrder.orderNo
    );

    const handleDeleteDialogOpenChange = (open: boolean) => {
        if (isDeleting) {
            return;
        }

        setDeleteDialogOpen(open);
        if (!open) {
            setDeleteConfirmationText("");
        }
    };

    const openDeleteDialog = () => {
        if (!selectedOrder) {
            return;
        }

        setDeleteConfirmationText("");
        setDeleteDialogOpen(true);
    };

    const handleDeleteOrder = async () => {
        if (!selectedOrder || !deleteConfirmationMatches) {
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

            setDeleteDialogOpen(false);
            setDeleteConfirmationText("");
            setSelectedOrderId(null);
            setSelectedOrder(null);
            setMobilePane("list");
            await refreshOrders(null);
            toast.success(payload.message || "Đã xóa đơn dự trù đặt hàng");
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Không thể xóa đơn");
        } finally {
            setIsDeleting(false);
        }
    };

    const mobileAdvancedFilterCount = [
        facilityFilter !== ALL_VALUE,
        companyFilter !== ALL_VALUE,
        statusFilter !== ALL_VALUE,
        Boolean(dateFrom),
        Boolean(dateTo),
    ].filter(Boolean).length;
    const selectedOrderRequestedQty =
        selectedOrder?.lines.reduce((sum, line) => sum + line.requestedQty, 0) || 0;
    const selectedOrderAcceptedQty =
        selectedOrder?.lines.reduce((sum, line) => sum + line.acceptedQty, 0) || 0;
    const selectedOrderShippedQty =
        selectedOrder?.lines.reduce((sum, line) => sum + line.totalShippedQty, 0) || 0;
    const selectedOrderReceivedQty =
        selectedOrder?.lines.reduce((sum, line) => sum + line.totalReceivedQty, 0) || 0;
    const mobileSectionTabs: DrugOrderMobileSectionTab[] = [
        { value: "info", label: "Thông tin", icon: <FileText className="size-4" /> },
        { value: "lines", label: "Dòng thuốc", icon: <ListChecks className="size-4" /> },
        { value: "timeline", label: "Timeline", icon: <Truck className="size-4" /> },
        { value: "qr", label: "QR", icon: <QrCode className="size-4" /> },
    ];

    const clearMobileAdvancedFilters = () => {
        setFacilityFilter(ALL_VALUE);
        setCompanyFilter(ALL_VALUE);
        setStatusFilter(ALL_VALUE);
        setDateFrom("");
        setDateTo("");
    };

    const selectMobileOrder = (orderId: string) => {
        setSelectedOrderId(orderId);
        setMobilePane("detail");
        setMobileSection("info");
    };

    const renderMobileMetrics = () => (
        <div className="grid grid-cols-1 gap-3 min-[430px]:grid-cols-2">
            {[
                {
                    label: "Tổng đơn",
                    value: summary.totalOrders,
                    icon: <ClipboardList className="size-5 text-blue-600" />,
                },
                {
                    label: "Đơn đang mở",
                    value: summary.openOrders,
                    icon: <Activity className="size-5 text-emerald-600" />,
                },
                {
                    label: "Đã giao / đã nhận",
                    value: `${formatQuantity(summary.totalShippedQty)} / ${formatQuantity(summary.totalReceivedQty)}`,
                    icon: <Truck className="size-5 text-indigo-600" />,
                },
                {
                    label: "Hoàn tất",
                    value: summary.completedOrders,
                    icon: <Building2 className="size-5 text-amber-600" />,
                },
            ].map((metric) => (
                <div
                    key={metric.label}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                    <div className="flex items-center gap-3">
                        {metric.icon}
                        <div className="min-w-0">
                            <p className="text-xs text-slate-500">{metric.label}</p>
                            <p className="mt-1 break-words text-lg font-semibold text-slate-900">
                                {metric.value}
                            </p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );

    const renderMobileFilters = () => (
        <div className="space-y-3">
            <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Tìm mã đơn, cơ sở, công ty"
                    className="pl-9"
                />
            </div>

            <DrugOrderMobileFilterPanel
                open={mobileFiltersOpen}
                onOpenChange={setMobileFiltersOpen}
                activeCount={mobileAdvancedFilterCount}
                title="Lọc nâng cao"
                triggerLabel="Lọc nâng cao"
                footer={
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={clearMobileAdvancedFilters}
                        disabled={mobileAdvancedFilterCount === 0}
                    >
                        Xóa lọc nâng cao
                    </Button>
                }
            >
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

                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label>Từ ngày</Label>
                        <Input
                            type="date"
                            value={dateFrom}
                            onChange={(event) => setDateFrom(event.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Đến ngày</Label>
                        <Input
                            type="date"
                            value={dateTo}
                            onChange={(event) => setDateTo(event.target.value)}
                        />
                    </div>
                </div>
            </DrugOrderMobileFilterPanel>
        </div>
    );

    const renderMobileOrderList = () => (
        <div className="space-y-4 pb-6">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h2 className="text-2xl font-bold text-slate-900">
                        Giám sát dự trù đặt hàng
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Lọc, mở chi tiết và theo dõi giao nhận.
                    </p>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => void refreshOrders(selectedOrderId)}
                    disabled={isListLoading}
                    aria-label="Làm mới danh sách đơn"
                >
                    {isListLoading ? (
                        <Loader2 className="size-4 animate-spin" />
                    ) : (
                        <RefreshCcw className="size-4" />
                    )}
                </Button>
            </div>

            {renderMobileMetrics()}
            {renderMobileFilters()}

            <div className="text-sm text-slate-500">
                {orders.length} đơn khớp bộ lọc hiện tại.
            </div>

            {isListLoading ? (
                <div className="flex items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
                    <Loader2 className="size-4 animate-spin" />
                    Đang tải danh sách đơn...
                </div>
            ) : orders.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                    Không có đơn nào khớp bộ lọc.
                </div>
            ) : (
                <div className="space-y-3">
                    {orders.map((order) => (
                        <DrugOrderSummaryCard
                            key={order.id}
                            title={order.orderNo}
                            subtitle={
                                <>
                                    <span className="block">{order.facility.facilityName}</span>
                                    <span className="block">{order.company.name}</span>
                                </>
                            }
                            status={<OrderStatusBadge status={order.status} />}
                            active={order.id === selectedOrderId}
                            onClick={() => selectMobileOrder(order.id)}
                            metrics={[
                                { label: "Dòng", value: order.lineCount },
                                {
                                    label: "Chấp nhận",
                                    value: formatQuantity(order.totalAcceptedQty),
                                },
                                {
                                    label: "Đã nhận",
                                    value: formatQuantity(order.totalReceivedQty),
                                    tone:
                                        order.totalReceivedQty >= order.totalAcceptedQty
                                            ? "success"
                                            : "default",
                                },
                                {
                                    label: "Ngày tạo",
                                    value: formatDateTime(order.createdAt),
                                    tone: "muted",
                                },
                            ]}
                            warnings={
                                order.pendingCatalogCount > 0
                                    ? [`${order.pendingCatalogCount} dòng chờ xác nhận danh mục`]
                                    : []
                            }
                            footer={`Đã giao: ${formatQuantity(order.totalShippedQty)}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );

    const renderMobileInfoSection = () => {
        if (!selectedOrder) {
            return null;
        }

        return (
            <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3 min-[430px]:grid-cols-2">
                    {[
                        ["Tổng dòng", selectedOrder.lines.length],
                        ["Yêu cầu", formatQuantity(selectedOrderRequestedQty)],
                        ["Chấp nhận", formatQuantity(selectedOrderAcceptedQty)],
                        ["Đã giao", formatQuantity(selectedOrderShippedQty)],
                        ["Đã nhận", formatQuantity(selectedOrderReceivedQty)],
                        ["Tháng XNT", selectedOrder.baseReportMonth || "—"],
                    ].map(([label, value]) => (
                        <div key={label} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                                {label}
                            </p>
                            <p className="mt-1 break-words font-semibold text-slate-900">{value}</p>
                        </div>
                    ))}
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
                    <h3 className="font-semibold text-slate-900">Thông tin đơn</h3>
                    <div className="mt-3 grid gap-2">
                        <div>
                            <p className="text-xs uppercase tracking-wide text-slate-500">Mã đơn</p>
                            <p className="mt-1 font-medium text-slate-900">{selectedOrder.orderNo}</p>
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-wide text-slate-500">Cơ sở</p>
                            <p className="mt-1 font-medium text-slate-900">
                                {selectedOrder.facility.facilityName}
                            </p>
                            <p className="text-xs text-slate-500">{selectedOrder.facility.facilityCode}</p>
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-wide text-slate-500">Công ty</p>
                            <p className="mt-1 font-medium text-slate-900">{selectedOrder.company.name}</p>
                            <p className="text-xs text-slate-500">{selectedOrder.company.code}</p>
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                    <h3 className="font-semibold text-slate-900">Mốc thời gian</h3>
                    <div className="mt-3 grid gap-2">
                        <p>
                            <span className="font-medium text-slate-700">Tạo lúc:</span>{" "}
                            {formatDateTime(selectedOrder.createdAt)}
                        </p>
                        <p>
                            <span className="font-medium text-slate-700">Gửi lúc:</span>{" "}
                            {formatDateTime(selectedOrder.submittedAt)}
                        </p>
                        <p>
                            <span className="font-medium text-slate-700">Đóng lúc:</span>{" "}
                            {formatDateTime(selectedOrder.closedAt)}
                        </p>
                        <p>
                            <span className="font-medium text-slate-700">Ghi chú:</span>{" "}
                            {selectedOrder.note || "Không có"}
                        </p>
                    </div>
                </div>
            </div>
        );
    };

    const renderMobileLinesSection = () => {
        if (!selectedOrder) {
            return null;
        }

        return (
            <div className="space-y-3">
                {selectedOrder.lines.map((line) => (
                    <DrugOrderLineMobileCard
                        key={line.id}
                        title={getLineCompanyDrugName(line)}
                        subtitle={`Hoạt chất: ${formatDrugText(getLineActiveIngredient(line))}`}
                        badges={
                            <>
                                <LineStatusBadge status={line.lineStatus} />
                            </>
                        }
                        fields={[
                            {
                                label: "Mã CT",
                                value: formatDrugText(getLineCompanyDrugCode(line)),
                                tone: getLineCompanyDrugCode(line) ? "default" : "muted",
                            },
                            {
                                label: "Số đăng ký",
                                value: formatDrugText(getLineRegistrationNumber(line)),
                                tone: getLineRegistrationNumber(line) ? "default" : "muted",
                            },
                            {
                                label: "Dạng bào chế",
                                value: formatDrugText(getLineDosageForm(line)),
                                tone: getLineDosageForm(line) ? "default" : "muted",
                            },
                            {
                                label: "Đơn vị",
                                value: formatDrugText(getLineUnit(line)),
                                tone: getLineUnit(line) ? "default" : "muted",
                            },
                            { label: "Yêu cầu", value: formatQuantity(line.requestedQty) },
                            { label: "Chấp nhận", value: formatQuantity(line.acceptedQty) },
                            { label: "Đã giao", value: formatQuantity(line.totalShippedQty) },
                            { label: "Đã nhận", value: formatQuantity(line.totalReceivedQty) },
                            { label: "Còn lại", value: formatQuantity(line.remainingAcceptedQty) },
                            {
                                label: "Gợi ý",
                                value: formatQuantity(line.suggestedQty),
                                tone: line.suggestedQty === null ? "muted" : "default",
                            },
                        ]}
                        validationMessage={
                            line.companyResponseReason
                                ? `Lý do công ty: ${line.companyResponseReason}`
                                : null
                        }
                    />
                ))}
            </div>
        );
    };

    const renderMobileTimelineSection = () => {
        if (!selectedOrder) {
            return null;
        }

        if (selectedOrder.shipments.length === 0) {
            return (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                    Đơn này chưa có đợt giao.
                </div>
            );
        }

        return (
            <div className="space-y-3">
                {selectedOrder.shipments.map((shipment) => (
                    <DrugOrderShipmentMobileCard
                        key={shipment.id}
                        title={`Đợt giao #${shipment.shipmentNo}`}
                        subtitle={`Giao lúc ${formatDateTime(shipment.shippedAt)}`}
                        status={<ShipmentStatusBadge status={shipment.status} />}
                        note={shipment.companyNote || undefined}
                        lines={shipment.lines.map((line) => ({
                            id: line.id,
                            title: line.displayName,
                            subtitle: `Đơn vị: ${line.unit || "—"}`,
                            metrics: [
                                { label: "Yêu cầu", value: formatQuantity(line.requestedQty) },
                                { label: "Duyệt", value: formatQuantity(line.acceptedQty) },
                                { label: "Giao", value: formatQuantity(line.shippedQty) },
                                { label: "Thực nhận", value: formatQuantity(line.receivedQty) },
                            ],
                            reason: line.reason ? `Lý do: ${line.reason}` : undefined,
                        }))}
                        receipts={
                            shipment.receipts.length > 0 ? (
                                <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                                    {shipment.receipts.map((receipt) => (
                                        <div key={receipt.id} className="space-y-1">
                                            <p>Xác nhận lúc: {formatDateTime(receipt.confirmedAt)}</p>
                                            <p>Ghi chú: {receipt.note || "Không có"}</p>
                                            {receipt.lines.some((line) => line.differenceReason) ? (
                                                <div className="pt-1 text-xs">
                                                    {receipt.lines
                                                        .filter((line) => line.differenceReason)
                                                        .map((line) => (
                                                            <p key={line.shipmentLineId}>
                                                                Chênh lệch: {line.differenceReason}
                                                            </p>
                                                        ))}
                                                </div>
                                            ) : null}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                                    Cơ sở chưa xác nhận thực nhận.
                                </div>
                            )
                        }
                    />
                ))}
            </div>
        );
    };

    const renderMobileQrSection = () => {
        if (!selectedOrder) {
            return null;
        }

        return (
            <DrugOrderQrCode
                lookupUrl={selectedOrder.lookupUrl}
                orderNo={selectedOrder.orderNo}
            />
        );
    };

    const renderMobileSelectedSection = () => {
        if (mobileSection === "lines") {
            return renderMobileLinesSection();
        }

        if (mobileSection === "timeline") {
            return renderMobileTimelineSection();
        }

        if (mobileSection === "qr") {
            return renderMobileQrSection();
        }

        return renderMobileInfoSection();
    };

    const renderDeleteDialog = () => {
        if (!selectedOrder) {
            return null;
        }

        return (
            <AlertDialog
                open={deleteDialogOpen}
                onOpenChange={handleDeleteDialogOpenChange}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Xóa vĩnh viễn đơn {selectedOrder.orderNo}</AlertDialogTitle>
                        <AlertDialogDescription>
                            Thao tác này xóa toàn bộ đơn, dòng thuốc, đợt giao và xác nhận thực nhận liên quan. Không thể hoàn tác.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="grid gap-3 rounded-lg border border-rose-100 bg-rose-50 p-3 text-sm text-rose-900 sm:grid-cols-2">
                        <div>
                            <p className="text-xs font-medium uppercase text-rose-700">Trạng thái</p>
                            <p className="mt-1 font-semibold">
                                {ORDER_STATUS_META[selectedOrder.status].label}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs font-medium uppercase text-rose-700">Dòng thuốc</p>
                            <p className="mt-1 font-semibold">{selectedOrder.lines.length}</p>
                        </div>
                        <div>
                            <p className="text-xs font-medium uppercase text-rose-700">Đợt giao</p>
                            <p className="mt-1 font-semibold">{selectedOrderShipmentCount}</p>
                        </div>
                        <div>
                            <p className="text-xs font-medium uppercase text-rose-700">Phiếu nhận</p>
                            <p className="mt-1 font-semibold">{selectedOrderReceiptCount}</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="delete-order-confirmation">
                            Nhập mã đơn để xác nhận
                        </Label>
                        <Input
                            id="delete-order-confirmation"
                            value={deleteConfirmationText}
                            onChange={(event) => setDeleteConfirmationText(event.target.value)}
                            placeholder={selectedOrder.orderNo}
                            disabled={isDeleting}
                        />
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Hủy</AlertDialogCancel>
                        <Button
                            type="button"
                            variant="destructive"
                            disabled={isDeleting || !deleteConfirmationMatches}
                            onClick={() => void handleDeleteOrder()}
                        >
                            {isDeleting ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : (
                                <Trash2 className="size-4" />
                            )}
                            Xóa vĩnh viễn
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        );
    };

    const renderMobileDeleteAction = () => {
        if (!selectedOrder) {
            return null;
        }

        return (
            <div className="rounded-xl border border-rose-200 bg-white p-4 shadow-sm">
                <div className="space-y-1">
                    <h3 className="font-semibold text-rose-900">Xóa đơn</h3>
                    <p className="text-sm text-rose-700">
                        Admin có thể xóa vĩnh viễn mọi đơn, kể cả đơn đã phát sinh giao hoặc nhận.
                    </p>
                </div>
                <Button
                    type="button"
                    variant="destructive"
                    className="mt-4 w-full"
                    onClick={openDeleteDialog}
                    disabled={isDeleting || !canDeleteSelectedOrder}
                >
                    {isDeleting ? (
                        <Loader2 className="size-4 animate-spin" />
                    ) : (
                        <Trash2 className="size-4" />
                    )}
                    Xóa đơn
                </Button>
            </div>
        );
    };

    const renderMobileOrderDetail = () => {
        if (!selectedOrderId) {
            return renderMobileOrderList();
        }

        if (isDetailLoading || (selectedOrder && selectedOrder.id !== selectedOrderId)) {
            return (
                <div className="space-y-4 pb-6">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setMobilePane("list")}
                    >
                        <ArrowLeft className="size-4" />
                        Danh sách đơn
                    </Button>
                    <div className="flex items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
                        <Loader2 className="size-4 animate-spin" />
                        Đang tải chi tiết đơn...
                    </div>
                </div>
            );
        }

        if (!selectedOrder) {
            return (
                <div className="space-y-4 pb-6">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setMobilePane("list")}
                    >
                        <ArrowLeft className="size-4" />
                        Danh sách đơn
                    </Button>
                    <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                        Không thể tải chi tiết đơn.
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-4 pb-8">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setMobilePane("list")}
                        className="-ml-2 mb-3"
                    >
                        <ArrowLeft className="size-4" />
                        Danh sách đơn
                    </Button>
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <h2 className="break-words text-xl font-bold text-slate-900">
                                {selectedOrder.orderNo}
                            </h2>
                            <p className="mt-1 text-sm text-slate-600">
                                {selectedOrder.facility.facilityName}
                            </p>
                            <p className="text-sm text-slate-600">{selectedOrder.company.name}</p>
                        </div>
                        <div className="shrink-0">
                            <OrderStatusBadge status={selectedOrder.status} />
                        </div>
                    </div>
                </div>

                <DrugOrderMobileSectionTabs
                    value={mobileSection}
                    tabs={mobileSectionTabs}
                    onValueChange={(value) => setMobileSection(value as AdminMobileSection)}
                    sticky
                />

                {renderMobileSelectedSection()}
                {renderMobileDeleteAction()}
            </div>
        );
    };

    const renderMobileView = () =>
        mobilePane === "detail" ? renderMobileOrderDetail() : renderMobileOrderList();

    return (
        <div className="space-y-6">
            {renderDeleteDialog()}
            <div className="xl:hidden">{renderMobileView()}</div>

            <div className="hidden space-y-6 xl:block">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800">Giám sát dự trù đặt hàng</h2>
                    <p className="mt-1 text-gray-500">
                        Theo dõi toàn bộ luồng từ tạo đơn, phản hồi công ty, giao hàng đến xác nhận thực nhận.
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
                                <div className="space-y-2">
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        onClick={openDeleteDialog}
                                        disabled={isDeleting || !canDeleteSelectedOrder}
                                    >
                                        {isDeleting ? (
                                            <Loader2 className="mr-2 size-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="mr-2 size-4" />
                                        )}
                                        Xóa đơn
                                    </Button>
                                </div>
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
                                        <p className="text-xs uppercase tracking-wide text-slate-500">Mã đơn</p>
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

                                <DrugOrderQrCode
                                    lookupUrl={selectedOrder.lookupUrl}
                                    orderNo={selectedOrder.orderNo}
                                />

                                <div className="overflow-x-auto rounded-xl border border-slate-200">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Thuốc công ty</TableHead>
                                                <TableHead>Số đăng ký</TableHead>
                                                <TableHead>Dạng bào chế</TableHead>
                                                <TableHead>Đơn vị</TableHead>
                                                <TableHead className="text-right">Yêu cầu</TableHead>
                                                <TableHead className="text-right">Chấp nhận</TableHead>
                                                <TableHead className="text-right">Đã giao</TableHead>
                                                <TableHead className="text-right">Đã nhận</TableHead>
                                                <TableHead className="text-right">Còn lại</TableHead>
                                                <TableHead>Trạng thái</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {selectedOrder.lines.map((line) => (
                                                <TableRow key={line.id}>
                                                    <TableCell className="min-w-[360px]">
                                                        <div className="space-y-1">
                                                            <p className="font-medium text-slate-900">
                                                                {getLineCompanyDrugName(line)}
                                                            </p>
                                                            <p className="text-xs text-slate-500">
                                                                Mã CT: {formatDrugText(getLineCompanyDrugCode(line))}
                                                            </p>
                                                            <p className="text-xs text-slate-500">
                                                                Hoạt chất: {formatDrugText(getLineActiveIngredient(line))}
                                                            </p>
                                                            {line.companyResponseReason && (
                                                                <p className="text-xs text-slate-500">
                                                                    Lý do công ty: {line.companyResponseReason}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{formatDrugText(getLineRegistrationNumber(line))}</TableCell>
                                                    <TableCell>{formatDrugText(getLineDosageForm(line))}</TableCell>
                                                    <TableCell>{formatDrugText(getLineUnit(line))}</TableCell>
                                                    <TableCell className="text-right">{formatQuantity(line.requestedQty)}</TableCell>
                                                    <TableCell className="text-right">{formatQuantity(line.acceptedQty)}</TableCell>
                                                    <TableCell className="text-right">{formatQuantity(line.totalShippedQty)}</TableCell>
                                                    <TableCell className="text-right">{formatQuantity(line.totalReceivedQty)}</TableCell>
                                                    <TableCell className="text-right">{formatQuantity(line.remainingAcceptedQty)}</TableCell>
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
        </div>
    );
}
