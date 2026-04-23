"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
    CheckCircle,
    Building2,
    ClipboardList,
    Loader2,
    PackageSearch,
    Plus,
    RefreshCcw,
    Save,
    Search,
    Send,
    Truck,
    Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

interface CompanyOption {
    id: string;
    code: string;
    name: string;
}

interface ReportMonthOption {
    value: string;
    label: string;
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
    masterDrugId: string | null;
    masterDrug: MasterDrugOption | null;
}

interface OrderSummary {
    id: string;
    orderNo: string;
    companyId: string;
    company: CompanyOption;
    status: OrderStatus;
    baseReportMonth: string | null;
    note: string | null;
    submittedAt: string | null;
    createdAt: string;
    updatedAt: string;
    lineCount: number;
    totalRequestedQty: number;
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
    companyId: string;
    company: CompanyOption;
    status: OrderStatus;
    baseReportMonth: string | null;
    note: string | null;
    submittedAt: string | null;
    closedAt: string | null;
    createdAt: string;
    updatedAt: string;
    permissions: {
        canEdit: boolean;
        canSubmit: boolean;
        canRecall: boolean;
        canConfirmReceipt: boolean;
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

interface DraftEditorLine {
    localId: string;
    sourceType: SourceType;
    sourceId: string;
    displayName: string;
    unit: string | null;
    requestedQty: string;
    lineStatus: LineStatus;
    suggestedQty: number | null;
    suggestionBasis: string | null;
    suggestionReportMonth: string | null;
    companyResponseReason: string | null;
    masterDrug: MasterDrugOption | null;
    companyDrug: CompanyDrugOption | null;
}

interface ReceiptDraftLine {
    shipmentLineId: string;
    displayName: string;
    unit: string | null;
    shippedQty: number;
    receivedQty: string;
    differenceReason: string;
}

const NONE_VALUE = "__none__";

const ORDER_STATUS_META: Record<
    OrderStatus,
    { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }
> = {
    DRAFT: { label: "Nháp", variant: "secondary" },
    SUBMITTED: { label: "Đã gửi", variant: "default" },
    REJECTED: { label: "Bị từ chối", variant: "destructive" },
    READY_FOR_SHIPMENT: { label: "Sẵn sàng giao", variant: "outline", className: "border-emerald-300 text-emerald-700" },
    IN_DELIVERY: { label: "Đang giao", variant: "outline", className: "border-blue-300 text-blue-700" },
    COMPLETED: { label: "Hoàn tất", variant: "outline", className: "border-emerald-300 text-emerald-700" },
};

const LINE_STATUS_META: Record<
    LineStatus,
    { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }
> = {
    PENDING: { label: "Chờ công ty phản hồi", variant: "secondary" },
    PENDING_CATALOG_CONFIRMATION: {
        label: "Chờ xác nhận danh mục",
        variant: "outline",
        className: "border-amber-300 text-amber-700",
    },
    CONFIRMED: { label: "Nhận đủ", variant: "outline", className: "border-emerald-300 text-emerald-700" },
    PARTIAL: { label: "Nhận một phần", variant: "outline", className: "border-blue-300 text-blue-700" },
    REJECTED: { label: "Từ chối", variant: "destructive" },
    COMPLETED: { label: "Hoàn tất", variant: "outline", className: "border-emerald-300 text-emerald-700" },
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

function buildEditorLines(order: OrderDetail): DraftEditorLine[] {
    return order.lines.map((line) => ({
        localId: line.id,
        sourceType: line.sourceType,
        sourceId:
            line.sourceType === "MASTER_DRUG"
                ? line.masterDrug?.id || line.masterDrugId || ""
                : line.companyDrug?.id || line.companyDrugId || "",
        displayName: line.displayName,
        unit: line.unit,
        requestedQty: String(line.requestedQty),
        lineStatus: line.lineStatus,
        suggestedQty: line.suggestedQty,
        suggestionBasis: line.suggestionBasis,
        suggestionReportMonth: line.suggestionReportMonth,
        companyResponseReason: line.companyResponseReason,
        masterDrug: line.masterDrug,
        companyDrug: line.companyDrug,
    }));
}

function buildCatalogLineStatus(
    sourceType: SourceType,
    masterDrugId: string | null,
    companyDrugs: CompanyDrugOption[]
): LineStatus {
    if (sourceType === "COMPANY_DRUG") {
        return "PENDING";
    }

    if (!masterDrugId) {
        return "PENDING_CATALOG_CONFIRMATION";
    }

    return companyDrugs.some((drug) => drug.masterDrugId === masterDrugId)
        ? "PENDING"
        : "PENDING_CATALOG_CONFIRMATION";
}

function buildReceiptDraftLines(order: OrderDetail, shipmentId: string): ReceiptDraftLine[] {
    const shipment = order.shipments.find((item) => item.id === shipmentId);
    if (!shipment) {
        return [];
    }

    return shipment.lines.map((line) => ({
        shipmentLineId: line.id,
        displayName: line.displayName,
        unit: line.unit,
        shippedQty: line.shippedQty,
        receivedQty: String(line.shippedQty),
        differenceReason: "",
    }));
}

export default function FacilityDrugOrdersPage() {
    const [orders, setOrders] = useState<OrderSummary[]>([]);
    const [companies, setCompanies] = useState<CompanyOption[]>([]);
    const [reportMonths, setReportMonths] = useState<ReportMonthOption[]>([]);
    const [defaultBaseReportMonth, setDefaultBaseReportMonth] = useState<string | null>(null);
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
    const [editorLines, setEditorLines] = useState<DraftEditorLine[]>([]);
    const [editorNote, setEditorNote] = useState("");
    const [editorBaseReportMonth, setEditorBaseReportMonth] = useState(NONE_VALUE);
    const [isDirty, setIsDirty] = useState(false);

    const [isListLoading, setIsListLoading] = useState(true);
    const [isDetailLoading, setIsDetailLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isRecalling, setIsRecalling] = useState(false);
    const [isConfirmingReceipt, setIsConfirmingReceipt] = useState(false);

    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [createCompanyId, setCreateCompanyId] = useState("");
    const [createBaseReportMonth, setCreateBaseReportMonth] = useState(NONE_VALUE);
    const [createNote, setCreateNote] = useState("");
    const [selectedReceiptShipmentId, setSelectedReceiptShipmentId] = useState("");
    const [receiptLines, setReceiptLines] = useState<ReceiptDraftLine[]>([]);
    const [receiptNote, setReceiptNote] = useState("");

    const [masterDrugSearch, setMasterDrugSearch] = useState("");
    const [masterDrugResults, setMasterDrugResults] = useState<MasterDrugOption[]>([]);
    const [isMasterDrugLoading, setIsMasterDrugLoading] = useState(false);
    const [companyDrugSearch, setCompanyDrugSearch] = useState("");

    const canEdit = selectedOrder?.permissions.canEdit ?? false;
    const canSubmitCurrent = canEdit && editorLines.length > 0;
    const selectedCompanyDrugs = selectedOrder?.options.companyDrugs || [];
    const pendingReceiptShipments =
        selectedOrder?.shipments.filter((shipment) => shipment.receipts.length === 0) || [];
    const filteredCompanyDrugs = selectedCompanyDrugs.filter((drug) => {
        const search = companyDrugSearch.trim().toLowerCase();
        if (!search) {
            return true;
        }

        return [
            drug.companyDrugCode,
            drug.companyDrugName,
            drug.activeIngredient,
            drug.masterDrug?.tenThuoc,
            drug.masterDrug?.maChung,
        ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(search));
    });

    const applyOrderDetail = (order: OrderDetail) => {
        setSelectedOrder(order);
        setSelectedOrderId(order.id);
        setEditorLines(buildEditorLines(order));
        setEditorNote(order.note || "");
        setEditorBaseReportMonth(order.baseReportMonth || NONE_VALUE);
        setIsDirty(false);
    };

    const refreshOrders = useCallback(async (preferredOrderId?: string | null) => {
        setIsListLoading(true);
        try {
            const res = await fetch("/api/facility/dutru-dat-hang");
            const payload = await res.json();

            if (!res.ok) {
                throw new Error(payload.message || "Không thể tải danh sách đơn");
            }

            setOrders(payload.orders || []);
            setCompanies(payload.options?.companies || []);
            setReportMonths(payload.options?.reportMonths || []);
            setDefaultBaseReportMonth(payload.options?.defaultBaseReportMonth || null);

            setCreateCompanyId((current) => current || payload.options?.companies?.[0]?.id || "");
            setCreateBaseReportMonth((current) =>
                current === NONE_VALUE && payload.options?.defaultBaseReportMonth
                    ? payload.options.defaultBaseReportMonth
                    : current
            );

            let nextSelectedOrderId: string | null = preferredOrderId ?? null;
            setSelectedOrderId((currentSelectedOrderId) => {
                nextSelectedOrderId =
                    preferredOrderId ??
                    (currentSelectedOrderId &&
                    payload.orders.some((order: OrderSummary) => order.id === currentSelectedOrderId)
                        ? currentSelectedOrderId
                        : payload.orders[0]?.id || null);

                return nextSelectedOrderId;
            });

            if (!nextSelectedOrderId) {
                setSelectedOrder(null);
                setEditorLines([]);
                setEditorNote("");
                setEditorBaseReportMonth(NONE_VALUE);
                setIsDirty(false);
            }
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Không thể tải danh sách đơn");
        } finally {
            setIsListLoading(false);
        }
    }, []);

    const loadOrderDetail = useCallback(async (orderId: string) => {
        setIsDetailLoading(true);
        try {
            const res = await fetch(`/api/facility/dutru-dat-hang/${orderId}`);
            const payload = await res.json();

            if (!res.ok) {
                throw new Error(payload.message || "Không thể tải chi tiết đơn");
            }

            applyOrderDetail(payload.order);
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
            return;
        }

        if (selectedOrder?.id === selectedOrderId) {
            return;
        }

        void loadOrderDetail(selectedOrderId);
    }, [selectedOrderId, selectedOrder?.id, loadOrderDetail]);

    useEffect(() => {
        if (!canEdit) {
            setMasterDrugResults([]);
            return;
        }

        const controller = new AbortController();
        const timer = window.setTimeout(async () => {
            setIsMasterDrugLoading(true);
            try {
                const params = new URLSearchParams({
                    limit: "10",
                });

                if (masterDrugSearch.trim()) {
                    params.set("search", masterDrugSearch.trim());
                }

                const res = await fetch(`/api/admin/master-drugs?${params.toString()}`, {
                    signal: controller.signal,
                });
                const payload = await res.json();

                if (!res.ok) {
                    throw new Error(payload.message || "Không thể tải danh mục thuốc");
                }

                setMasterDrugResults(payload.data || []);
            } catch (error) {
                if ((error as Error).name === "AbortError") {
                    return;
                }

                console.error(error);
            } finally {
                setIsMasterDrugLoading(false);
            }
        }, 300);

        return () => {
            controller.abort();
            window.clearTimeout(timer);
        };
    }, [masterDrugSearch, canEdit]);

    const confirmDiscardChanges = () => {
        if (!isDirty) {
            return true;
        }

        return window.confirm("Bạn có thay đổi chưa lưu. Bỏ qua thay đổi và chuyển sang đơn khác?");
    };

    const selectOrder = (orderId: string) => {
        if (orderId === selectedOrderId) {
            return;
        }

        if (!confirmDiscardChanges()) {
            return;
        }

        setSelectedOrder(null);
        setSelectedOrderId(orderId);
    };

    const addMasterDrugLine = (drug: MasterDrugOption) => {
        if (!canEdit || !selectedOrder) {
            return;
        }

        const duplicate = editorLines.some(
            (line) => line.sourceType === "MASTER_DRUG" && line.sourceId === drug.id
        );
        if (duplicate) {
            toast.error("Thuốc này đã có trong đơn nháp");
            return;
        }

        setEditorLines((current) => [
            ...current,
            {
                localId: `master-${drug.id}`,
                sourceType: "MASTER_DRUG",
                sourceId: drug.id,
                displayName: drug.tenThuoc,
                unit: drug.donViTinh,
                requestedQty: "1",
                lineStatus: buildCatalogLineStatus(
                    "MASTER_DRUG",
                    drug.id,
                    selectedOrder.options.companyDrugs
                ),
                suggestedQty: null,
                suggestionBasis: "Lưu nháp để hệ thống tính và làm mới gợi ý từ XNT.",
                suggestionReportMonth: null,
                companyResponseReason: null,
                masterDrug: drug,
                companyDrug: null,
            },
        ]);
        setIsDirty(true);
    };

    const addCompanyDrugLine = (drug: CompanyDrugOption) => {
        if (!canEdit) {
            return;
        }

        const duplicate = editorLines.some(
            (line) => line.sourceType === "COMPANY_DRUG" && line.sourceId === drug.id
        );
        if (duplicate) {
            toast.error("Thuốc công ty này đã có trong đơn nháp");
            return;
        }

        setEditorLines((current) => [
            ...current,
            {
                localId: `company-${drug.id}`,
                sourceType: "COMPANY_DRUG",
                sourceId: drug.id,
                displayName: drug.companyDrugName,
                unit: drug.unit,
                requestedQty: "1",
                lineStatus: "PENDING",
                suggestedQty: null,
                suggestionBasis: drug.masterDrugId
                    ? "Lưu nháp để hệ thống tính và làm mới gợi ý từ XNT."
                    : "Thuốc công ty này chưa liên kết danh mục dùng chung nên không có gợi ý từ XNT.",
                suggestionReportMonth: null,
                companyResponseReason: null,
                masterDrug: drug.masterDrug,
                companyDrug: drug,
            },
        ]);
        setIsDirty(true);
    };

    const updateLineQty = (localId: string, requestedQty: string) => {
        setEditorLines((current) =>
            current.map((line) =>
                line.localId === localId
                    ? {
                          ...line,
                          requestedQty,
                      }
                    : line
            )
        );
        setIsDirty(true);
    };

    const removeLine = (localId: string) => {
        setEditorLines((current) => current.filter((line) => line.localId !== localId));
        setIsDirty(true);
    };

    const buildDraftPayload = () => ({
        baseReportMonth:
            editorBaseReportMonth === NONE_VALUE ? null : editorBaseReportMonth,
        note: editorNote.trim() || null,
        lines: editorLines.map((line) => ({
            sourceType: line.sourceType,
            sourceId: line.sourceId,
            requestedQty: line.requestedQty,
        })),
    });

    const saveDraft = async () => {
        if (!selectedOrder) {
            return null;
        }

        setIsSaving(true);
        try {
            const res = await fetch(`/api/facility/dutru-dat-hang/${selectedOrder.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(buildDraftPayload()),
            });
            const payload = await res.json();

            if (!res.ok) {
                throw new Error(payload.message || "Không thể lưu nháp");
            }

            applyOrderDetail(payload.order);
            await refreshOrders(payload.order.id);
            toast.success("Đã lưu nháp đơn đặt hàng");
            return payload.order as OrderDetail;
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Không thể lưu nháp");
            return null;
        } finally {
            setIsSaving(false);
        }
    };

    const handleSubmit = async () => {
        if (!selectedOrder) {
            return;
        }

        let latestOrder = selectedOrder;
        if (isDirty) {
            const savedOrder = await saveDraft();
            if (!savedOrder) {
                return;
            }
            latestOrder = savedOrder;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch(
                `/api/facility/dutru-dat-hang/${latestOrder.id}/submit`,
                { method: "POST" }
            );
            const payload = await res.json();

            if (!res.ok) {
                throw new Error(payload.message || "Không thể gửi đơn");
            }

            applyOrderDetail(payload.order);
            await refreshOrders(payload.order.id);
            toast.success("Đã gửi đơn sang công ty");
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Không thể gửi đơn");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRecall = async () => {
        if (!selectedOrder) {
            return;
        }

        if (!window.confirm("Thu hồi đơn này và chuyển về trạng thái nháp?")) {
            return;
        }

        setIsRecalling(true);
        try {
            const res = await fetch(
                `/api/facility/dutru-dat-hang/${selectedOrder.id}/recall`,
                { method: "POST" }
            );
            const payload = await res.json();

            if (!res.ok) {
                throw new Error(payload.message || "Không thể thu hồi đơn");
            }

            applyOrderDetail(payload.order);
            await refreshOrders(payload.order.id);
            toast.success("Đã thu hồi đơn về trạng thái nháp");
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Không thể thu hồi đơn");
        } finally {
            setIsRecalling(false);
        }
    };

    const handleCreateDraft = async () => {
        if (!createCompanyId) {
            toast.error("Vui lòng chọn công ty cung ứng");
            return;
        }

        setIsCreating(true);
        try {
            const res = await fetch("/api/facility/dutru-dat-hang", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    companyId: createCompanyId,
                    baseReportMonth:
                        createBaseReportMonth === NONE_VALUE ? null : createBaseReportMonth,
                    note: createNote.trim() || null,
                }),
            });
            const payload = await res.json();

            if (!res.ok) {
                throw new Error(payload.message || "Không thể tạo đơn nháp");
            }

            applyOrderDetail(payload.order);
            await refreshOrders(payload.order.id);
            setIsCreateDialogOpen(false);
            setCreateNote("");
            setCreateBaseReportMonth(defaultBaseReportMonth || NONE_VALUE);
            toast.success("Đã tạo đơn nháp mới");
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Không thể tạo đơn nháp");
        } finally {
            setIsCreating(false);
        }
    };

    const openReceiptDialog = () => {
        if (!selectedOrder || pendingReceiptShipments.length === 0) {
            return;
        }

        const firstShipmentId = pendingReceiptShipments[0].id;
        setSelectedReceiptShipmentId(firstShipmentId);
        setReceiptLines(buildReceiptDraftLines(selectedOrder, firstShipmentId));
        setReceiptNote("");
        setIsReceiptDialogOpen(true);
    };

    const handleReceiptShipmentChange = (shipmentId: string) => {
        setSelectedReceiptShipmentId(shipmentId);
        if (!selectedOrder) {
            setReceiptLines([]);
            return;
        }

        setReceiptLines(buildReceiptDraftLines(selectedOrder, shipmentId));
    };

    const handleConfirmReceipt = async () => {
        if (!selectedOrder || !selectedReceiptShipmentId) {
            return;
        }

        setIsConfirmingReceipt(true);
        try {
            const res = await fetch(
                `/api/facility/dutru-dat-hang/${selectedOrder.id}/receipts`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        shipmentId: selectedReceiptShipmentId,
                        note: receiptNote.trim() || null,
                        lines: receiptLines.map((line) => ({
                            shipmentLineId: line.shipmentLineId,
                            receivedQty: line.receivedQty,
                            differenceReason: line.differenceReason,
                        })),
                    }),
                }
            );
            const payload = await res.json();

            if (!res.ok) {
                throw new Error(payload.message || "Không thể xác nhận thực nhận");
            }

            applyOrderDetail(payload.order);
            await refreshOrders(payload.order.id);
            setIsReceiptDialogOpen(false);
            toast.success(
                payload.order.status === "COMPLETED"
                    ? "Đã xác nhận thực nhận và hoàn tất đơn"
                    : "Đã xác nhận thực nhận cho đợt giao"
            );
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Không thể xác nhận thực nhận");
        } finally {
            setIsConfirmingReceipt(false);
        }
    };

    const selectedSummary = orders.find((order) => order.id === selectedOrderId) || null;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800">Dự trù đặt hàng</h2>
                    <p className="mt-1 text-gray-500">
                        Lập đơn nháp theo công ty, dùng dữ liệu Xuất-Nhập-Tồn để tham khảo số lượng và gửi đơn trực tiếp từ phần mềm.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button
                        variant="outline"
                        onClick={() => void refreshOrders(selectedOrderId)}
                        disabled={isListLoading}
                    >
                        <RefreshCcw className="h-4 w-4" />
                        Làm mới
                    </Button>
                    <Button
                        onClick={() => {
                            if (!confirmDiscardChanges()) {
                                return;
                            }

                            setCreateCompanyId(companies[0]?.id || "");
                            setCreateBaseReportMonth(defaultBaseReportMonth || NONE_VALUE);
                            setCreateNote("");
                            setIsCreateDialogOpen(true);
                        }}
                        disabled={companies.length === 0}
                    >
                        <Plus className="h-4 w-4" />
                        Tạo nháp mới
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
                <Card className="border-slate-200">
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2">
                            <ClipboardList className="h-5 w-5 text-blue-600" />
                            Danh sách đơn
                        </CardTitle>
                        <CardDescription>
                            {orders.length > 0
                                ? `${orders.length} đơn đã tạo`
                                : "Chưa có đơn nào. Hãy tạo nháp đầu tiên."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {isListLoading ? (
                            <div className="flex items-center gap-2 rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Đang tải danh sách đơn...
                            </div>
                        ) : orders.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                                Chưa có đơn nào cho cơ sở này.
                            </div>
                        ) : (
                            orders.map((order) => {
                                const meta = ORDER_STATUS_META[order.status];
                                const isActive = order.id === selectedOrderId;

                                return (
                                    <button
                                        key={order.id}
                                        type="button"
                                        onClick={() => selectOrder(order.id)}
                                        className={`w-full rounded-xl border p-4 text-left transition ${
                                            isActive
                                                ? "border-blue-500 bg-blue-50 shadow-sm"
                                                : "border-slate-200 bg-white hover:border-slate-300"
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="font-semibold text-slate-900">{order.orderNo}</p>
                                                <p className="mt-1 truncate text-sm text-slate-600">
                                                    {order.company.name}
                                                </p>
                                            </div>
                                            <Badge variant={meta.variant} className={meta.className}>
                                                {meta.label}
                                            </Badge>
                                        </div>
                                        <div className="mt-3 grid gap-1 text-xs text-slate-500">
                                            <p>{order.lineCount} dòng thuốc</p>
                                            <p>Tổng số lượng: {formatQuantity(order.totalRequestedQty)}</p>
                                            <p>Cập nhật: {formatDateTime(order.updatedAt)}</p>
                                            {order.pendingCatalogCount > 0 && (
                                                <p className="font-medium text-amber-700">
                                                    {order.pendingCatalogCount} dòng chờ công ty xác nhận danh mục
                                                </p>
                                            )}
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card className="border-slate-200">
                        <CardHeader className="pb-4">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div>
                                    <CardTitle>Chi tiết đơn</CardTitle>
                                    <CardDescription>
                                        {selectedSummary
                                            ? `Đang xem ${selectedSummary.orderNo}`
                                            : "Chọn một đơn ở bên trái để xem hoặc chỉnh sửa"}
                                    </CardDescription>
                                </div>
                                {selectedOrder && (
                                    <div className="flex flex-wrap gap-2">
                                        {canEdit && (
                                            <Button
                                                variant="outline"
                                                onClick={() => void saveDraft()}
                                                disabled={isSaving || isSubmitting}
                                            >
                                                {isSaving ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Save className="h-4 w-4" />
                                                )}
                                                Lưu nháp
                                            </Button>
                                        )}
                                        {canEdit && (
                                            <Button
                                                onClick={() => void handleSubmit()}
                                                disabled={isSaving || isSubmitting || !canSubmitCurrent}
                                            >
                                                {isSubmitting ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Send className="h-4 w-4" />
                                                )}
                                                Gửi công ty
                                            </Button>
                                        )}
                                        {selectedOrder.permissions.canRecall && (
                                            <Button
                                                variant="outline"
                                                onClick={() => void handleRecall()}
                                                disabled={isRecalling}
                                            >
                                                {isRecalling ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Undo2 className="h-4 w-4" />
                                                )}
                                                Thu hồi đơn
                                            </Button>
                                        )}
                                        {selectedOrder.permissions.canConfirmReceipt && (
                                            <Button
                                                variant="secondary"
                                                onClick={openReceiptDialog}
                                                disabled={pendingReceiptShipments.length === 0}
                                            >
                                                <CheckCircle className="h-4 w-4" />
                                                Xác nhận thực nhận
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {!selectedOrderId ? (
                                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                                    Chưa có đơn nào được chọn.
                                </div>
                            ) : isDetailLoading || !selectedOrder ? (
                                <div className="flex items-center gap-2 rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Đang tải chi tiết đơn...
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                            <p className="text-xs uppercase tracking-wide text-slate-500">Số đơn</p>
                                            <p className="mt-2 font-semibold text-slate-900">{selectedOrder.orderNo}</p>
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
                                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                            <p className="text-xs uppercase tracking-wide text-slate-500">Ngày gửi</p>
                                            <p className="mt-2 font-semibold text-slate-900">
                                                {formatDateTime(selectedOrder.submittedAt)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
                                        <div className="space-y-2">
                                            <Label>Tháng gốc XNT</Label>
                                            <Select
                                                value={editorBaseReportMonth}
                                                onValueChange={(value) => {
                                                    setEditorBaseReportMonth(value);
                                                    setIsDirty(true);
                                                }}
                                                disabled={!canEdit}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Không chọn" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value={NONE_VALUE}>Không chọn</SelectItem>
                                                    {reportMonths.map((month) => (
                                                        <SelectItem key={month.value} value={month.value}>
                                                            {month.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <p className="text-xs text-slate-500">
                                                Hệ thống dùng dữ liệu XNT đến tháng này để gợi ý số lượng.
                                            </p>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Ghi chú cơ sở</Label>
                                            <Textarea
                                                value={editorNote}
                                                onChange={(event) => {
                                                    setEditorNote(event.target.value);
                                                    setIsDirty(true);
                                                }}
                                                disabled={!canEdit}
                                                placeholder="Ghi chú nội bộ hoặc lưu ý khi gửi công ty"
                                            />
                                        </div>
                                    </div>

                                    {canEdit && (
                                        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                                            Gợi ý số lượng từ XNT sẽ được làm mới mỗi lần lưu nháp. Thuốc công ty chưa liên kết danh mục dùng chung sẽ không có gợi ý.
                                        </div>
                                    )}

                                    {canEdit && (
                                        <div className="grid gap-6 xl:grid-cols-2">
                                            <Card className="border-slate-200">
                                                <CardHeader className="pb-4">
                                                    <CardTitle className="flex items-center gap-2 text-base">
                                                        <PackageSearch className="h-4 w-4 text-blue-600" />
                                                        Thêm từ danh mục dùng chung
                                                    </CardTitle>
                                                    <CardDescription>
                                                        Chọn thuốc hệ thống. Nếu công ty chưa khai báo cung ứng, dòng sẽ chờ xác nhận danh mục.
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardContent className="space-y-3">
                                                    <div className="relative">
                                                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                        <Input
                                                            value={masterDrugSearch}
                                                            onChange={(event) => setMasterDrugSearch(event.target.value)}
                                                            placeholder="Tìm theo tên thuốc, mã chung, hoạt chất, số đăng ký"
                                                            className="pl-9"
                                                        />
                                                    </div>
                                                    <div className="max-h-72 space-y-2 overflow-auto">
                                                        {isMasterDrugLoading ? (
                                                            <div className="flex items-center gap-2 rounded-lg border border-dashed border-slate-200 p-3 text-sm text-slate-500">
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                                Đang tải danh mục thuốc...
                                                            </div>
                                                        ) : masterDrugResults.length === 0 ? (
                                                            <div className="rounded-lg border border-dashed border-slate-200 p-3 text-sm text-slate-500">
                                                                Không tìm thấy thuốc phù hợp.
                                                            </div>
                                                        ) : (
                                                            masterDrugResults.map((drug) => (
                                                                <div
                                                                    key={drug.id}
                                                                    className="rounded-lg border border-slate-200 p-3"
                                                                >
                                                                    <div className="flex items-start justify-between gap-3">
                                                                        <div className="min-w-0">
                                                                            <p className="font-medium text-slate-900">{drug.tenThuoc}</p>
                                                                            <p className="text-xs text-slate-500">
                                                                                {drug.maChung}
                                                                                {drug.hoatChat ? ` • ${drug.hoatChat}` : ""}
                                                                                {drug.hamLuong ? ` • ${drug.hamLuong}` : ""}
                                                                            </p>
                                                                        </div>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            onClick={() => addMasterDrugLine(drug)}
                                                                        >
                                                                            <Plus className="h-4 w-4" />
                                                                            Thêm
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            <Card className="border-slate-200">
                                                <CardHeader className="pb-4">
                                                    <CardTitle className="flex items-center gap-2 text-base">
                                                        <Building2 className="h-4 w-4 text-emerald-600" />
                                                        Thêm từ danh mục công ty
                                                    </CardTitle>
                                                    <CardDescription>
                                                        Danh mục riêng do công ty này khai báo trong module dự trù đặt hàng.
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardContent className="space-y-3">
                                                    <div className="relative">
                                                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                        <Input
                                                            value={companyDrugSearch}
                                                            onChange={(event) => setCompanyDrugSearch(event.target.value)}
                                                            placeholder="Tìm theo mã công ty, tên thuốc công ty, hoạt chất"
                                                            className="pl-9"
                                                        />
                                                    </div>
                                                    <div className="max-h-72 space-y-2 overflow-auto">
                                                        {filteredCompanyDrugs.length === 0 ? (
                                                            <div className="rounded-lg border border-dashed border-slate-200 p-3 text-sm text-slate-500">
                                                                Công ty này chưa có thuốc phù hợp trong danh mục riêng.
                                                            </div>
                                                        ) : (
                                                            filteredCompanyDrugs.slice(0, 20).map((drug) => (
                                                                <div
                                                                    key={drug.id}
                                                                    className="rounded-lg border border-slate-200 p-3"
                                                                >
                                                                    <div className="flex items-start justify-between gap-3">
                                                                        <div className="min-w-0">
                                                                            <p className="font-medium text-slate-900">{drug.companyDrugName}</p>
                                                                            <p className="text-xs text-slate-500">
                                                                                {drug.companyDrugCode}
                                                                                {drug.activeIngredient ? ` • ${drug.activeIngredient}` : ""}
                                                                            </p>
                                                                            {drug.masterDrug && (
                                                                                <p className="mt-1 text-xs text-emerald-700">
                                                                                    Liên kết danh mục chung: {drug.masterDrug.tenThuoc}
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            onClick={() => addCompanyDrugLine(drug)}
                                                                        >
                                                                            <Plus className="h-4 w-4" />
                                                                            Thêm
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    )}

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <h3 className="font-semibold text-slate-900">Dòng thuốc trong đơn</h3>
                                                <p className="text-sm text-slate-500">
                                                    {editorLines.length > 0
                                                        ? `${editorLines.length} dòng đang có trong đơn`
                                                        : "Chưa có dòng thuốc nào trong đơn"}
                                                </p>
                                            </div>
                                        </div>

                                        {editorLines.length === 0 ? (
                                            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                                                Thêm thuốc từ danh mục dùng chung hoặc danh mục công ty để bắt đầu lập nháp.
                                            </div>
                                        ) : (
                                            <div className="overflow-hidden rounded-xl border border-slate-200">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow className="bg-slate-50">
                                                            <TableHead className="w-[28%]">Thuốc</TableHead>
                                                            <TableHead className="w-[14%]">Nguồn</TableHead>
                                                            <TableHead className="w-[10%]">Đơn vị</TableHead>
                                                            <TableHead className="w-[12%]">Yêu cầu</TableHead>
                                                            <TableHead className="w-[12%]">Gợi ý</TableHead>
                                                            <TableHead className="w-[16%]">Trạng thái</TableHead>
                                                            <TableHead className="w-[8%] text-right">Thao tác</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {editorLines.map((line) => {
                                                            const lineStatus = LINE_STATUS_META[line.lineStatus];

                                                            return (
                                                                <TableRow key={line.localId}>
                                                                    <TableCell className="align-top">
                                                                        <div className="space-y-1">
                                                                            <p className="font-medium text-slate-900">{line.displayName}</p>
                                                                            <p className="text-xs text-slate-500">
                                                                                {line.sourceType === "MASTER_DRUG"
                                                                                    ? line.masterDrug?.maChung || "Danh mục dùng chung"
                                                                                    : line.companyDrug?.companyDrugCode || "Danh mục công ty"}
                                                                            </p>
                                                                            {line.suggestionBasis && (
                                                                                <p className="text-xs text-slate-500">
                                                                                    {line.suggestionBasis}
                                                                                </p>
                                                                            )}
                                                                            {line.companyResponseReason && (
                                                                                <p className="text-xs text-rose-700">
                                                                                    Lý do công ty: {line.companyResponseReason}
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell className="align-top">
                                                                        <Badge variant="outline">
                                                                            {line.sourceType === "MASTER_DRUG"
                                                                                ? "Danh mục chung"
                                                                                : "Danh mục công ty"}
                                                                        </Badge>
                                                                    </TableCell>
                                                                    <TableCell className="align-top text-slate-600">
                                                                        {line.unit || "—"}
                                                                    </TableCell>
                                                                    <TableCell className="align-top">
                                                                        {canEdit ? (
                                                                            <Input
                                                                                type="number"
                                                                                min="0"
                                                                                step="0.01"
                                                                                value={line.requestedQty}
                                                                                onChange={(event) =>
                                                                                    updateLineQty(
                                                                                        line.localId,
                                                                                        event.target.value
                                                                                    )
                                                                                }
                                                                                className="w-28"
                                                                            />
                                                                        ) : (
                                                                            <span className="font-medium text-slate-900">
                                                                                {formatQuantity(Number(line.requestedQty))}
                                                                            </span>
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell className="align-top">
                                                                        <div className="space-y-1">
                                                                            <p className="font-medium text-slate-900">
                                                                                {formatQuantity(line.suggestedQty)}
                                                                            </p>
                                                                            <p className="text-xs text-slate-500">
                                                                                {line.suggestionReportMonth || "Chưa tính"}
                                                                            </p>
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell className="align-top">
                                                                        <Badge
                                                                            variant={lineStatus.variant}
                                                                            className={lineStatus.className}
                                                                        >
                                                                            {lineStatus.label}
                                                                        </Badge>
                                                                    </TableCell>
                                                                    <TableCell className="align-top text-right">
                                                                        {canEdit ? (
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="sm"
                                                                                onClick={() => removeLine(line.localId)}
                                                                            >
                                                                                Xóa
                                                                            </Button>
                                                                        ) : (
                                                                            <span className="text-xs text-slate-400">—</span>
                                                                        )}
                                                                    </TableCell>
                                                                </TableRow>
                                                            );
                                                        })}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        )}
                                    </div>

                                    {!canEdit && (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <h3 className="font-semibold text-slate-900">Lịch sử giao và nhận</h3>
                                                    <p className="text-sm text-slate-500">
                                                        Theo dõi từng đợt giao do công ty tạo và phần cơ sở đã xác nhận thực nhận.
                                                    </p>
                                                </div>
                                                {selectedOrder.permissions.canConfirmReceipt && (
                                                    <Button
                                                        variant="secondary"
                                                        onClick={openReceiptDialog}
                                                        disabled={pendingReceiptShipments.length === 0}
                                                    >
                                                        <CheckCircle className="h-4 w-4" />
                                                        Xác nhận thực nhận
                                                    </Button>
                                                )}
                                            </div>

                                            {selectedOrder.shipments.length === 0 ? (
                                                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                                                    Chưa có đợt giao nào cho đơn này.
                                                </div>
                                            ) : (
                                                <div className="space-y-4">
                                                    {selectedOrder.shipments.map((shipment) => (
                                                        <Card key={shipment.id} className="border-slate-200 shadow-none">
                                                            <CardHeader className="pb-3">
                                                                <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                                                                    <div>
                                                                        <CardTitle className="flex items-center gap-2 text-base">
                                                                            <Truck className="h-4 w-4 text-blue-600" />
                                                                            Đợt giao #{shipment.shipmentNo}
                                                                        </CardTitle>
                                                                        <CardDescription>
                                                                            Giao lúc: {formatDateTime(shipment.shippedAt)}
                                                                        </CardDescription>
                                                                    </div>
                                                                    <Badge
                                                                        variant="outline"
                                                                        className={
                                                                            shipment.status === "RECEIVED"
                                                                                ? "border-emerald-300 text-emerald-700"
                                                                                : shipment.status === "PARTIALLY_RECEIVED"
                                                                                    ? "border-amber-300 text-amber-700"
                                                                                    : "border-blue-300 text-blue-700"
                                                                        }
                                                                    >
                                                                        {shipment.status === "RECEIVED"
                                                                            ? "Đã nhận"
                                                                            : shipment.status === "PARTIALLY_RECEIVED"
                                                                                ? "Nhận một phần"
                                                                                : "Đã tạo"}
                                                                    </Badge>
                                                                </div>
                                                            </CardHeader>
                                                            <CardContent className="space-y-3">
                                                                {shipment.companyNote && (
                                                                    <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                                                                        Ghi chú công ty: {shipment.companyNote}
                                                                    </div>
                                                                )}

                                                                <div className="overflow-hidden rounded-xl border border-slate-200">
                                                                    <Table>
                                                                        <TableHeader>
                                                                            <TableRow className="bg-slate-50">
                                                                                <TableHead>Thuốc</TableHead>
                                                                                <TableHead className="text-right">Giao</TableHead>
                                                                                <TableHead className="text-right">Thực nhận</TableHead>
                                                                                <TableHead>Lý do giao thiếu</TableHead>
                                                                            </TableRow>
                                                                        </TableHeader>
                                                                        <TableBody>
                                                                            {shipment.lines.map((line) => (
                                                                                <TableRow key={line.id}>
                                                                                    <TableCell>
                                                                                        <p className="font-medium text-slate-900">
                                                                                            {line.displayName}
                                                                                        </p>
                                                                                        <p className="text-xs text-slate-500">
                                                                                            Đơn vị: {line.unit || "—"}
                                                                                        </p>
                                                                                    </TableCell>
                                                                                    <TableCell className="text-right font-medium text-slate-900">
                                                                                        {formatQuantity(line.shippedQty)}
                                                                                    </TableCell>
                                                                                    <TableCell className="text-right font-medium text-slate-900">
                                                                                        {formatQuantity(line.receivedQty)}
                                                                                    </TableCell>
                                                                                    <TableCell className="text-sm text-slate-600">
                                                                                        {line.reason || "—"}
                                                                                    </TableCell>
                                                                                </TableRow>
                                                                            ))}
                                                                        </TableBody>
                                                                    </Table>
                                                                </div>

                                                                {shipment.receipts.length > 0 ? (
                                                                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                                                                        {shipment.receipts.map((receipt) => (
                                                                            <div key={receipt.id} className="space-y-1">
                                                                                <p>
                                                                                    Xác nhận lúc: {formatDateTime(receipt.confirmedAt)}
                                                                                </p>
                                                                                <p>Ghi chú: {receipt.note || "Không có"}</p>
                                                                                {receipt.lines
                                                                                    .filter((line) => line.differenceReason)
                                                                                    .map((line) => (
                                                                                        <p
                                                                                            key={line.shipmentLineId}
                                                                                            className="text-xs"
                                                                                        >
                                                                                            Lý do chênh lệch: {line.differenceReason}
                                                                                        </p>
                                                                                    ))}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                                                                        Đợt giao này đang chờ cơ sở xác nhận thực nhận.
                                                                    </div>
                                                                )}
                                                            </CardContent>
                                                        </Card>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Dialog open={isReceiptDialogOpen} onOpenChange={setIsReceiptDialogOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
                    <DialogHeader>
                        <DialogTitle>Xác nhận thực nhận</DialogTitle>
                        <DialogDescription>
                            Chọn đợt giao cần xác nhận và nhập số lượng thực tế cơ sở đã nhận ở từng dòng.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Đợt giao</Label>
                            <Select
                                value={selectedReceiptShipmentId}
                                onValueChange={handleReceiptShipmentChange}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Chọn đợt giao" />
                                </SelectTrigger>
                                <SelectContent>
                                    {pendingReceiptShipments.map((shipment) => (
                                        <SelectItem key={shipment.id} value={shipment.id}>
                                            Đợt giao #{shipment.shipmentNo} - {formatDateTime(shipment.shippedAt)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Ghi chú xác nhận</Label>
                            <Textarea
                                value={receiptNote}
                                onChange={(event) => setReceiptNote(event.target.value)}
                                placeholder="Ghi chú chung cho lần xác nhận này"
                            />
                        </div>

                        <div className="space-y-3">
                            {receiptLines.map((line) => (
                                <div key={line.shipmentLineId} className="rounded-xl border border-slate-200 p-4">
                                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px_1fr]">
                                        <div>
                                            <p className="font-medium text-slate-900">{line.displayName}</p>
                                            <p className="mt-1 text-sm text-slate-500">
                                                Công ty giao: {formatQuantity(line.shippedQty)} {line.unit || ""}
                                            </p>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Thực nhận</Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={line.receivedQty}
                                                onChange={(event) => {
                                                    const nextValue = event.target.value;
                                                    setReceiptLines((current) =>
                                                        current.map((currentLine) =>
                                                            currentLine.shipmentLineId === line.shipmentLineId
                                                                ? { ...currentLine, receivedQty: nextValue }
                                                                : currentLine
                                                        )
                                                    );
                                                }}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Lý do chênh lệch nếu có</Label>
                                            <Input
                                                value={line.differenceReason}
                                                onChange={(event) => {
                                                    const nextValue = event.target.value;
                                                    setReceiptLines((current) =>
                                                        current.map((currentLine) =>
                                                            currentLine.shipmentLineId === line.shipmentLineId
                                                                ? { ...currentLine, differenceReason: nextValue }
                                                                : currentLine
                                                        )
                                                    );
                                                }}
                                                placeholder="Bắt buộc nếu thực nhận khác số lượng giao"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsReceiptDialogOpen(false)}
                            disabled={isConfirmingReceipt}
                        >
                            Đóng
                        </Button>
                        <Button onClick={() => void handleConfirmReceipt()} disabled={isConfirmingReceipt}>
                            {isConfirmingReceipt ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <CheckCircle className="h-4 w-4" />
                            )}
                            Xác nhận thực nhận
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Tạo đơn nháp mới</DialogTitle>
                        <DialogDescription>
                            Mỗi đơn chỉ thuộc một công ty. Sau khi tạo, anh/chị có thể thêm thuốc từ danh mục chung hoặc danh mục riêng của công ty.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Công ty cung ứng</Label>
                            <Select value={createCompanyId} onValueChange={setCreateCompanyId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Chọn công ty" />
                                </SelectTrigger>
                                <SelectContent>
                                    {companies.map((company) => (
                                        <SelectItem key={company.id} value={company.id}>
                                            {company.name} ({company.code})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Tháng gốc XNT</Label>
                            <Select
                                value={createBaseReportMonth}
                                onValueChange={setCreateBaseReportMonth}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Không chọn" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={NONE_VALUE}>Không chọn</SelectItem>
                                    {reportMonths.map((month) => (
                                        <SelectItem key={month.value} value={month.value}>
                                            {month.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Ghi chú ban đầu</Label>
                            <Textarea
                                value={createNote}
                                onChange={(event) => setCreateNote(event.target.value)}
                                placeholder="Ghi chú nội bộ nếu cần"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsCreateDialogOpen(false)}
                            disabled={isCreating}
                        >
                            Hủy
                        </Button>
                        <Button onClick={() => void handleCreateDraft()} disabled={isCreating}>
                            {isCreating ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Plus className="h-4 w-4" />
                            )}
                            Tạo nháp
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
