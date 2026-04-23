"use client";

import { useCallback, useDeferredValue, useEffect, useState } from "react";
import { toast } from "sonner";
import {
    BadgeCheck,
    ClipboardList,
    Loader2,
    PackagePlus,
    PencilLine,
    Plus,
    RefreshCcw,
    Search,
    Send,
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

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
type ResponseDecision = "CONFIRMED" | "PARTIAL" | "REJECTED";

interface FacilityOption {
    id: string;
    facilityName: string;
    facilityCode: string;
}

interface MasterDrugOption {
    id: string;
    maChung: string;
    tenThuoc: string;
    hoatChat: string | null;
    hamLuong: string | null;
    dangBaoChe: string | null;
    soDangKy: string | null;
    quyCach: string | null;
    donViTinh: string | null;
}

interface CompanyDrugOption {
    id: string;
    companyDrugCode: string;
    companyDrugName: string;
    activeIngredient: string | null;
    quyCach: string | null;
    unit: string | null;
    isActive: boolean;
    masterDrugId: string | null;
    isLegacy: boolean;
    canDelete?: boolean;
    referencedOrderLineCount?: number;
    masterDrug: MasterDrugOption | null;
}

interface OrderSummary {
    id: string;
    orderNo: string;
    facilityId: string;
    facility: FacilityOption;
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
    pendingCatalogCount: number;
}

interface OrderLine {
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
}

interface OrderDetail {
    id: string;
    orderNo: string;
    facilityId: string;
    companyId: string;
    facility: FacilityOption;
    status: OrderStatus;
    baseReportMonth: string | null;
    note: string | null;
    submittedAt: string | null;
    closedAt: string | null;
    createdAt: string;
    updatedAt: string;
    permissions: {
        canRespond: boolean;
        canCreateShipment: boolean;
    };
    lines: OrderLine[];
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
    options: {
        companyDrugs: CompanyDrugOption[];
    };
}

interface CatalogPayload {
    items: CompanyDrugOption[];
    masterDrugOptions: MasterDrugOption[];
}

interface ResponseDraftLine {
    lineId: string;
    displayName: string;
    unit: string | null;
    requestedQty: number;
    requiresCatalog: boolean;
    masterDrug: MasterDrugOption | null;
    decision: ResponseDecision | typeof UNSET_VALUE;
    acceptedQty: string;
    reason: string;
    catalogSelection: string;
    newCompanyDrugCode: string;
    newQuyCach: string;
}

interface ShipmentDraftLine {
    orderLineId: string;
    displayName: string;
    unit: string | null;
    acceptedQty: number;
    remainingAcceptedQty: number;
    shippedQty: string;
    reason: string;
}

interface CatalogDraft {
    id: string | null;
    companyDrugCode: string;
    companyDrugName: string;
    activeIngredient: string;
    hamLuong: string;
    soDangKy: string;
    dangBaoChe: string;
    quyCach: string;
    unit: string;
    isActive: boolean;
    masterDrugId: string | null;
    masterDrugLabel: string;
    isLegacy: boolean;
}

const ALL_VALUE = "__all__";
const NONE_VALUE = "__none__";
const CREATE_NEW_VALUE = "__create_new__";
const UNSET_VALUE = "__unset__";

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

function formatDateTimeLocal(value: Date = new Date()) {
    const offset = value.getTimezoneOffset();
    const local = new Date(value.getTime() - offset * 60_000);
    return local.toISOString().slice(0, 16);
}

function buildCatalogDraft(item?: CompanyDrugOption | null): CatalogDraft {
    return {
        id: item?.id || null,
        companyDrugCode: item?.companyDrugCode || "",
        companyDrugName: item?.masterDrug?.tenThuoc || item?.companyDrugName || "",
        activeIngredient: item?.masterDrug?.hoatChat || item?.activeIngredient || "",
        hamLuong: item?.masterDrug?.hamLuong || "",
        soDangKy: item?.masterDrug?.soDangKy || "",
        dangBaoChe: item?.masterDrug?.dangBaoChe || "",
        quyCach: item?.quyCach || item?.masterDrug?.quyCach || "",
        unit: item?.unit || "",
        isActive: item?.isActive ?? true,
        masterDrugId: item?.masterDrugId || null,
        masterDrugLabel: item?.masterDrug
            ? `${item.masterDrug.maChung} - ${item.masterDrug.tenThuoc}`
            : "",
        isLegacy: item?.isLegacy ?? false,
    };
}

function applyMasterDrugToCatalogDraft(
    current: CatalogDraft,
    drug: MasterDrugOption
): CatalogDraft {
    return {
        ...current,
        masterDrugId: drug.id,
        masterDrugLabel: `${drug.maChung} - ${drug.tenThuoc}`,
        companyDrugName: drug.tenThuoc,
        activeIngredient: drug.hoatChat || "",
        hamLuong: drug.hamLuong || "",
        soDangKy: drug.soDangKy || "",
        dangBaoChe: drug.dangBaoChe || "",
        unit: drug.donViTinh || "",
        quyCach: current.quyCach || drug.quyCach || "",
    };
}

function buildResponseDraftLines(order: OrderDetail): ResponseDraftLine[] {
    return order.lines.map((line) => {
        const matchingCatalogDrug = order.options.companyDrugs.find(
            (drug) => drug.masterDrugId && drug.masterDrugId === line.masterDrugId
        );

        return {
            lineId: line.id,
            displayName: line.displayName,
            unit: line.unit,
            requestedQty: line.requestedQty,
            requiresCatalog:
                line.lineStatus === "PENDING_CATALOG_CONFIRMATION" && !!line.masterDrugId,
            masterDrug: line.masterDrug,
            decision: UNSET_VALUE,
            acceptedQty:
                line.lineStatus === "PENDING_CATALOG_CONFIRMATION"
                    ? ""
                    : String(line.requestedQty),
            reason: "",
            catalogSelection: matchingCatalogDrug?.id || CREATE_NEW_VALUE,
            newCompanyDrugCode: "",
            newQuyCach: line.masterDrug?.quyCach || "",
        };
    });
}

function buildShipmentDraftLines(order: OrderDetail): ShipmentDraftLine[] {
    return order.lines
        .filter((line) => line.remainingAcceptedQty > 0)
        .map((line) => ({
            orderLineId: line.id,
            displayName: line.displayName,
            unit: line.unit,
            acceptedQty: line.acceptedQty,
            remainingAcceptedQty: line.remainingAcceptedQty,
            shippedQty: "",
            reason: "",
        }));
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

export default function CompanyDrugOrdersPage() {
    const [activeTab, setActiveTab] = useState("orders");

    const [orders, setOrders] = useState<OrderSummary[]>([]);
    const [facilities, setFacilities] = useState<FacilityOption[]>([]);
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
    const [isOrdersLoading, setIsOrdersLoading] = useState(true);
    const [isOrderDetailLoading, setIsOrderDetailLoading] = useState(false);

    const [orderSearch, setOrderSearch] = useState("");
    const [orderStatusFilter, setOrderStatusFilter] = useState(ALL_VALUE);
    const [facilityFilter, setFacilityFilter] = useState(ALL_VALUE);

    const [isResponseDialogOpen, setIsResponseDialogOpen] = useState(false);
    const [responseLines, setResponseLines] = useState<ResponseDraftLine[]>([]);
    const [isSubmittingResponse, setIsSubmittingResponse] = useState(false);

    const [isShipmentDialogOpen, setIsShipmentDialogOpen] = useState(false);
    const [shipmentLines, setShipmentLines] = useState<ShipmentDraftLine[]>([]);
    const [shipmentAt, setShipmentAt] = useState(formatDateTimeLocal());
    const [shipmentNote, setShipmentNote] = useState("");
    const [isCreatingShipment, setIsCreatingShipment] = useState(false);

    const [catalogItems, setCatalogItems] = useState<CompanyDrugOption[]>([]);
    const [catalogSearch, setCatalogSearch] = useState("");
    const [catalogKindFilter, setCatalogKindFilter] = useState("all");
    const [catalogActiveFilter, setCatalogActiveFilter] = useState("active");
    const [isCatalogLoading, setIsCatalogLoading] = useState(true);

    const [isCatalogDialogOpen, setIsCatalogDialogOpen] = useState(false);
    const [catalogDraft, setCatalogDraft] = useState<CatalogDraft>(buildCatalogDraft());
    const [isSavingCatalog, setIsSavingCatalog] = useState(false);
    const [catalogActionKey, setCatalogActionKey] = useState<string | null>(null);

    const [masterDrugSearch, setMasterDrugSearch] = useState("");
    const deferredMasterDrugSearch = useDeferredValue(masterDrugSearch.trim());
    const [masterDrugOptions, setMasterDrugOptions] = useState<MasterDrugOption[]>([]);
    const [isMasterDrugLoading, setIsMasterDrugLoading] = useState(false);

    const filteredOrders = orders.filter((order) => {
        const search = orderSearch.trim().toLowerCase();
        if (search) {
            const matches = [
                order.orderNo,
                order.facility.facilityName,
                order.facility.facilityCode,
                order.note,
            ]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(search));

            if (!matches) {
                return false;
            }
        }

        if (orderStatusFilter !== ALL_VALUE && order.status !== orderStatusFilter) {
            return false;
        }

        if (facilityFilter !== ALL_VALUE && order.facilityId !== facilityFilter) {
            return false;
        }

        return true;
    });

    const refreshOrders = useCallback(async (preferredOrderId?: string | null) => {
        setIsOrdersLoading(true);
        try {
            const res = await fetch("/api/company/dutru-dat-hang");
            const payload = await res.json();

            if (!res.ok) {
                throw new Error(payload.message || "Không thể tải danh sách đơn");
            }

            const nextOrders = payload.orders || [];
            const nextFacilities = payload.options?.facilities || [];
            setOrders(nextOrders);
            setFacilities(nextFacilities);

            let nextSelectedOrderId: string | null = preferredOrderId ?? null;
            setSelectedOrderId((currentSelectedOrderId) => {
                nextSelectedOrderId =
                    preferredOrderId && nextOrders.some((order: OrderSummary) => order.id === preferredOrderId)
                        ? preferredOrderId
                        : currentSelectedOrderId &&
                            nextOrders.some((order: OrderSummary) => order.id === currentSelectedOrderId)
                            ? currentSelectedOrderId
                            : nextOrders[0]?.id || null;

                return nextSelectedOrderId;
            });

            if (!nextSelectedOrderId) {
                setSelectedOrder(null);
            }
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Không thể tải danh sách đơn");
        } finally {
            setIsOrdersLoading(false);
        }
    }, []);

    async function loadOrderDetail(orderId: string) {
        setIsOrderDetailLoading(true);
        try {
            const res = await fetch(`/api/company/dutru-dat-hang/${orderId}`);
            const payload = await res.json();

            if (!res.ok) {
                throw new Error(payload.message || "Không thể tải chi tiết đơn");
            }

            setSelectedOrder(payload.order || null);
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Không thể tải chi tiết đơn");
        } finally {
            setIsOrderDetailLoading(false);
        }
    }

    const refreshCatalog = useCallback(async (searchOverride?: string) => {
        setIsCatalogLoading(true);
        try {
            const params = new URLSearchParams();
            if (catalogSearch.trim()) {
                params.set("search", catalogSearch.trim());
            }
            if (catalogKindFilter !== "all") {
                params.set("kind", catalogKindFilter);
            }
            if (catalogActiveFilter !== "all") {
                params.set("active", catalogActiveFilter);
            }
            if (searchOverride) {
                params.set("masterSearch", searchOverride);
            }

            const res = await fetch(`/api/company/company-drugs?${params.toString()}`);
            const payload: CatalogPayload & { message?: string } = await res.json();

            if (!res.ok) {
                throw new Error(payload.message || "Không thể tải danh mục công ty");
            }

            setCatalogItems(payload.items || []);
            if (searchOverride !== undefined) {
                setMasterDrugOptions(payload.masterDrugOptions || []);
            }
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Không thể tải danh mục công ty");
        } finally {
            setIsCatalogLoading(false);
        }
    }, [catalogActiveFilter, catalogKindFilter, catalogSearch]);

    async function loadMasterDrugOptions(query: string) {
        if (!query || query.length < 2) {
            setMasterDrugOptions([]);
            return;
        }

        setIsMasterDrugLoading(true);
        try {
            const params = new URLSearchParams({ masterSearch: query });
            const res = await fetch(`/api/company/company-drugs?${params.toString()}`);
            const payload: CatalogPayload & { message?: string } = await res.json();

            if (!res.ok) {
                throw new Error(payload.message || "Không thể tìm thuốc chuẩn");
            }

            setMasterDrugOptions(payload.masterDrugOptions || []);
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Không thể tìm thuốc chuẩn");
        } finally {
            setIsMasterDrugLoading(false);
        }
    }

    useEffect(() => {
        refreshOrders();
    }, [refreshOrders]);

    useEffect(() => {
        refreshCatalog();
    }, [refreshCatalog]);

    useEffect(() => {
        if (!selectedOrderId) {
            setSelectedOrder(null);
            return;
        }

        loadOrderDetail(selectedOrderId);
    }, [selectedOrderId]);

    useEffect(() => {
        if (!isCatalogDialogOpen) {
            return;
        }

        loadMasterDrugOptions(deferredMasterDrugSearch);
    }, [deferredMasterDrugSearch, isCatalogDialogOpen]);

    const isCatalogMasterDrugLocked = Boolean(catalogDraft.id && !catalogDraft.isLegacy);

    function openResponseDialog() {
        if (!selectedOrder) {
            return;
        }

        setResponseLines(buildResponseDraftLines(selectedOrder));
        setIsResponseDialogOpen(true);
    }

    function openShipmentDialog() {
        if (!selectedOrder) {
            return;
        }

        setShipmentLines(buildShipmentDraftLines(selectedOrder));
        setShipmentAt(formatDateTimeLocal());
        setShipmentNote("");
        setIsShipmentDialogOpen(true);
    }

    function openCreateCatalogDialog() {
        setCatalogDraft(buildCatalogDraft());
        setMasterDrugSearch("");
        setMasterDrugOptions([]);
        setIsCatalogDialogOpen(true);
    }

    function openEditCatalogDialog(item: CompanyDrugOption) {
        setCatalogDraft(buildCatalogDraft(item));
        setMasterDrugSearch(item.masterDrug?.tenThuoc || "");
        setMasterDrugOptions(item.masterDrug ? [item.masterDrug] : []);
        setIsCatalogDialogOpen(true);
    }

    async function handleSubmitResponse() {
        if (!selectedOrder) {
            return;
        }

        const payloadLines = responseLines.map((line) => {
            if (line.decision === UNSET_VALUE) {
                throw new Error(`Vui lòng chọn phản hồi cho thuốc ${line.displayName}`);
            }

            if (line.requiresCatalog && line.decision !== "REJECTED") {
                if (line.catalogSelection === CREATE_NEW_VALUE) {
                    if (!line.newCompanyDrugCode.trim()) {
                        throw new Error(
                            `Vui lòng nhập mã thuốc công ty cho dòng ${line.displayName}`
                        );
                    }
                } else if (!line.catalogSelection || line.catalogSelection === NONE_VALUE) {
                    throw new Error(
                        `Vui lòng chọn hoặc tạo thuốc công ty cho dòng ${line.displayName}`
                    );
                }
            }

            return {
                lineId: line.lineId,
                decision: line.decision,
                acceptedQty:
                    line.decision === "PARTIAL"
                        ? Number(line.acceptedQty)
                        : line.decision === "CONFIRMED"
                            ? line.requestedQty
                            : null,
                reason: line.reason,
                companyDrugId:
                    line.requiresCatalog &&
                    line.decision !== "REJECTED" &&
                    line.catalogSelection !== CREATE_NEW_VALUE
                        ? line.catalogSelection
                        : null,
                createCompanyDrug:
                    line.requiresCatalog &&
                    line.decision !== "REJECTED" &&
                    line.catalogSelection === CREATE_NEW_VALUE
                        ? {
                            companyDrugCode: line.newCompanyDrugCode,
                            masterDrugId: line.masterDrug?.id || null,
                            quyCach: line.newQuyCach,
                            isActive: true,
                        }
                        : null,
            };
        });

        setIsSubmittingResponse(true);
        try {
            const res = await fetch(
                `/api/company/dutru-dat-hang/${selectedOrder.id}/respond`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ responses: payloadLines }),
                }
            );
            const payload = await res.json();

            if (!res.ok) {
                throw new Error(payload.message || "Không thể gửi phản hồi đơn");
            }

            setSelectedOrder(payload.order || null);
            setIsResponseDialogOpen(false);
            await refreshOrders(selectedOrder.id);
            await refreshCatalog();
            toast.success("Đã ghi nhận phản hồi của công ty");
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Không thể gửi phản hồi đơn");
        } finally {
            setIsSubmittingResponse(false);
        }
    }

    async function handleCreateShipment() {
        if (!selectedOrder) {
            return;
        }

        const lines = shipmentLines
            .map((line) => ({
                orderLineId: line.orderLineId,
                shippedQty: Number(line.shippedQty),
                reason: line.reason,
            }))
            .filter((line) => Number.isFinite(line.shippedQty) && line.shippedQty > 0);

        if (lines.length === 0) {
            toast.error("Vui lòng nhập ít nhất một dòng có số lượng giao lớn hơn 0");
            return;
        }

        setIsCreatingShipment(true);
        try {
            const res = await fetch(
                `/api/company/dutru-dat-hang/${selectedOrder.id}/shipments`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        shippedAt: shipmentAt,
                        companyNote: shipmentNote,
                        lines,
                    }),
                }
            );
            const payload = await res.json();

            if (!res.ok) {
                throw new Error(payload.message || "Không thể tạo đợt giao");
            }

            setSelectedOrder(payload.order || null);
            setIsShipmentDialogOpen(false);
            await refreshOrders(selectedOrder.id);
            toast.success("Đã tạo đợt giao mới");
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Không thể tạo đợt giao");
        } finally {
            setIsCreatingShipment(false);
        }
    }

    async function handleSaveCatalog() {
        if (!catalogDraft.masterDrugId) {
            toast.error("Vui lòng chọn thuốc chuẩn đã được ánh xạ");
            return;
        }

        setIsSavingCatalog(true);
        try {
            const res = await fetch(
                catalogDraft.id
                    ? `/api/company/company-drugs/${catalogDraft.id}`
                    : "/api/company/company-drugs",
                {
                    method: catalogDraft.id ? "PATCH" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        companyDrugCode: catalogDraft.companyDrugCode,
                        masterDrugId: catalogDraft.masterDrugId,
                        quyCach: catalogDraft.quyCach,
                        isActive: catalogDraft.isActive,
                    }),
                }
            );
            const payload = await res.json();

            if (!res.ok) {
                throw new Error(payload.message || "Không thể lưu thuốc công ty");
            }

            setIsCatalogDialogOpen(false);
            await refreshCatalog();
            if (selectedOrderId) {
                await loadOrderDetail(selectedOrderId);
            }
            toast.success(catalogDraft.id ? "Đã cập nhật thuốc công ty" : "Đã tạo thuốc công ty");
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Không thể lưu thuốc công ty");
        } finally {
            setIsSavingCatalog(false);
        }
    }

    async function handleToggleCatalogActive(item: CompanyDrugOption) {
        const nextIsActive = !item.isActive;
        setCatalogActionKey(`toggle:${item.id}`);
        try {
            const res = await fetch(`/api/company/company-drugs/${item.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    companyDrugCode: item.companyDrugCode,
                    masterDrugId: item.masterDrugId,
                    quyCach: item.quyCach,
                    isActive: nextIsActive,
                }),
            });
            const payload = await res.json();

            if (!res.ok) {
                throw new Error(
                    payload.message ||
                    (nextIsActive
                        ? "Không thể dùng lại thuốc công ty"
                        : "Không thể ngừng sử dụng thuốc công ty")
                );
            }

            await refreshCatalog();
            if (selectedOrderId) {
                await loadOrderDetail(selectedOrderId);
            }
            toast.success(
                nextIsActive
                    ? "Đã chuyển thuốc công ty về trạng thái đang dùng"
                    : "Đã ngừng sử dụng thuốc công ty"
            );
        } catch (error) {
            console.error(error);
            toast.error(
                error instanceof Error
                    ? error.message
                    : nextIsActive
                        ? "Không thể dùng lại thuốc công ty"
                        : "Không thể ngừng sử dụng thuốc công ty"
            );
        } finally {
            setCatalogActionKey(null);
        }
    }

    async function handleDeleteCatalogItem(item: CompanyDrugOption) {
        const confirmed = window.confirm(
            `Xóa vĩnh viễn thuốc công ty ${item.companyDrugCode} - ${item.companyDrugName}?\n\nChỉ xóa được khi thuốc này chưa từng phát sinh trong bất kỳ đơn đặt hàng nào.`
        );

        if (!confirmed) {
            return;
        }

        setCatalogActionKey(`delete:${item.id}`);
        try {
            const res = await fetch(`/api/company/company-drugs/${item.id}`, {
                method: "DELETE",
            });
            const payload = await res.json();

            if (!res.ok) {
                throw new Error(payload.message || "Không thể xóa thuốc công ty");
            }

            if (catalogDraft.id === item.id) {
                setIsCatalogDialogOpen(false);
            }
            await refreshCatalog();
            if (selectedOrderId) {
                await loadOrderDetail(selectedOrderId);
            }
            toast.success(payload.message || "Đã xóa thuốc công ty");
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Không thể xóa thuốc công ty");
        } finally {
            setCatalogActionKey(null);
        }
    }

    const selectedOrderSummary = orders.find((order) => order.id === selectedOrderId) || null;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800">Dự trù đặt hàng</h2>
                    <p className="mt-1 text-gray-500">
                        Công ty phản hồi đơn, quản lý danh mục riêng và tạo các đợt giao theo số lượng đã chấp nhận.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <Card className="border-blue-100 bg-blue-50/70 shadow-none">
                        <CardContent className="flex items-center gap-3 p-4">
                            <ClipboardList className="size-5 text-blue-600" />
                            <div>
                                <p className="text-xs text-blue-700">Tổng đơn</p>
                                <p className="text-xl font-semibold text-blue-900">{orders.length}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-emerald-100 bg-emerald-50/70 shadow-none">
                        <CardContent className="flex items-center gap-3 p-4">
                            <BadgeCheck className="size-5 text-emerald-600" />
                            <div>
                                <p className="text-xs text-emerald-700">Sẵn sàng giao / đang giao</p>
                                <p className="text-xl font-semibold text-emerald-900">
                                    {
                                        orders.filter(
                                            (order) =>
                                                order.status === "READY_FOR_SHIPMENT" ||
                                                order.status === "IN_DELIVERY"
                                        ).length
                                    }
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-amber-100 bg-amber-50/70 shadow-none">
                        <CardContent className="flex items-center gap-3 p-4">
                            <PackagePlus className="size-5 text-amber-600" />
                            <div>
                                <p className="text-xs text-amber-700">Thuốc công ty active</p>
                                <p className="text-xl font-semibold text-amber-900">
                                    {catalogItems.filter((item) => item.isActive).length}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full max-w-md bg-white border border-gray-200 rounded-xl p-1 shadow-sm h-auto">
                    <TabsTrigger value="orders">Đơn đặt hàng</TabsTrigger>
                    <TabsTrigger value="catalog">Danh mục công ty</TabsTrigger>
                </TabsList>

                <TabsContent value="orders" className="mt-5">
                    <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
                        <Card>
                            <CardHeader className="space-y-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <CardTitle>Danh sách đơn</CardTitle>
                                        <CardDescription>
                                            Tìm theo mã đơn, cơ sở, trạng thái và chọn đơn cần xử lý.
                                        </CardDescription>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={() => refreshOrders(selectedOrderId)}
                                        disabled={isOrdersLoading}
                                    >
                                        {isOrdersLoading ? (
                                            <Loader2 className="size-4 animate-spin" />
                                        ) : (
                                            <RefreshCcw className="size-4" />
                                        )}
                                    </Button>
                                </div>

                                <div className="space-y-3">
                                    <div className="relative">
                                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                                        <Input
                                            value={orderSearch}
                                            onChange={(event) => setOrderSearch(event.target.value)}
                                            placeholder="Tìm mã đơn hoặc cơ sở"
                                            className="pl-9"
                                        />
                                    </div>

                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <Select value={orderStatusFilter} onValueChange={setOrderStatusFilter}>
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
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent>
                                <div className="space-y-3">
                                    {isOrdersLoading ? (
                                        <div className="flex items-center justify-center py-10 text-sm text-gray-500">
                                            <Loader2 className="mr-2 size-4 animate-spin" />
                                            Đang tải danh sách đơn...
                                        </div>
                                    ) : filteredOrders.length === 0 ? (
                                        <div className="rounded-lg border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
                                            Không có đơn nào khớp điều kiện lọc.
                                        </div>
                                    ) : (
                                        filteredOrders.map((order) => (
                                            <button
                                                key={order.id}
                                                type="button"
                                                onClick={() => setSelectedOrderId(order.id)}
                                                className={`w-full rounded-xl border p-4 text-left transition ${
                                                    selectedOrderId === order.id
                                                        ? "border-blue-300 bg-blue-50 shadow-sm"
                                                        : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <p className="font-semibold text-gray-900">{order.orderNo}</p>
                                                        <p className="mt-1 text-sm text-gray-500">
                                                            {order.facility.facilityName} ({order.facility.facilityCode})
                                                        </p>
                                                    </div>
                                                    <OrderStatusBadge status={order.status} />
                                                </div>

                                                <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-gray-600">
                                                    <div>
                                                        <p className="text-xs text-gray-400">Dòng thuốc</p>
                                                        <p className="font-medium">{order.lineCount}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-400">Yêu cầu</p>
                                                        <p className="font-medium">{formatQuantity(order.totalRequestedQty)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-400">Đã chấp nhận</p>
                                                        <p className="font-medium">{formatQuantity(order.totalAcceptedQty)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-400">Đã giao</p>
                                                        <p className="font-medium">{formatQuantity(order.totalShippedQty)}</p>
                                                    </div>
                                                </div>

                                                {order.pendingCatalogCount > 0 && (
                                                    <p className="mt-3 text-xs font-medium text-amber-700">
                                                        {order.pendingCatalogCount} dòng đang chờ xác nhận danh mục
                                                    </p>
                                                )}
                                            </button>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <div className="space-y-6">
                            <Card>
                                <CardHeader className="space-y-4">
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                        <div>
                                            <CardTitle>
                                                {selectedOrder?.orderNo || selectedOrderSummary?.orderNo || "Chi tiết đơn"}
                                            </CardTitle>
                                            <CardDescription>
                                                Xem chi tiết từng dòng, phản hồi đơn và tạo các đợt giao hàng.
                                            </CardDescription>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => selectedOrderId && loadOrderDetail(selectedOrderId)}
                                                disabled={!selectedOrderId || isOrderDetailLoading}
                                            >
                                                {isOrderDetailLoading ? (
                                                    <Loader2 className="mr-2 size-4 animate-spin" />
                                                ) : (
                                                    <RefreshCcw className="mr-2 size-4" />
                                                )}
                                                Làm mới
                                            </Button>

                                            {selectedOrder?.permissions.canRespond && (
                                                <Button type="button" onClick={openResponseDialog}>
                                                    <Send className="mr-2 size-4" />
                                                    Phản hồi đơn
                                                </Button>
                                            )}

                                            {selectedOrder?.permissions.canCreateShipment && (
                                                <Button type="button" variant="secondary" onClick={openShipmentDialog}>
                                                    <Truck className="mr-2 size-4" />
                                                    Tạo đợt giao
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    {selectedOrder && (
                                        <div className="grid gap-4 lg:grid-cols-4">
                                            <Card className="border-gray-200 shadow-none">
                                                <CardContent className="space-y-1 p-4">
                                                    <p className="text-xs text-gray-400">Trạng thái</p>
                                                    <OrderStatusBadge status={selectedOrder.status} />
                                                </CardContent>
                                            </Card>

                                            <Card className="border-gray-200 shadow-none">
                                                <CardContent className="space-y-1 p-4">
                                                    <p className="text-xs text-gray-400">Cơ sở</p>
                                                    <p className="font-medium text-gray-900">
                                                        {selectedOrder.facility.facilityName}
                                                    </p>
                                                    <p className="text-sm text-gray-500">
                                                        {selectedOrder.facility.facilityCode}
                                                    </p>
                                                </CardContent>
                                            </Card>

                                            <Card className="border-gray-200 shadow-none">
                                                <CardContent className="space-y-1 p-4">
                                                    <p className="text-xs text-gray-400">Tháng XNT tham chiếu</p>
                                                    <p className="font-medium text-gray-900">
                                                        {selectedOrder.baseReportMonth || "—"}
                                                    </p>
                                                </CardContent>
                                            </Card>

                                            <Card className="border-gray-200 shadow-none">
                                                <CardContent className="space-y-1 p-4">
                                                    <p className="text-xs text-gray-400">Ngày gửi</p>
                                                    <p className="font-medium text-gray-900">
                                                        {formatDateTime(selectedOrder.submittedAt)}
                                                    </p>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    )}
                                </CardHeader>

                                <CardContent>
                                    {!selectedOrderId ? (
                                        <div className="rounded-lg border border-dashed border-gray-200 px-4 py-10 text-center text-sm text-gray-500">
                                            Chọn một đơn ở cột bên trái để xem chi tiết.
                                        </div>
                                    ) : isOrderDetailLoading && !selectedOrder ? (
                                        <div className="flex items-center justify-center py-10 text-sm text-gray-500">
                                            <Loader2 className="mr-2 size-4 animate-spin" />
                                            Đang tải chi tiết đơn...
                                        </div>
                                    ) : !selectedOrder ? (
                                        <div className="rounded-lg border border-dashed border-gray-200 px-4 py-10 text-center text-sm text-gray-500">
                                            Không thể tải chi tiết đơn đã chọn.
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                                                <p className="text-sm font-medium text-gray-700">Ghi chú từ cơ sở</p>
                                                <p className="mt-1 text-sm text-gray-600">
                                                    {selectedOrder.note || "Không có ghi chú."}
                                                </p>
                                            </div>

                                            <div className="overflow-x-auto rounded-xl border border-gray-200">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Thuốc</TableHead>
                                                            <TableHead>Nguồn</TableHead>
                                                            <TableHead className="text-right">Yêu cầu</TableHead>
                                                            <TableHead className="text-right">Chấp nhận</TableHead>
                                                            <TableHead className="text-right">Đã giao</TableHead>
                                                            <TableHead className="text-right">Còn lại</TableHead>
                                                            <TableHead>Trạng thái</TableHead>
                                                            <TableHead>Lý do</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {selectedOrder.lines.map((line) => (
                                                            <TableRow key={line.id}>
                                                                <TableCell className="min-w-[320px] align-top">
                                                                    <div className="space-y-1">
                                                                        <p className="font-medium text-gray-900">
                                                                            {line.displayName}
                                                                        </p>
                                                                        <p className="text-xs text-gray-500">
                                                                            Đơn vị: {line.unit || "—"}
                                                                        </p>
                                                                        {line.masterDrug && (
                                                                            <p className="text-xs text-gray-500">
                                                                                Thuốc chuẩn: {line.masterDrug.maChung} - {line.masterDrug.tenThuoc}
                                                                            </p>
                                                                        )}
                                                                        {line.companyDrug && (
                                                                            <p className="text-xs text-gray-500">
                                                                                Thuốc công ty: {line.companyDrug.companyDrugCode} - {line.companyDrug.companyDrugName}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="align-top">
                                                                    <Badge variant="outline">
                                                                        {line.sourceType === "MASTER_DRUG" ? "Danh mục chung" : "Danh mục công ty"}
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell className="text-right align-top">
                                                                    {formatQuantity(line.requestedQty)}
                                                                </TableCell>
                                                                <TableCell className="text-right align-top">
                                                                    {formatQuantity(line.acceptedQty)}
                                                                </TableCell>
                                                                <TableCell className="text-right align-top">
                                                                    {formatQuantity(line.totalShippedQty)}
                                                                </TableCell>
                                                                <TableCell className="text-right align-top">
                                                                    {formatQuantity(line.remainingAcceptedQty)}
                                                                </TableCell>
                                                                <TableCell className="align-top">
                                                                    <LineStatusBadge status={line.lineStatus} />
                                                                </TableCell>
                                                                <TableCell className="min-w-[220px] align-top text-sm text-gray-600">
                                                                    {line.companyResponseReason || "—"}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2">
                                                    <Truck className="size-4 text-gray-500" />
                                                    <h3 className="font-semibold text-gray-900">Lịch sử đợt giao</h3>
                                                </div>

                                                {selectedOrder.shipments.length === 0 ? (
                                                    <div className="rounded-lg border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
                                                        Chưa có đợt giao nào cho đơn này.
                                                    </div>
                                                ) : (
                                                    selectedOrder.shipments.map((shipment) => (
                                                        <Card key={shipment.id} className="border-gray-200 shadow-none">
                                                            <CardHeader className="pb-3">
                                                                <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                                                                    <div>
                                                                        <CardTitle className="text-base">
                                                                            Đợt giao #{shipment.shipmentNo}
                                                                        </CardTitle>
                                                                        <CardDescription>
                                                                            Thời điểm giao: {formatDateTime(shipment.shippedAt)}
                                                                        </CardDescription>
                                                                    </div>

                                                                    <Badge
                                                                        variant="outline"
                                                                        className="border-blue-300 text-blue-700"
                                                                    >
                                                                        {shipment.status === "CREATED"
                                                                            ? "Đã tạo"
                                                                            : shipment.status === "PARTIALLY_RECEIVED"
                                                                                ? "Đã nhận một phần"
                                                                                : "Đã nhận"}
                                                                    </Badge>
                                                                </div>
                                                            </CardHeader>

                                                            <CardContent className="space-y-3">
                                                                {shipment.companyNote && (
                                                                    <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
                                                                        {shipment.companyNote}
                                                                    </div>
                                                                )}

                                                                <div className="overflow-x-auto rounded-xl border border-gray-200">
                                                                    <Table>
                                                                        <TableHeader>
                                                                            <TableRow>
                                                                                <TableHead>Thuốc</TableHead>
                                                                                <TableHead className="text-right">Giao</TableHead>
                                                                                <TableHead className="text-right">Thực nhận</TableHead>
                                                                                <TableHead>Lý do</TableHead>
                                                                            </TableRow>
                                                                        </TableHeader>
                                                                        <TableBody>
                                                                            {shipment.lines.map((line) => (
                                                                                <TableRow key={line.id}>
                                                                                    <TableCell>
                                                                                        <p className="font-medium text-gray-900">
                                                                                            {line.displayName}
                                                                                        </p>
                                                                                        <p className="text-xs text-gray-500">
                                                                                            Đơn vị: {line.unit || "—"}
                                                                                        </p>
                                                                                    </TableCell>
                                                                                    <TableCell className="text-right">
                                                                                        {formatQuantity(line.shippedQty)}
                                                                                    </TableCell>
                                                                                    <TableCell className="text-right">
                                                                                        {formatQuantity(line.receivedQty)}
                                                                                    </TableCell>
                                                                                    <TableCell className="text-sm text-gray-600">
                                                                                        {line.reason || "—"}
                                                                                    </TableCell>
                                                                                </TableRow>
                                                                            ))}
                                                                        </TableBody>
                                                                    </Table>
                                                                </div>
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
                </TabsContent>

                <TabsContent value="catalog" className="mt-5">
                    <Card>
                        <CardHeader className="space-y-4">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div>
                                    <CardTitle>Danh mục thuốc công ty</CardTitle>
                                    <CardDescription>
                                        Chỉ tạo thuốc công ty từ danh mục dùng chung đã được ánh xạ. Tên thuốc và thông tin mô tả được đồng bộ theo thuốc chuẩn.
                                    </CardDescription>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => refreshCatalog()}
                                        disabled={isCatalogLoading}
                                    >
                                        {isCatalogLoading ? (
                                            <Loader2 className="mr-2 size-4 animate-spin" />
                                        ) : (
                                            <RefreshCcw className="mr-2 size-4" />
                                        )}
                                        Làm mới
                                    </Button>
                                    <Button type="button" onClick={openCreateCatalogDialog}>
                                        <Plus className="mr-2 size-4" />
                                        Thêm thuốc công ty
                                    </Button>
                                </div>
                            </div>

                            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_200px_180px]">
                                <div className="relative">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                                    <Input
                                        value={catalogSearch}
                                        onChange={(event) => setCatalogSearch(event.target.value)}
                                        placeholder="Tìm mã thuốc, tên thuốc, hoạt chất, quy cách"
                                        className="pl-9"
                                    />
                                </div>

                                <Select value={catalogKindFilter} onValueChange={setCatalogKindFilter}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Loại danh mục" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tất cả</SelectItem>
                                        <SelectItem value="mapped">Đã chuẩn hóa</SelectItem>
                                        <SelectItem value="legacy">Legacy</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select value={catalogActiveFilter} onValueChange={setCatalogActiveFilter}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Trạng thái hoạt động" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tất cả</SelectItem>
                                        <SelectItem value="active">Đang dùng</SelectItem>
                                        <SelectItem value="inactive">Ngừng dùng</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardHeader>

                        <CardContent>
                            {isCatalogLoading ? (
                                <div className="flex items-center justify-center py-10 text-sm text-gray-500">
                                    <Loader2 className="mr-2 size-4 animate-spin" />
                                    Đang tải danh mục thuốc công ty...
                                </div>
                            ) : catalogItems.length === 0 ? (
                                <div className="rounded-lg border border-dashed border-gray-200 px-4 py-10 text-center text-sm text-gray-500">
                                    Chưa có thuốc công ty nào khớp điều kiện lọc.
                                </div>
                            ) : (
                                <div className="overflow-x-auto rounded-xl border border-gray-200">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Mã thuốc công ty</TableHead>
                                                <TableHead>Tên thuốc</TableHead>
                                                <TableHead>Hoạt chất</TableHead>
                                                <TableHead>Hàm lượng</TableHead>
                                                <TableHead>Số đăng ký</TableHead>
                                                <TableHead>Dạng bào chế</TableHead>
                                                <TableHead>Quy cách</TableHead>
                                                <TableHead>Liên kết danh mục chung</TableHead>
                                                <TableHead>Đơn vị</TableHead>
                                                <TableHead>Trạng thái</TableHead>
                                                <TableHead className="text-right">Hành động</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {catalogItems.map((item) => (
                                                <TableRow key={item.id}>
                                                    <TableCell className="font-medium">
                                                        {item.companyDrugCode}
                                                    </TableCell>
                                                    <TableCell className="min-w-[280px]">
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <p className="font-medium text-gray-900">
                                                                    {item.companyDrugName}
                                                                </p>
                                                                {item.isLegacy ? (
                                                                    <Badge variant="secondary">Legacy</Badge>
                                                                ) : null}
                                                            </div>
                                                            <p className="text-xs text-gray-500">
                                                                {item.masterDrug?.maChung || "Chưa gắn thuốc chuẩn"}
                                                            </p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{item.activeIngredient || item.masterDrug?.hoatChat || "—"}</TableCell>
                                                    <TableCell>{item.masterDrug?.hamLuong || "—"}</TableCell>
                                                    <TableCell>{item.masterDrug?.soDangKy || "—"}</TableCell>
                                                    <TableCell>{item.masterDrug?.dangBaoChe || "—"}</TableCell>
                                                    <TableCell className="min-w-[220px]">
                                                        {item.quyCach || item.masterDrug?.quyCach || "—"}
                                                    </TableCell>
                                                    <TableCell className="min-w-[280px] text-sm text-gray-600">
                                                        {item.masterDrug ? (
                                                            <div>
                                                                <p>{item.masterDrug.maChung}</p>
                                                                <p className="text-xs text-gray-500">
                                                                    {item.masterDrug.tenThuoc}
                                                                </p>
                                                            </div>
                                                        ) : (
                                                            "Chưa liên kết"
                                                        )}
                                                    </TableCell>
                                                    <TableCell>{item.unit || item.masterDrug?.donViTinh || "—"}</TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant={item.isActive ? "outline" : "secondary"}
                                                            className={
                                                                item.isActive
                                                                    ? "border-emerald-300 text-emerald-700"
                                                                    : undefined
                                                            }
                                                        >
                                                            {item.isActive ? "Đang dùng" : "Ngừng dùng"}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex flex-wrap justify-end gap-2">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => openEditCatalogDialog(item)}
                                                                disabled={catalogActionKey === `toggle:${item.id}` || catalogActionKey === `delete:${item.id}`}
                                                            >
                                                                <PencilLine className="mr-2 size-4" />
                                                                Sửa
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="secondary"
                                                                size="sm"
                                                                onClick={() => handleToggleCatalogActive(item)}
                                                                disabled={catalogActionKey === `toggle:${item.id}` || catalogActionKey === `delete:${item.id}`}
                                                            >
                                                                {catalogActionKey === `toggle:${item.id}` ? (
                                                                    <Loader2 className="mr-2 size-4 animate-spin" />
                                                                ) : null}
                                                                {item.isActive ? "Ngừng dùng" : "Dùng lại"}
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="destructive"
                                                                size="sm"
                                                                onClick={() => handleDeleteCatalogItem(item)}
                                                                disabled={
                                                                    !item.canDelete ||
                                                                    catalogActionKey === `toggle:${item.id}` ||
                                                                    catalogActionKey === `delete:${item.id}`
                                                                }
                                                            >
                                                                {catalogActionKey === `delete:${item.id}` ? (
                                                                    <Loader2 className="mr-2 size-4 animate-spin" />
                                                                ) : (
                                                                    <Trash2 className="mr-2 size-4" />
                                                                )}
                                                                Xóa
                                                            </Button>
                                                        </div>
                                                        {!item.canDelete && (
                                                            <p className="mt-2 text-xs text-gray-500">
                                                                Đã phát sinh trong {formatQuantity(item.referencedOrderLineCount || 0)} dòng đơn
                                                            </p>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <Dialog open={isResponseDialogOpen} onOpenChange={setIsResponseDialogOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-6xl">
                    <DialogHeader>
                        <DialogTitle>Phản hồi đơn đặt hàng</DialogTitle>
                        <DialogDescription>
                            Công ty phải phản hồi đầy đủ từng dòng. Mọi quyết định đều cần lý do.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {responseLines.map((line, index) => {
                            const matchingCompanyDrugs =
                                selectedOrder?.options.companyDrugs.filter(
                                    (drug) => drug.masterDrugId && drug.masterDrugId === line.masterDrug?.id
                                ) || [];

                            return (
                                <div key={line.lineId} className="rounded-xl border border-gray-200 p-4">
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                        <div>
                                            <p className="font-semibold text-gray-900">
                                                {index + 1}. {line.displayName}
                                            </p>
                                            <p className="mt-1 text-sm text-gray-500">
                                                Yêu cầu: {formatQuantity(line.requestedQty)} {line.unit || ""}
                                            </p>
                                            {line.masterDrug && (
                                                <p className="text-xs text-gray-500">
                                                    Thuốc chuẩn: {line.masterDrug.maChung} - {line.masterDrug.tenThuoc}
                                                </p>
                                            )}
                                        </div>

                                        <div className="grid gap-3 lg:grid-cols-[220px_160px]">
                                            <div className="space-y-2">
                                                <Label>Phản hồi</Label>
                                                <Select
                                                    value={line.decision}
                                                    onValueChange={(value) => {
                                                        setResponseLines((current) =>
                                                            current.map((currentLine) =>
                                                                currentLine.lineId === line.lineId
                                                                    ? {
                                                                        ...currentLine,
                                                                        decision: value as ResponseDecision,
                                                                        acceptedQty:
                                                                            value === "CONFIRMED"
                                                                                ? String(currentLine.requestedQty)
                                                                                : value === "REJECTED"
                                                                                    ? "0"
                                                                                    : currentLine.acceptedQty,
                                                                    }
                                                                    : currentLine
                                                            )
                                                        );
                                                    }}
                                                >
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue placeholder="Chọn phản hồi" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value={UNSET_VALUE}>Chọn phản hồi</SelectItem>
                                                        <SelectItem value="CONFIRMED">Xác nhận đủ</SelectItem>
                                                        <SelectItem value="PARTIAL">Giao một phần</SelectItem>
                                                        <SelectItem value="REJECTED">Từ chối</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Số lượng chấp nhận</Label>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={line.acceptedQty}
                                                    onChange={(event) => {
                                                        const nextValue = event.target.value;
                                                        setResponseLines((current) =>
                                                            current.map((currentLine) =>
                                                                currentLine.lineId === line.lineId
                                                                    ? { ...currentLine, acceptedQty: nextValue }
                                                                    : currentLine
                                                            )
                                                        );
                                                    }}
                                                    disabled={line.decision !== "PARTIAL"}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 space-y-2">
                                        <Label>Lý do phản hồi</Label>
                                        <Textarea
                                            value={line.reason}
                                            onChange={(event) => {
                                                const nextValue = event.target.value;
                                                setResponseLines((current) =>
                                                    current.map((currentLine) =>
                                                        currentLine.lineId === line.lineId
                                                            ? { ...currentLine, reason: nextValue }
                                                            : currentLine
                                                    )
                                                );
                                            }}
                                            rows={2}
                                            placeholder="Nhập lý do xác nhận, giao một phần hoặc từ chối"
                                        />
                                    </div>

                                    {line.requiresCatalog && line.decision !== "REJECTED" && (
                                        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
                                            <p className="text-sm font-medium text-amber-900">
                                                Dòng này đang chờ xác nhận danh mục công ty
                                            </p>
                                            <p className="mt-1 text-sm text-amber-800">
                                                Chọn thuốc công ty đã map sẵn hoặc tạo mới một thuốc công ty gắn với thuốc chuẩn này.
                                            </p>

                                            <div className="mt-3 space-y-2">
                                                <Label>Liên kết thuốc công ty</Label>
                                                <Select
                                                    value={line.catalogSelection}
                                                    onValueChange={(value) => {
                                                        setResponseLines((current) =>
                                                            current.map((currentLine) =>
                                                                currentLine.lineId === line.lineId
                                                                    ? { ...currentLine, catalogSelection: value }
                                                                    : currentLine
                                                            )
                                                        );
                                                    }}
                                                >
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue placeholder="Chọn thuốc công ty" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {matchingCompanyDrugs.length === 0 && (
                                                            <SelectItem value={NONE_VALUE} disabled>
                                                                Chưa có thuốc công ty đã map
                                                            </SelectItem>
                                                        )}
                                                        {matchingCompanyDrugs.map((drug) => (
                                                            <SelectItem key={drug.id} value={drug.id}>
                                                                {drug.companyDrugCode} - {drug.companyDrugName}
                                                            </SelectItem>
                                                        ))}
                                                        <SelectItem value={CREATE_NEW_VALUE}>
                                                            Tạo mới trong danh mục công ty
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {line.catalogSelection === CREATE_NEW_VALUE && (
                                                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                                                    <div className="space-y-2">
                                                        <Label>Mã thuốc công ty</Label>
                                                        <Input
                                                            value={line.newCompanyDrugCode}
                                                            onChange={(event) => {
                                                                const nextValue = event.target.value;
                                                                setResponseLines((current) =>
                                                                    current.map((currentLine) =>
                                                                        currentLine.lineId === line.lineId
                                                                            ? {
                                                                                ...currentLine,
                                                                                newCompanyDrugCode: nextValue,
                                                                            }
                                                                            : currentLine
                                                                    )
                                                                );
                                                            }}
                                                            placeholder="VD: CTY-001"
                                                        />
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label>Tên thuốc</Label>
                                                        <Input
                                                            value={line.masterDrug?.tenThuoc || line.displayName}
                                                            readOnly
                                                            className="bg-gray-50"
                                                        />
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label>Hoạt chất</Label>
                                                        <Input
                                                            value={line.masterDrug?.hoatChat || ""}
                                                            readOnly
                                                            className="bg-gray-50"
                                                        />
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label>Hàm lượng</Label>
                                                        <Input
                                                            value={line.masterDrug?.hamLuong || ""}
                                                            readOnly
                                                            className="bg-gray-50"
                                                        />
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label>Số đăng ký</Label>
                                                        <Input
                                                            value={line.masterDrug?.soDangKy || ""}
                                                            readOnly
                                                            className="bg-gray-50"
                                                        />
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label>Dạng bào chế</Label>
                                                        <Input
                                                            value={line.masterDrug?.dangBaoChe || ""}
                                                            readOnly
                                                            className="bg-gray-50"
                                                        />
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label>Quy cách</Label>
                                                        <Input
                                                            value={line.newQuyCach}
                                                            onChange={(event) => {
                                                                const nextValue = event.target.value;
                                                                setResponseLines((current) =>
                                                                    current.map((currentLine) =>
                                                                        currentLine.lineId === line.lineId
                                                                            ? {
                                                                                ...currentLine,
                                                                                newQuyCach: nextValue,
                                                                            }
                                                                            : currentLine
                                                                    )
                                                                );
                                                            }}
                                                        />
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label>Đơn vị</Label>
                                                        <Input
                                                            value={line.masterDrug?.donViTinh || line.unit || ""}
                                                            readOnly
                                                            className="bg-gray-50"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsResponseDialogOpen(false)}
                            disabled={isSubmittingResponse}
                        >
                            Đóng
                        </Button>
                        <Button type="button" onClick={handleSubmitResponse} disabled={isSubmittingResponse}>
                            {isSubmittingResponse ? (
                                <Loader2 className="mr-2 size-4 animate-spin" />
                            ) : (
                                <Send className="mr-2 size-4" />
                            )}
                            Gửi phản hồi
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isShipmentDialogOpen} onOpenChange={setIsShipmentDialogOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
                    <DialogHeader>
                        <DialogTitle>Tạo đợt giao hàng</DialogTitle>
                        <DialogDescription>
                            Chỉ giao trong phạm vi số lượng đã chấp nhận và chưa giao hết.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                        <div className="space-y-2">
                            <Label>Thời điểm giao</Label>
                            <Input
                                type="datetime-local"
                                value={shipmentAt}
                                onChange={(event) => setShipmentAt(event.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Ghi chú đợt giao</Label>
                            <Textarea
                                value={shipmentNote}
                                onChange={(event) => setShipmentNote(event.target.value)}
                                rows={2}
                                placeholder="Ghi chú chung cho đợt giao"
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        {shipmentLines.map((line) => (
                            <div key={line.orderLineId} className="rounded-xl border border-gray-200 p-4">
                                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_160px_160px]">
                                    <div>
                                        <p className="font-semibold text-gray-900">{line.displayName}</p>
                                        <p className="mt-1 text-sm text-gray-500">
                                            Đã chấp nhận: {formatQuantity(line.acceptedQty)} {line.unit || ""}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            Còn lại chưa giao: {formatQuantity(line.remainingAcceptedQty)}
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Số lượng giao</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={line.shippedQty}
                                            onChange={(event) => {
                                                const nextValue = event.target.value;
                                                setShipmentLines((current) =>
                                                    current.map((currentLine) =>
                                                        currentLine.orderLineId === line.orderLineId
                                                            ? { ...currentLine, shippedQty: nextValue }
                                                            : currentLine
                                                    )
                                                );
                                            }}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Lý do nếu giao chưa đủ</Label>
                                        <Input
                                            value={line.reason}
                                            onChange={(event) => {
                                                const nextValue = event.target.value;
                                                setShipmentLines((current) =>
                                                    current.map((currentLine) =>
                                                        currentLine.orderLineId === line.orderLineId
                                                            ? { ...currentLine, reason: nextValue }
                                                            : currentLine
                                                    )
                                                );
                                            }}
                                            placeholder="Ví dụ: chia làm 2 đợt"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsShipmentDialogOpen(false)}
                            disabled={isCreatingShipment}
                        >
                            Đóng
                        </Button>
                        <Button type="button" onClick={handleCreateShipment} disabled={isCreatingShipment}>
                            {isCreatingShipment ? (
                                <Loader2 className="mr-2 size-4 animate-spin" />
                            ) : (
                                <Truck className="mr-2 size-4" />
                            )}
                            Tạo đợt giao
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isCatalogDialogOpen} onOpenChange={setIsCatalogDialogOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>
                            {catalogDraft.id ? "Cập nhật thuốc công ty" : "Thêm thuốc công ty"}
                        </DialogTitle>
                        <DialogDescription>
                            Chỉ được tạo thuốc công ty từ danh mục dùng chung đã được ánh xạ. Tên thuốc và các thông tin mô tả được đồng bộ theo thuốc chuẩn.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 lg:grid-cols-2">
                        <div className="space-y-2 lg:col-span-2">
                            <Label>Thuốc chuẩn đã được ánh xạ</Label>
                            <div className="rounded-xl border border-gray-200 p-4">
                                <div className="flex flex-col gap-3 lg:flex-row">
                                    <Input
                                        value={masterDrugSearch}
                                        onChange={(event) => setMasterDrugSearch(event.target.value)}
                                        placeholder="Tìm theo mã chung, tên thuốc, hoạt chất, số đăng ký"
                                        disabled={isCatalogMasterDrugLocked}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => loadMasterDrugOptions(masterDrugSearch.trim())}
                                        disabled={isCatalogMasterDrugLocked || isMasterDrugLoading}
                                    >
                                        {isMasterDrugLoading ? (
                                            <Loader2 className="mr-2 size-4 animate-spin" />
                                        ) : (
                                            <Search className="mr-2 size-4" />
                                        )}
                                        Tìm thuốc chuẩn
                                    </Button>
                                    {!isCatalogMasterDrugLocked && catalogDraft.masterDrugId && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() =>
                                                setCatalogDraft((current) => ({
                                                    ...current,
                                                    masterDrugId: null,
                                                    masterDrugLabel: "",
                                                    companyDrugName: "",
                                                    activeIngredient: "",
                                                    hamLuong: "",
                                                    soDangKy: "",
                                                    dangBaoChe: "",
                                                    unit: "",
                                                    quyCach: "",
                                                }))
                                            }
                                        >
                                            Bỏ chọn
                                        </Button>
                                    )}
                                </div>

                                <div className="mt-3 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
                                    {catalogDraft.masterDrugId
                                        ? `Đang liên kết: ${catalogDraft.masterDrugLabel}`
                                        : "Chưa chọn thuốc chuẩn. Phải chọn một thuốc chuẩn đã được ánh xạ trước khi lưu."}
                                    {isCatalogMasterDrugLocked ? (
                                        <p className="mt-2 text-xs text-amber-700">
                                            Thuốc chuẩn đã được khóa với bản ghi đã chuẩn hóa. Nếu gắn nhầm, hãy tạo lại bản ghi mới.
                                        </p>
                                    ) : null}
                                    {catalogDraft.id && catalogDraft.isLegacy ? (
                                        <p className="mt-2 text-xs text-amber-700">
                                            Bản ghi legacy cần được gắn lại vào một thuốc chuẩn đã được ánh xạ trước khi lưu thay đổi.
                                        </p>
                                    ) : null}
                                </div>

                                {!isCatalogMasterDrugLocked && masterDrugOptions.length > 0 && (
                                    <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
                                        {masterDrugOptions.map((drug) => (
                                            <button
                                                key={drug.id}
                                                type="button"
                                                onClick={() =>
                                                    setCatalogDraft((current) =>
                                                        applyMasterDrugToCatalogDraft(current, drug)
                                                    )
                                                }
                                                className={`w-full rounded-lg border p-3 text-left transition ${
                                                    catalogDraft.masterDrugId === drug.id
                                                        ? "border-blue-300 bg-blue-50"
                                                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                                }`}
                                            >
                                                <p className="font-medium text-gray-900">
                                                    {drug.maChung} - {drug.tenThuoc}
                                                </p>
                                                <p className="mt-1 text-xs text-gray-500">
                                                    {drug.hoatChat || "—"} | Hàm lượng: {drug.hamLuong || "—"} | SĐK: {drug.soDangKy || "—"}
                                                </p>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Mã thuốc công ty</Label>
                            <Input
                                value={catalogDraft.companyDrugCode}
                                onChange={(event) =>
                                    setCatalogDraft((current) => ({
                                        ...current,
                                        companyDrugCode: event.target.value,
                                    }))
                                }
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Tên thuốc</Label>
                            <Input
                                value={catalogDraft.companyDrugName}
                                readOnly
                                className="bg-gray-50"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Hoạt chất</Label>
                            <Input
                                value={catalogDraft.activeIngredient}
                                readOnly
                                className="bg-gray-50"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Hàm lượng</Label>
                            <Input
                                value={catalogDraft.hamLuong}
                                readOnly
                                className="bg-gray-50"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Số đăng ký</Label>
                            <Input
                                value={catalogDraft.soDangKy}
                                readOnly
                                className="bg-gray-50"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Dạng bào chế</Label>
                            <Input
                                value={catalogDraft.dangBaoChe}
                                readOnly
                                className="bg-gray-50"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Quy cách</Label>
                            <Input
                                value={catalogDraft.quyCach}
                                onChange={(event) =>
                                    setCatalogDraft((current) => ({
                                        ...current,
                                        quyCach: event.target.value,
                                    }))
                                }
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Đơn vị</Label>
                            <Input
                                value={catalogDraft.unit}
                                readOnly
                                className="bg-gray-50"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Trạng thái sử dụng</Label>
                            <Select
                                value={catalogDraft.isActive ? "active" : "inactive"}
                                onValueChange={(value) =>
                                    setCatalogDraft((current) => ({
                                        ...current,
                                        isActive: value === "active",
                                    }))
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Đang dùng</SelectItem>
                                    <SelectItem value="inactive">Ngừng dùng</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsCatalogDialogOpen(false)}
                            disabled={isSavingCatalog}
                        >
                            Đóng
                        </Button>
                        <Button type="button" onClick={handleSaveCatalog} disabled={isSavingCatalog}>
                            {isSavingCatalog ? (
                                <Loader2 className="mr-2 size-4 animate-spin" />
                            ) : catalogDraft.id ? (
                                <PencilLine className="mr-2 size-4" />
                            ) : (
                                <Plus className="mr-2 size-4" />
                            )}
                            {catalogDraft.id ? "Lưu thay đổi" : "Tạo thuốc công ty"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
