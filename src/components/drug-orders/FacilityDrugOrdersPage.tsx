"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
    ArrowLeft,
    CheckCircle,
    ClipboardList,
    FileText,
    Info,
    ListChecks,
    Loader2,
    Plus,
    Printer,
    RefreshCcw,
    Save,
    Send,
    Sparkles,
    Trash2,
    Truck,
    Undo2,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
import DrugOrderLineMobileCard from "@/components/drug-orders/DrugOrderLineMobileCard";
import DrugOrderMobileActionBar, {
    type DrugOrderMobileAction,
} from "@/components/drug-orders/DrugOrderMobileActionBar";
import DrugOrderMobileSectionTabs, {
    type DrugOrderMobileSectionTab,
} from "@/components/drug-orders/DrugOrderMobileSectionTabs";
import DrugOrderShipmentMobileCard from "@/components/drug-orders/DrugOrderShipmentMobileCard";
import DrugOrderSummaryCard from "@/components/drug-orders/DrugOrderSummaryCard";
import FacilityDrugOrderCatalogDialog from "@/components/drug-orders/FacilityDrugOrderCatalogDialog";
import DrugOrderQrCode from "@/components/drug-orders/DrugOrderQrCode";
import { formatShipmentDateRangeLabel } from "@/lib/drug-orders/shipment-date-range";

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
type FacilityMobileSection = "overview" | "lines" | "shipments" | "notes";
type SuggestionStatus =
    | "OFFICIAL"
    | "PROVISIONAL"
    | "UNLINKED"
    | "INSUFFICIENT_DATA";
type SuggestionConfidence = "HIGH" | "LOW" | "NONE";

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
        shippedFromDate: string | null;
        shippedToDate: string | null;
        shipmentStatus: ShipmentStatus;
        shippedQty: number;
        reason: string | null;
        receivedQty: number;
    }>;
}

interface OrderDetail {
    id: string;
    orderNo: string;
    lookupUrl: string;
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
        shippedFromDate: string | null;
        shippedToDate: string | null;
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

interface DrugOrderLineSuggestion {
    recommendedQty: number | null;
    xntBaseQty: number | null;
    incomingAcceptedQty: number;
    avgMonthlyExport: number | null;
    latestEndingStock: number | null;
    monthsOfCover: number | null;
    confidence: SuggestionConfidence;
    status: SuggestionStatus;
    statusLabel: string;
    suggestionReportMonth: string | null;
    suggestionRuleVersion: string;
    basisLines: string[];
    suggestionBasis: string;
    isSuppressedDuplicateMasterDrug?: boolean;
}

interface DrugOrderCatalogSuggestion extends DrugOrderLineSuggestion {
    sourceType: "COMPANY_DRUG";
    sourceId: string;
    companyDrugId: string;
    companyDrugCode: string;
    companyDrugName: string;
    activeIngredient: string | null;
    quyCach: string | null;
    unit: string | null;
    masterDrugId: string | null;
    masterDrug: MasterDrugOption | null;
}

interface DrugOrderSuggestionsResponse {
    lineSuggestions: Record<string, DrugOrderLineSuggestion>;
    catalogSuggestions: DrugOrderCatalogSuggestion[];
    meta: {
        effectiveReportMonth: string | null;
        coverageTargetMonths: number;
        includeAllCatalog: boolean;
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

type CatalogDialogMode = "create" | "append";

const NONE_VALUE = "__none__";
const CONFIRM_RECEIPT_BUTTON_CLASS =
    "bg-emerald-600 text-white shadow-sm shadow-emerald-200 hover:bg-emerald-700 focus-visible:ring-emerald-500/40";

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
    CONFIRMED: {
        label: "Công ty xác nhận đủ",
        variant: "outline",
        className: "border-emerald-300 text-emerald-700",
    },
    PARTIAL: {
        label: "Công ty xác nhận một phần",
        variant: "outline",
        className: "border-blue-300 text-blue-700",
    },
    REJECTED: { label: "Từ chối", variant: "destructive" },
    COMPLETED: { label: "Hoàn tất", variant: "outline", className: "border-emerald-300 text-emerald-700" },
};

const SUGGESTION_STATUS_META: Record<
    SuggestionStatus,
    { variant: "default" | "secondary" | "destructive" | "outline"; className?: string }
> = {
    OFFICIAL: {
        variant: "outline",
        className: "border-emerald-300 text-emerald-700",
    },
    PROVISIONAL: {
        variant: "outline",
        className: "border-amber-300 text-amber-700",
    },
    UNLINKED: {
        variant: "outline",
        className: "border-amber-300 text-amber-700",
    },
    INSUFFICIENT_DATA: {
        variant: "outline",
        className: "border-slate-300 text-slate-700",
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

function buildFallbackSuggestionBasis(drug: CompanyDrugOption) {
    if (!drug.masterDrugId) {
        return "Thuốc công ty này chưa liên kết thuốc chuẩn nên chưa có gợi ý.";
    }

    return "Lưu nháp để hệ thống tính và làm mới gợi ý hoàn chỉnh.";
}

function buildCompanyDrugOptionFromSuggestion(
    suggestion: DrugOrderCatalogSuggestion
): CompanyDrugOption {
    return {
        id: suggestion.companyDrugId,
        companyDrugCode: suggestion.companyDrugCode,
        companyDrugName: suggestion.companyDrugName,
        activeIngredient: suggestion.activeIngredient,
        quyCach: suggestion.quyCach,
        unit: suggestion.unit,
        masterDrugId: suggestion.masterDrugId,
        masterDrug: suggestion.masterDrug,
    };
}

function resolveCompanyDrugMasterDrugId(
    drug:
        | Pick<CompanyDrugOption, "masterDrugId" | "masterDrug">
        | Pick<DrugOrderCatalogSuggestion, "masterDrugId" | "masterDrug">
        | null
) {
    if (!drug) {
        return null;
    }

    return drug.masterDrug?.id || drug.masterDrugId || null;
}

function resolveEditorLineMasterDrugId(line: DraftEditorLine) {
    if (line.sourceType === "MASTER_DRUG") {
        return line.masterDrug?.id || line.sourceId || null;
    }

    return resolveCompanyDrugMasterDrugId(line.companyDrug) || line.masterDrug?.id || null;
}

function buildDuplicateMasterLineIdSet(lines: DraftEditorLine[]) {
    const seenMasterDrugIds = new Set<string>();
    const duplicateLineIds = new Set<string>();

    lines.forEach((line) => {
        const masterDrugId = resolveEditorLineMasterDrugId(line);
        if (!masterDrugId) {
            return;
        }

        if (seenMasterDrugIds.has(masterDrugId)) {
            duplicateLineIds.add(line.localId);
            return;
        }

        seenMasterDrugIds.add(masterDrugId);
    });

    return duplicateLineIds;
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

function isValidRequestedQty(value: string) {
    if (value.trim() === "") {
        return false;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0;
}

function parseReceiptQty(value: string) {
    if (value.trim() === "") {
        return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
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
    const [mobileSection, setMobileSection] =
        useState<FacilityMobileSection>("overview");

    const [isListLoading, setIsListLoading] = useState(true);
    const [isDetailLoading, setIsDetailLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isRecalling, setIsRecalling] = useState(false);
    const [isConfirmingReceipt, setIsConfirmingReceipt] = useState(false);

    const [isCatalogDialogOpen, setIsCatalogDialogOpen] = useState(false);
    const [catalogMode, setCatalogMode] = useState<CatalogDialogMode>("create");
    const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false);
    const [isCatalogLoading, setIsCatalogLoading] = useState(false);
    const [isDraftSuggestionsLoading, setIsDraftSuggestionsLoading] = useState(false);
    const [isCatalogSuggestionsLoading, setIsCatalogSuggestionsLoading] = useState(false);
    const [isCatalogSubmitting, setIsCatalogSubmitting] = useState(false);
    const [catalogCompanyId, setCatalogCompanyId] = useState("");
    const [catalogBaseReportMonth, setCatalogBaseReportMonth] = useState(NONE_VALUE);
    const [catalogNote, setCatalogNote] = useState("");
    const [catalogItems, setCatalogItems] = useState<CompanyDrugOption[]>([]);
    const [catalogSuggestions, setCatalogSuggestions] = useState<
        DrugOrderCatalogSuggestion[]
    >([]);
    const [catalogSearch, setCatalogSearch] = useState("");
    const [catalogLinkedOnly, setCatalogLinkedOnly] = useState(false);
    const [includeAllCatalogSuggestions, setIncludeAllCatalogSuggestions] =
        useState(false);
    const [selectedCatalogDrugIds, setSelectedCatalogDrugIds] = useState<string[]>([]);
    const [selectedReceiptShipmentId, setSelectedReceiptShipmentId] = useState("");
    const [receiptLines, setReceiptLines] = useState<ReceiptDraftLine[]>([]);
    const [receiptNote, setReceiptNote] = useState("");
    const [highlightedLineIds, setHighlightedLineIds] = useState<string[]>([]);
    const [pendingFocusLineId, setPendingFocusLineId] = useState<string | null>(null);
    const [lineSuggestionMap, setLineSuggestionMap] = useState<
        Record<string, DrugOrderLineSuggestion>
    >({});
    const [draftSuggestionsError, setDraftSuggestionsError] = useState<string | null>(
        null
    );
    const [catalogSuggestionsError, setCatalogSuggestionsError] = useState<
        string | null
    >(null);
    const [draftSuggestionEffectiveMonth, setDraftSuggestionEffectiveMonth] =
        useState<string | null>(null);
    const [catalogSuggestionEffectiveMonth, setCatalogSuggestionEffectiveMonth] =
        useState<string | null>(null);
    const [suggestedCatalogCount, setSuggestedCatalogCount] = useState(0);

    const catalogRequestIdRef = useRef(0);
    const draftSuggestionRequestIdRef = useRef(0);
    const catalogSuggestionRequestIdRef = useRef(0);
    const lineInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

    const canEdit = selectedOrder?.permissions.canEdit ?? false;
    const invalidDraftLineCount = editorLines.filter(
        (line) => !isValidRequestedQty(line.requestedQty)
    ).length;
    const canSubmitCurrent =
        canEdit && editorLines.length > 0 && invalidDraftLineCount === 0;
    const pendingReceiptShipments =
        selectedOrder?.shipments.filter((shipment) => shipment.receipts.length === 0) || [];
    const selectedReceiptShipment =
        pendingReceiptShipments.find(
            (shipment) => shipment.id === selectedReceiptShipmentId
        ) || null;
    const enteredQtyLineCount = editorLines.filter((line) =>
        isValidRequestedQty(line.requestedQty)
    ).length;
    const pendingCatalogLineCount = editorLines.filter(
        (line) => line.lineStatus === "PENDING_CATALOG_CONFIRMATION"
    ).length;
    const duplicateMasterLineIds = buildDuplicateMasterLineIdSet(editorLines);
    const existingCompanyDrugIds = editorLines
        .filter((line) => line.sourceType === "COMPANY_DRUG")
        .map((line) => line.sourceId);
    const existingMasterDrugIds = editorLines
        .map((line) => resolveEditorLineMasterDrugId(line))
        .filter((value): value is string => Boolean(value));
    const blockedCatalogDrugIds = catalogMode === "append" ? existingCompanyDrugIds : [];
    const blockedCatalogMasterDrugIds =
        catalogMode === "append" ? existingMasterDrugIds : [];
    const blockedCatalogMasterDrugIdSet = new Set(blockedCatalogMasterDrugIds);
    const catalogSuggestionMap = new Map(
        catalogSuggestions.map((item) => [item.companyDrugId, item] as const)
    );
    const availableCatalogDrugMap = new Map(
        catalogItems.map((drug) => [drug.id, drug] as const)
    );
    catalogSuggestions.forEach((suggestion) => {
        if (!availableCatalogDrugMap.has(suggestion.companyDrugId)) {
            availableCatalogDrugMap.set(
                suggestion.companyDrugId,
                buildCompanyDrugOptionFromSuggestion(suggestion)
            );
        }
    });
    const selectedCatalogMasterDrugIdSet = new Set(
        selectedCatalogDrugIds
            .map((drugId) =>
                resolveCompanyDrugMasterDrugId(availableCatalogDrugMap.get(drugId) || null)
            )
            .filter((value): value is string => Boolean(value))
    );
    const lineWithSuggestionCount = editorLines.filter((line) => {
        if (duplicateMasterLineIds.has(line.localId)) {
            return false;
        }

        const recommendedQty =
            lineSuggestionMap[line.localId]?.recommendedQty ?? line.suggestedQty;
        return recommendedQty !== null;
    }).length;
    const hasApplicableSuggestion = editorLines.some((line) => {
        if (duplicateMasterLineIds.has(line.localId)) {
            return false;
        }

        const recommendedQty =
            lineSuggestionMap[line.localId]?.recommendedQty ?? line.suggestedQty;
        return recommendedQty !== null && recommendedQty > 0;
    });
    const receiptLineValidations = receiptLines.map((line) => {
        const parsedReceivedQty = parseReceiptQty(line.receivedQty);
        const invalidReceivedQty = parsedReceivedQty === null;
        const exceedsShippedQty =
            parsedReceivedQty !== null && parsedReceivedQty > line.shippedQty;
        const missingDifferenceReason =
            parsedReceivedQty !== null &&
            parsedReceivedQty !== line.shippedQty &&
            line.differenceReason.trim().length === 0;

        return {
            shipmentLineId: line.shipmentLineId,
            parsedReceivedQty,
            invalidReceivedQty,
            exceedsShippedQty,
            missingDifferenceReason,
        };
    });
    const receiptValidationMap = new Map(
        receiptLineValidations.map((line) => [line.shipmentLineId, line] as const)
    );
    const hasInvalidReceiptLine = receiptLineValidations.some(
        (line) =>
            line.invalidReceivedQty ||
            line.exceedsShippedQty ||
            line.missingDifferenceReason
    );

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

            setCatalogCompanyId((current) => current || payload.options?.companies?.[0]?.id || "");
            setCatalogBaseReportMonth((current) =>
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
        if (!pendingFocusLineId) {
            return;
        }

        const frameId = window.requestAnimationFrame(() => {
            const target = lineInputRefs.current[pendingFocusLineId];
            if (!target) {
                return;
            }

            target.focus();
            target.scrollIntoView({ behavior: "smooth", block: "center" });
        });

        return () => window.cancelAnimationFrame(frameId);
    }, [pendingFocusLineId, editorLines.length]);

    useEffect(() => {
        if (highlightedLineIds.length === 0) {
            return;
        }

        const timer = window.setTimeout(() => {
            setHighlightedLineIds([]);
        }, 2500);

        return () => window.clearTimeout(timer);
    }, [highlightedLineIds]);

    const loadCatalogItems = useCallback(async (companyId: string) => {
        if (!companyId) {
            setCatalogItems([]);
            setIsCatalogLoading(false);
            return;
        }

        const requestId = ++catalogRequestIdRef.current;
        setIsCatalogLoading(true);
        try {
            const params = new URLSearchParams({ companyId });
            const res = await fetch(
                `/api/facility/dutru-dat-hang/company-drugs?${params.toString()}`
            );
            const payload = await res.json();

            if (!res.ok) {
                throw new Error(payload.message || "Không thể tải danh mục công ty");
            }

            if (requestId !== catalogRequestIdRef.current) {
                return;
            }

            setCatalogItems(payload.items || []);
        } catch (error) {
            if (requestId !== catalogRequestIdRef.current) {
                return;
            }

            console.error(error);
            setCatalogItems([]);
            toast.error(
                error instanceof Error ? error.message : "Không thể tải danh mục công ty"
            );
        } finally {
            if (requestId === catalogRequestIdRef.current) {
                setIsCatalogLoading(false);
            }
        }
    }, []);

    const fetchSuggestionPayload = useCallback(
        async (params: {
            companyId: string;
            baseReportMonth: string;
            orderId?: string | null;
            includeAllCatalog?: boolean;
        }) => {
            const searchParams = new URLSearchParams({ companyId: params.companyId });
            if (params.baseReportMonth !== NONE_VALUE) {
                searchParams.set("baseReportMonth", params.baseReportMonth);
            }
            if (params.orderId) {
                searchParams.set("orderId", params.orderId);
            }
            if (params.includeAllCatalog) {
                searchParams.set("includeAllCatalog", "1");
            }

            const res = await fetch(
                `/api/facility/dutru-dat-hang/suggestions?${searchParams.toString()}`
            );
            const payload = await res.json();

            if (!res.ok) {
                throw new Error(payload.message || "Không thể tải gợi ý");
            }

            return payload as DrugOrderSuggestionsResponse;
        },
        []
    );

    const loadDraftSuggestions = useCallback(
        async (params: {
            orderId: string;
            companyId: string;
            baseReportMonth: string;
        }) => {
            const requestId = ++draftSuggestionRequestIdRef.current;
            setIsDraftSuggestionsLoading(true);
            setDraftSuggestionsError(null);
            try {
                const payload = await fetchSuggestionPayload({
                    companyId: params.companyId,
                    baseReportMonth: params.baseReportMonth,
                    orderId: params.orderId,
                });

                if (requestId !== draftSuggestionRequestIdRef.current) {
                    return;
                }

                setLineSuggestionMap(payload.lineSuggestions || {});
                setSuggestedCatalogCount(payload.catalogSuggestions?.length || 0);
                setDraftSuggestionEffectiveMonth(
                    payload.meta?.effectiveReportMonth || null
                );
            } catch (error) {
                if (requestId !== draftSuggestionRequestIdRef.current) {
                    return;
                }

                console.error(error);
                setLineSuggestionMap({});
                setSuggestedCatalogCount(0);
                setDraftSuggestionEffectiveMonth(null);
                setDraftSuggestionsError(
                    error instanceof Error
                        ? error.message
                        : "Không thể tải gợi ý cho dự trù"
                );
            } finally {
                if (requestId === draftSuggestionRequestIdRef.current) {
                    setIsDraftSuggestionsLoading(false);
                }
            }
        },
        [fetchSuggestionPayload]
    );

    const loadCatalogSuggestions = useCallback(
        async (params: {
            companyId: string;
            baseReportMonth: string;
            orderId?: string | null;
            includeAllCatalog: boolean;
        }) => {
            const requestId = ++catalogSuggestionRequestIdRef.current;
            setIsCatalogSuggestionsLoading(true);
            setCatalogSuggestionsError(null);
            try {
                const payload = await fetchSuggestionPayload({
                    companyId: params.companyId,
                    baseReportMonth: params.baseReportMonth,
                    orderId: params.orderId,
                    includeAllCatalog: params.includeAllCatalog,
                });

                if (requestId !== catalogSuggestionRequestIdRef.current) {
                    return;
                }

                setCatalogSuggestions(payload.catalogSuggestions || []);
                setCatalogSuggestionEffectiveMonth(
                    payload.meta?.effectiveReportMonth || null
                );
            } catch (error) {
                if (requestId !== catalogSuggestionRequestIdRef.current) {
                    return;
                }

                console.error(error);
                setCatalogSuggestions([]);
                setCatalogSuggestionEffectiveMonth(null);
                setCatalogSuggestionsError(
                    error instanceof Error
                        ? error.message
                        : "Không thể tải gợi ý thuốc nên thêm"
                );
            } finally {
                if (requestId === catalogSuggestionRequestIdRef.current) {
                    setIsCatalogSuggestionsLoading(false);
                }
            }
        },
        [fetchSuggestionPayload]
    );

    useEffect(() => {
        if (!selectedOrder || !selectedOrder.permissions.canEdit) {
            setLineSuggestionMap({});
            setSuggestedCatalogCount(0);
            setDraftSuggestionsError(null);
            setDraftSuggestionEffectiveMonth(null);
            setIsDraftSuggestionsLoading(false);
            return;
        }

        void loadDraftSuggestions({
            orderId: selectedOrder.id,
            companyId: selectedOrder.companyId,
            baseReportMonth: editorBaseReportMonth,
        });
    }, [selectedOrder, editorBaseReportMonth, loadDraftSuggestions]);

    useEffect(() => {
        if (!isCatalogDialogOpen || !catalogCompanyId) {
            setCatalogSuggestions([]);
            setCatalogSuggestionsError(null);
            setCatalogSuggestionEffectiveMonth(null);
            setIsCatalogSuggestionsLoading(false);
            return;
        }

        void loadCatalogSuggestions({
            companyId: catalogCompanyId,
            baseReportMonth: catalogBaseReportMonth,
            orderId: catalogMode === "append" ? selectedOrder?.id || null : null,
            includeAllCatalog: includeAllCatalogSuggestions,
        });
    }, [
        isCatalogDialogOpen,
        catalogCompanyId,
        catalogBaseReportMonth,
        catalogMode,
        selectedOrder?.id,
        includeAllCatalogSuggestions,
        loadCatalogSuggestions,
    ]);

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
        setMobileSection("overview");
    };

    const showMobileOrderList = () => {
        if (!confirmDiscardChanges()) {
            return;
        }

        setSelectedOrder(null);
        setSelectedOrderId(null);
        setEditorLines([]);
        setEditorNote("");
        setEditorBaseReportMonth(NONE_VALUE);
        setIsDirty(false);
        setMobileSection("overview");
    };

    const openPrintOrder = () => {
        if (!selectedOrder) {
            return;
        }

        if (
            isDirty &&
            !window.confirm(
                "Đơn đang có thay đổi chưa lưu. Bản in sẽ dùng dữ liệu đã lưu gần nhất. Tiếp tục in?"
            )
        ) {
            return;
        }

        window.open(
            `/dashboard/facility/dutru-dat-hang/${selectedOrder.id}/print`,
            "_blank",
            "noopener,noreferrer"
        );
    };

    const clearCatalogSelection = () => {
        setSelectedCatalogDrugIds([]);
    };

    const resetCatalogDialogState = () => {
        setSelectedCatalogDrugIds([]);
        setCatalogSearch("");
        setCatalogLinkedOnly(false);
        setIncludeAllCatalogSuggestions(false);
        setCatalogSuggestions([]);
        setCatalogSuggestionsError(null);
        setCatalogSuggestionEffectiveMonth(null);
    };

    const handleCatalogDialogOpenChange = (open: boolean) => {
        if (isCatalogSubmitting) {
            return;
        }

        setIsCatalogDialogOpen(open);
        if (!open) {
            resetCatalogDialogState();
        }
    };

    const openCreateCatalogDialog = () => {
        if (!confirmDiscardChanges()) {
            return;
        }

        const nextCompanyId = companies[0]?.id || "";
        setCatalogMode("create");
        setCatalogCompanyId(nextCompanyId);
        setCatalogBaseReportMonth(defaultBaseReportMonth || NONE_VALUE);
        setCatalogNote("");
        resetCatalogDialogState();
        setCatalogItems([]);
        setIsCatalogDialogOpen(true);
        void loadCatalogItems(nextCompanyId);
    };

    const openAppendCatalogDialog = () => {
        if (!selectedOrder || !canEdit) {
            return;
        }

        setCatalogMode("append");
        setCatalogCompanyId(selectedOrder.companyId);
        setCatalogBaseReportMonth(editorBaseReportMonth);
        setCatalogNote(editorNote);
        resetCatalogDialogState();
        setCatalogItems([]);
        setIsCatalogDialogOpen(true);
        void loadCatalogItems(selectedOrder.companyId);
    };

    const handleCatalogCompanyChange = (companyId: string) => {
        setCatalogCompanyId(companyId);
        resetCatalogDialogState();
        setCatalogItems([]);
        void loadCatalogItems(companyId);
    };

    const toggleCatalogSelection = (drugId: string) => {
        if (blockedCatalogDrugIds.includes(drugId)) {
            return;
        }

        const selectedDrug = availableCatalogDrugMap.get(drugId) || null;
        const selectedMasterDrugId = resolveCompanyDrugMasterDrugId(selectedDrug);
        if (
            selectedMasterDrugId &&
            blockedCatalogMasterDrugIdSet.has(selectedMasterDrugId)
        ) {
            toast.error("Thuốc chuẩn này đã có trong dự trù hiện tại");
            return;
        }

        if (
            selectedMasterDrugId &&
            selectedCatalogMasterDrugIdSet.has(selectedMasterDrugId) &&
            !selectedCatalogDrugIds.includes(drugId)
        ) {
            toast.error("Chỉ được chọn một thuốc công ty cho mỗi thuốc chuẩn");
            return;
        }

        setSelectedCatalogDrugIds((current) =>
            current.includes(drugId)
                ? current.filter((id) => id !== drugId)
                : [...current, drugId]
        );
    };

    const setVisibleCatalogSelection = (visibleIds: string[], shouldSelect: boolean) => {
        setSelectedCatalogDrugIds((current) => {
            const currentSet = new Set(current);
            if (shouldSelect) {
                const selectedMasterDrugIds = new Set(
                    Array.from(currentSet)
                        .map((id) =>
                            resolveCompanyDrugMasterDrugId(
                                availableCatalogDrugMap.get(id) || null
                            )
                        )
                        .filter((value): value is string => Boolean(value))
                );

                visibleIds.forEach((id) => {
                    if (blockedCatalogDrugIds.includes(id)) {
                        return;
                    }

                    const drug = availableCatalogDrugMap.get(id) || null;
                    const masterDrugId = resolveCompanyDrugMasterDrugId(drug);
                    if (
                        masterDrugId &&
                        (blockedCatalogMasterDrugIdSet.has(masterDrugId) ||
                            selectedMasterDrugIds.has(masterDrugId))
                    ) {
                        return;
                    }

                    currentSet.add(id);
                    if (masterDrugId) {
                        selectedMasterDrugIds.add(masterDrugId);
                    }
                });
            } else {
                visibleIds.forEach((id) => currentSet.delete(id));
            }

            return Array.from(currentSet);
        });
    };

    const handleCatalogSubmit = async () => {
        const selectedDrugs = selectedCatalogDrugIds
            .map((drugId) => availableCatalogDrugMap.get(drugId) || null)
            .filter((drug): drug is CompanyDrugOption => Boolean(drug));
        if (selectedDrugs.length === 0) {
            toast.error("Không thể tải thông tin các thuốc đã chọn");
            return;
        }

        const selectedMasterDrugIds = new Set<string>();
        for (const drug of selectedDrugs) {
            const masterDrugId = resolveCompanyDrugMasterDrugId(drug);
            if (!masterDrugId) {
                continue;
            }

            if (selectedMasterDrugIds.has(masterDrugId)) {
                toast.error("Chỉ được chọn một thuốc công ty cho mỗi thuốc chuẩn");
                return;
            }

            if (blockedCatalogMasterDrugIdSet.has(masterDrugId)) {
                toast.error("Thuốc chuẩn này đã có trong dự trù hiện tại");
                return;
            }

            selectedMasterDrugIds.add(masterDrugId);
        }

        if (catalogMode === "create") {
            if (!catalogCompanyId) {
                toast.error("Vui lòng chọn công ty cung ứng");
                return;
            }

            setIsCatalogSubmitting(true);
            try {
                const res = await fetch("/api/facility/dutru-dat-hang", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        companyId: catalogCompanyId,
                        baseReportMonth:
                            catalogBaseReportMonth === NONE_VALUE
                                ? null
                                : catalogBaseReportMonth,
                        note: catalogNote.trim() || null,
                        lines: selectedDrugs.map((drug) => ({
                            sourceType: "COMPANY_DRUG",
                            sourceId: drug.id,
                            requestedQty: 0,
                        })),
                    }),
                });
                const payload = await res.json();

                if (!res.ok) {
                    throw new Error(payload.message || "Không thể thêm thuốc vào dự trù");
                }

                applyOrderDetail(payload.order);
                await refreshOrders(payload.order.id);
                setHighlightedLineIds(payload.order.lines.map((line: OrderLine) => line.id));
                setPendingFocusLineId(payload.order.lines[0]?.id || null);
                setIsCatalogDialogOpen(false);
                setCatalogNote("");
                setCatalogBaseReportMonth(defaultBaseReportMonth || NONE_VALUE);
                resetCatalogDialogState();
                toast.success(`Đã thêm ${selectedDrugs.length} thuốc vào dự trù`);
            } catch (error) {
                console.error(error);
                toast.error(
                    error instanceof Error
                        ? error.message
                        : "Không thể thêm thuốc vào dự trù"
                );
            } finally {
                setIsCatalogSubmitting(false);
            }
            return;
        }

        const existingIdSet = new Set(existingCompanyDrugIds);
        const drugsToAdd = selectedDrugs.filter((drug) => !existingIdSet.has(drug.id));
        if (drugsToAdd.length === 0) {
            toast.error("Các thuốc đã chọn đều đã có trong dự trù");
            return;
        }

        const nextLines: DraftEditorLine[] = drugsToAdd.map((drug) => {
            const suggestion = catalogSuggestionMap.get(drug.id) || null;

            return {
                localId: `company-${drug.id}`,
                sourceType: "COMPANY_DRUG",
                sourceId: drug.id,
                displayName: drug.companyDrugName,
                unit: drug.unit,
                requestedQty: "0",
                lineStatus: "PENDING",
                suggestedQty: suggestion?.recommendedQty ?? null,
                suggestionBasis:
                    suggestion?.suggestionBasis || buildFallbackSuggestionBasis(drug),
                suggestionReportMonth: suggestion?.suggestionReportMonth ?? null,
                companyResponseReason: null,
                masterDrug: drug.masterDrug,
                companyDrug: drug,
            };
        });

        setEditorLines((current) => [...current, ...nextLines]);
        setIsDirty(true);
        setHighlightedLineIds(nextLines.map((line) => line.localId));
        setPendingFocusLineId(nextLines[0]?.localId || null);
        setIsCatalogDialogOpen(false);
        resetCatalogDialogState();
        toast.success(`Đã thêm ${nextLines.length} thuốc vào dự trù`);
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

    const applySuggestedQty = (localId: string) => {
        const targetLine = editorLines.find((line) => line.localId === localId);
        if (!targetLine) {
            return;
        }

        if (duplicateMasterLineIds.has(localId)) {
            toast.error(
                "Thuốc chuẩn này đã có ở dòng khác. Hãy giữ một dòng để tránh nhân đôi gợi ý."
            );
            return;
        }

        const recommendedQty = targetLine
            ? lineSuggestionMap[targetLine.localId]?.recommendedQty ??
              targetLine.suggestedQty
            : null;
        if (recommendedQty === null || recommendedQty <= 0) {
            return;
        }

        setEditorLines((current) =>
            current.map((line) =>
                line.localId === localId
                    ? {
                          ...line,
                          requestedQty: String(
                              lineSuggestionMap[line.localId]?.recommendedQty ??
                                  line.suggestedQty
                          ),
                      }
                    : line
            )
        );
        setIsDirty(true);
    };

    const applyAllSuggestedQty = () => {
        if (!hasApplicableSuggestion) {
            return;
        }

        setEditorLines((current) =>
            current.map((line) =>
                !duplicateMasterLineIds.has(line.localId) &&
                (lineSuggestionMap[line.localId]?.recommendedQty ?? line.suggestedQty) !==
                    null &&
                (lineSuggestionMap[line.localId]?.recommendedQty ?? line.suggestedQty)! > 0
                    ? {
                          ...line,
                          requestedQty: String(
                              lineSuggestionMap[line.localId]?.recommendedQty ??
                                  line.suggestedQty
                          ),
                      }
                    : line
            )
        );
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

    const updateReceiptLine = (
        shipmentLineId: string,
        changes: Partial<Pick<ReceiptDraftLine, "receivedQty" | "differenceReason">>
    ) => {
        setReceiptLines((current) =>
            current.map((currentLine) =>
                currentLine.shipmentLineId === shipmentLineId
                    ? { ...currentLine, ...changes }
                    : currentLine
            )
        );
    };

    const handleConfirmReceipt = async () => {
        if (!selectedOrder || !selectedReceiptShipmentId) {
            return;
        }

        const validatedReceiptLines = receiptLines.map((line) => {
            const validation = receiptValidationMap.get(line.shipmentLineId);
            return {
                ...line,
                parsedReceivedQty: validation?.parsedReceivedQty ?? null,
                invalidReceivedQty: validation?.invalidReceivedQty ?? true,
                exceedsShippedQty: validation?.exceedsShippedQty ?? false,
                missingDifferenceReason: validation?.missingDifferenceReason ?? false,
            };
        });

        if (
            validatedReceiptLines.some(
                (line) =>
                    line.invalidReceivedQty ||
                    line.exceedsShippedQty ||
                    line.missingDifferenceReason ||
                    line.parsedReceivedQty === null
            )
        ) {
            toast.error("Vui lòng sửa các dòng thực nhận chưa hợp lệ trước khi xác nhận");
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
                        lines: validatedReceiptLines.map((line) => ({
                            shipmentLineId: line.shipmentLineId,
                            receivedQty: line.parsedReceivedQty,
                            differenceReason: line.differenceReason.trim() || null,
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

    const renderOrderStatusBadge = (status: OrderStatus) => {
        const meta = ORDER_STATUS_META[status];

        return (
            <Badge variant={meta.variant} className={meta.className}>
                {meta.label}
            </Badge>
        );
    };

    const renderLineStatusBadge = (status: LineStatus) => {
        const meta = LINE_STATUS_META[status];

        return (
            <Badge variant={meta.variant} className={meta.className}>
                {meta.label}
            </Badge>
        );
    };

    const renderShipmentStatusBadge = (status: ShipmentStatus) => {
        const statusConfig = {
            RECEIVED: {
                label: "Đã nhận",
                className: "border-emerald-300 text-emerald-700",
            },
            PARTIALLY_RECEIVED: {
                label: "Nhận một phần",
                className: "border-amber-300 text-amber-700",
            },
            CREATED: {
                label: "Đã tạo",
                className: "border-blue-300 text-blue-700",
            },
        }[status];

        return (
            <Badge variant="outline" className={statusConfig.className}>
                {statusConfig.label}
            </Badge>
        );
    };

    const mobileTabs: DrugOrderMobileSectionTab[] = [
        {
            value: "overview",
            label: "Tổng quan",
            icon: <Info className="size-4" />,
        },
        {
            value: "lines",
            label: "Thuốc",
            icon: <ListChecks className="size-4" />,
        },
        {
            value: "shipments",
            label: "Giao nhận",
            icon: <Truck className="size-4" />,
        },
        {
            value: "notes",
            label: "Ghi chú",
            icon: <FileText className="size-4" />,
        },
    ];

    const mobileActionHelperText =
        selectedOrder && canEdit && invalidDraftLineCount > 0
            ? invalidDraftLineCount === 1
                ? "Còn 1 dòng chưa nhập số lượng hợp lệ."
                : `Còn ${invalidDraftLineCount} dòng chưa nhập số lượng hợp lệ.`
            : selectedOrder && isDirty
                ? "Có thay đổi chưa lưu."
                : undefined;

    const mobileActionBarActions: DrugOrderMobileAction[] = [
        {
            id: "submit",
            label: "Gửi công ty",
            icon: <Send className="size-4" />,
            loading: isSubmitting,
            disabled: isSaving || isSubmitting || !canSubmitCurrent,
            hidden: !selectedOrder || !canEdit,
            onClick: () => void handleSubmit(),
        },
        {
            id: "save",
            label: "Lưu nháp",
            icon: <Save className="size-4" />,
            loading: isSaving,
            disabled: isSaving || isSubmitting,
            hidden: !selectedOrder || !canEdit,
            variant: "outline",
            onClick: () => void saveDraft(),
        },
        {
            id: "append-drugs",
            label: "Thêm thuốc",
            icon: <Plus className="size-4" />,
            hidden: !selectedOrder || !canEdit,
            variant: "outline",
            onClick: openAppendCatalogDialog,
        },
        {
            id: "confirm-receipt",
            label: "Xác nhận giao hàng",
            icon: <CheckCircle className="size-4" />,
            disabled: pendingReceiptShipments.length === 0,
            hidden: !selectedOrder?.permissions.canConfirmReceipt,
            className: CONFIRM_RECEIPT_BUTTON_CLASS,
            onClick: openReceiptDialog,
        },
        {
            id: "recall",
            label: "Thu hồi",
            icon: <Undo2 className="size-4" />,
            loading: isRecalling,
            disabled: isRecalling,
            hidden: !selectedOrder?.permissions.canRecall,
            variant: "outline",
            onClick: () => void handleRecall(),
        },
        {
            id: "print",
            label: "In đơn",
            icon: <Printer className="size-4" />,
            hidden: !selectedOrder,
            variant: "outline",
            onClick: openPrintOrder,
        },
    ];

    const renderMobileOrderList = () => (
        <div className="space-y-4 pb-6">
            <div className="space-y-3">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Dự trù đặt hàng</h2>
                    <p className="mt-1 text-sm text-gray-500">
                        Lập và theo dõi đơn dự trù theo từng công ty cung ứng.
                    </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <Button
                        variant="outline"
                        onClick={() => void refreshOrders(selectedOrderId)}
                        disabled={isListLoading}
                    >
                        {isListLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <RefreshCcw className="h-4 w-4" />
                        )}
                        Làm mới
                    </Button>
                    <Button onClick={openCreateCatalogDialog} disabled={companies.length === 0}>
                        <Plus className="h-4 w-4" />
                        Thêm dự trù
                    </Button>
                </div>
            </div>

            <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h3 className="font-semibold text-slate-900">Danh sách đơn</h3>
                        <p className="text-sm text-slate-500">
                            {orders.length > 0
                                ? `${orders.length} đơn đã tạo`
                                : "Chưa có đơn nào cho cơ sở này."}
                        </p>
                    </div>
                </div>

                {isListLoading ? (
                    <div className="flex items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Đang tải danh sách đơn...
                    </div>
                ) : orders.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-white p-5 text-sm text-slate-500">
                        Chưa có đơn nào. Hãy thêm dự trù đầu tiên.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {orders.map((order) => (
                            <DrugOrderSummaryCard
                                key={order.id}
                                title={order.orderNo}
                                subtitle={order.company.name}
                                description={order.company.code}
                                status={renderOrderStatusBadge(order.status)}
                                active={order.id === selectedOrderId}
                                onClick={() => selectOrder(order.id)}
                                metrics={[
                                    {
                                        label: "Dòng thuốc",
                                        value: order.lineCount,
                                    },
                                    {
                                        label: "Tổng SL",
                                        value: formatQuantity(order.totalRequestedQty),
                                    },
                                    {
                                        label: "Cập nhật",
                                        value: formatDateTime(order.updatedAt),
                                        tone: "muted",
                                    },
                                    {
                                        label: "Chờ danh mục",
                                        value: order.pendingCatalogCount,
                                        tone:
                                            order.pendingCatalogCount > 0
                                                ? "warning"
                                                : "muted",
                                    },
                                ]}
                                warnings={
                                    order.pendingCatalogCount > 0
                                        ? [
                                              `${order.pendingCatalogCount} dòng chờ công ty xác nhận danh mục.`,
                                          ]
                                        : []
                                }
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    const renderMobileOverviewSection = () => {
        if (!selectedOrder) {
            return null;
        }

        return (
            <div className="space-y-4">
                <DrugOrderSummaryCard
                    title="Tổng quan đơn"
                    subtitle={selectedOrder.company.name}
                    description={`Mã công ty: ${selectedOrder.company.code}`}
                    status={renderOrderStatusBadge(selectedOrder.status)}
                    metrics={[
                        {
                            label: "Tổng dòng",
                            value: editorLines.length,
                        },
                        {
                            label: "Đã nhập SL",
                            value: enteredQtyLineCount,
                        },
                        {
                            label: "Có gợi ý",
                            value: lineWithSuggestionCount,
                        },
                        {
                            label: "Nên thêm",
                            value: suggestedCatalogCount,
                        },
                    ]}
                    footer={`Cập nhật: ${formatDateTime(selectedOrder.updatedAt)}`}
                />

                <DrugOrderQrCode
                    lookupUrl={selectedOrder.lookupUrl}
                    orderNo={selectedOrder.orderNo}
                    size={128}
                />

                <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
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
                            Hệ thống dùng dữ liệu XNT đến tháng này để tính gợi ý 2 tháng phủ.
                        </p>
                    </div>

                    {canEdit ? (
                        <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                            <div className="space-y-1">
                                <p>
                                    Gợi ý được tính từ XNT phủ 2 tháng và trừ số lượng đã được duyệt nhưng cơ sở chưa nhận.
                                </p>
                                <p className="text-blue-700">
                                    {isDraftSuggestionsLoading
                                        ? "Đang làm mới gợi ý..."
                                        : `Tháng tham chiếu: ${draftSuggestionEffectiveMonth || "Chưa xác định"}`}
                                </p>
                            </div>
                        </div>
                    ) : null}

                    {canEdit && draftSuggestionsError ? (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                            Không tải được gợi ý mới. Bạn vẫn có thể thao tác thủ công hoặc dùng snapshot đang có nếu tồn tại.
                        </div>
                    ) : null}
                </div>
            </div>
        );
    };

    const renderMobileLinesSection = () => (
        <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h3 className="font-semibold text-slate-900">Dòng thuốc trong đơn</h3>
                    <p className="text-sm text-slate-500">
                        {editorLines.length > 0
                            ? `${editorLines.length} dòng đang có trong đơn`
                            : "Chưa có dòng thuốc nào trong đơn"}
                    </p>
                </div>
                {canEdit ? (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={applyAllSuggestedQty}
                        disabled={!hasApplicableSuggestion}
                    >
                        <Sparkles className="h-4 w-4" />
                        Dùng gợi ý
                    </Button>
                ) : null}
            </div>

            {canEdit && invalidDraftLineCount > 0 ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    {invalidDraftLineCount === 1
                        ? "Còn 1 dòng chưa nhập số lượng hợp lệ."
                        : `Còn ${invalidDraftLineCount} dòng chưa nhập số lượng hợp lệ.`}
                </div>
            ) : null}

            {canEdit && duplicateMasterLineIds.size > 0 ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    Có nhiều dòng đang trùng cùng một thuốc chuẩn. Hệ thống sẽ chặn áp gợi ý và chặn lưu nháp cho đến khi bạn giữ lại một dòng cho mỗi thuốc chuẩn.
                </div>
            ) : null}

            {editorLines.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                    Thêm thuốc từ danh mục công ty để bắt đầu lập nháp.
                </div>
            ) : (
                <div className="space-y-3">
                    {editorLines.map((line) => {
                        const companyDrugCode = line.companyDrug?.companyDrugCode || "—";
                        const linkedMasterDrug = line.masterDrug;
                        const invalidRequestedQty = !isValidRequestedQty(line.requestedQty);
                        const isHighlighted = highlightedLineIds.includes(line.localId);
                        const liveSuggestion = lineSuggestionMap[line.localId] || null;
                        const isDuplicateMasterLine = duplicateMasterLineIds.has(line.localId);
                        const duplicateSuggestionMessage =
                            liveSuggestion?.isSuppressedDuplicateMasterDrug ||
                            isDuplicateMasterLine
                                ? "Thuốc chuẩn này đã xuất hiện ở dòng khác nên hệ thống tắt gợi ý để tránh nhân đôi số lượng."
                                : null;
                        const resolvedSuggestedQty = duplicateSuggestionMessage
                            ? null
                            : liveSuggestion?.recommendedQty ?? line.suggestedQty;
                        const resolvedSuggestionReportMonth = duplicateSuggestionMessage
                            ? null
                            : liveSuggestion?.suggestionReportMonth ??
                              line.suggestionReportMonth;
                        const suggestionMeta = liveSuggestion
                            ? SUGGESTION_STATUS_META[liveSuggestion.status]
                            : null;
                        const validationMessages = [
                            invalidRequestedQty ? "Cần nhập số lượng > 0." : null,
                            duplicateSuggestionMessage,
                        ].filter((message): message is string => Boolean(message));

                        return (
                            <DrugOrderLineMobileCard
                                key={line.localId}
                                title={line.displayName}
                                subtitle={
                                    line.companyDrug?.activeIngredient ||
                                    line.companyResponseReason ||
                                    undefined
                                }
                                badges={
                                    <>
                                        {renderLineStatusBadge(line.lineStatus)}
                                        <Badge variant="outline">{companyDrugCode}</Badge>
                                    </>
                                }
                                highlighted={isHighlighted}
                                fields={[
                                    {
                                        label: "Thuốc chuẩn",
                                        value: linkedMasterDrug
                                            ? `${linkedMasterDrug.maChung} - ${linkedMasterDrug.tenThuoc}`
                                            : "Chưa liên kết",
                                        tone: linkedMasterDrug ? "default" : "warning",
                                    },
                                    {
                                        label: "Đơn vị",
                                        value: line.unit || "—",
                                        tone: line.unit ? "default" : "muted",
                                    },
                                    ...(canEdit
                                        ? []
                                        : [
                                              {
                                                  label: "SL yêu cầu",
                                                  value: formatQuantity(
                                                      Number(line.requestedQty)
                                                  ),
                                              },
                                          ]),
                                ]}
                                quantityInput={
                                    canEdit
                                        ? {
                                              label: "Số lượng yêu cầu",
                                              value: line.requestedQty,
                                              invalid: invalidRequestedQty,
                                              onChange: (value) => {
                                                  updateLineQty(line.localId, value);
                                                  if (pendingFocusLineId === line.localId) {
                                                      setPendingFocusLineId(null);
                                                  }
                                              },
                                          }
                                        : undefined
                                }
                                suggestion={
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-xs font-medium uppercase tracking-wide text-blue-700">
                                                Gợi ý
                                            </span>
                                            <span className="font-semibold text-blue-950">
                                                {formatQuantity(resolvedSuggestedQty)}
                                            </span>
                                        </div>
                                        {liveSuggestion ? (
                                            <div className="space-y-1 text-xs text-blue-900">
                                                <div className="flex flex-wrap gap-2">
                                                    <Badge
                                                        variant={suggestionMeta?.variant || "outline"}
                                                        className={suggestionMeta?.className}
                                                    >
                                                        {liveSuggestion.statusLabel}
                                                    </Badge>
                                                    {liveSuggestion.monthsOfCover !== null ? (
                                                        <span>
                                                            Độ phủ:{" "}
                                                            {formatQuantity(
                                                                liveSuggestion.monthsOfCover
                                                            )}{" "}
                                                            tháng
                                                        </span>
                                                    ) : null}
                                                </div>
                                                {liveSuggestion.xntBaseQty !== null ? (
                                                    <p>
                                                        Nền XNT:{" "}
                                                        {formatQuantity(
                                                            liveSuggestion.xntBaseQty
                                                        )}
                                                    </p>
                                                ) : null}
                                                <p>
                                                    Đang về:{" "}
                                                    {formatQuantity(
                                                        liveSuggestion.incomingAcceptedQty
                                                    )}
                                                </p>
                                                <p>
                                                    Tháng tham chiếu:{" "}
                                                    {liveSuggestion.suggestionReportMonth ||
                                                        draftSuggestionEffectiveMonth ||
                                                        "—"}
                                                </p>
                                                {(liveSuggestion.status === "UNLINKED" ||
                                                    liveSuggestion.status ===
                                                        "INSUFFICIENT_DATA") &&
                                                liveSuggestion.basisLines[0] ? (
                                                    <p>{liveSuggestion.basisLines[0]}</p>
                                                ) : null}
                                            </div>
                                        ) : (
                                            <div className="space-y-1 text-xs text-blue-900">
                                                <p>
                                                    Tháng tham chiếu:{" "}
                                                    {resolvedSuggestionReportMonth || "Chưa tính"}
                                                </p>
                                                {line.suggestionBasis ? (
                                                    <p>{line.suggestionBasis}</p>
                                                ) : null}
                                            </div>
                                        )}
                                    </div>
                                }
                                validationMessage={
                                    validationMessages.length > 0 ? (
                                        <div className="space-y-1">
                                            {validationMessages.map((message) => (
                                                <p key={message}>{message}</p>
                                            ))}
                                        </div>
                                    ) : null
                                }
                                actions={[
                                    {
                                        id: "apply-suggestion",
                                        label: "Dùng gợi ý",
                                        icon: <Sparkles className="size-4" />,
                                        hidden:
                                            !canEdit ||
                                            resolvedSuggestedQty === null ||
                                            resolvedSuggestedQty <= 0,
                                        onClick: () => applySuggestedQty(line.localId),
                                    },
                                    {
                                        id: "remove",
                                        label: "Xóa",
                                        icon: <Trash2 className="size-4" />,
                                        hidden: !canEdit,
                                        variant: "destructive",
                                        onClick: () => removeLine(line.localId),
                                    },
                                ]}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );

    const renderMobileShipmentsSection = () => {
        if (!selectedOrder) {
            return null;
        }

        return (
            <div className="space-y-4">
                <div>
                    <h3 className="font-semibold text-slate-900">Lịch sử giao và nhận</h3>
                    <p className="text-sm text-slate-500">
                        Theo dõi từng đợt giao do công ty tạo và phần cơ sở đã xác nhận thực nhận.
                    </p>
                </div>

                {selectedOrder.shipments.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                        Chưa có đợt giao nào cho đơn này.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {selectedOrder.shipments.map((shipment) => (
                            <DrugOrderShipmentMobileCard
                                key={shipment.id}
                                title={`Đợt giao #${shipment.shipmentNo}`}
                                subtitle={`Thời gian giao: ${formatShipmentDateRangeLabel({
                                    shippedFromDate: shipment.shippedFromDate,
                                    shippedToDate: shipment.shippedToDate,
                                    shippedAt: shipment.shippedAt,
                                })}`}
                                status={renderShipmentStatusBadge(shipment.status)}
                                note={
                                    shipment.companyNote
                                        ? `Ghi chú công ty: ${shipment.companyNote}`
                                        : undefined
                                }
                                lines={shipment.lines.map((line) => ({
                                    id: line.id,
                                    title: line.displayName,
                                    subtitle: `Đơn vị: ${line.unit || "—"}`,
                                    metrics: [
                                        {
                                            label: "Yêu cầu",
                                            value: formatQuantity(line.requestedQty),
                                        },
                                        {
                                            label: "Duyệt",
                                            value: formatQuantity(line.acceptedQty),
                                        },
                                        {
                                            label: "Giao",
                                            value: formatQuantity(line.shippedQty),
                                        },
                                        {
                                            label: "Thực nhận",
                                            value: formatQuantity(line.receivedQty),
                                        },
                                    ],
                                    reason: line.reason
                                        ? `Lý do giao thiếu: ${line.reason}`
                                        : undefined,
                                }))}
                                receipts={
                                    shipment.receipts.length > 0 ? (
                                        <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                                            {shipment.receipts.map((receipt) => (
                                                <div key={receipt.id} className="space-y-1">
                                                    <p>
                                                        Xác nhận lúc:{" "}
                                                        {formatDateTime(receipt.confirmedAt)}
                                                    </p>
                                                    <p>Ghi chú: {receipt.note || "Không có"}</p>
                                                    {receipt.lines
                                                        .filter((line) => line.differenceReason)
                                                        .map((line) => (
                                                            <p
                                                                key={line.shipmentLineId}
                                                                className="text-xs"
                                                            >
                                                                Lý do chênh lệch:{" "}
                                                                {line.differenceReason}
                                                            </p>
                                                        ))}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                                            Đợt giao này đang chờ cơ sở xác nhận thực nhận.
                                        </div>
                                    )
                                }
                            />
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const renderMobileNotesSection = () => (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
                <h3 className="font-semibold text-slate-900">Ghi chú cơ sở</h3>
                <p className="text-sm text-slate-500">
                    Ghi chú nội bộ hoặc lưu ý khi gửi công ty.
                </p>
            </div>
            <Textarea
                value={editorNote}
                onChange={(event) => {
                    setEditorNote(event.target.value);
                    setIsDirty(true);
                }}
                disabled={!canEdit}
                placeholder="Ghi chú nội bộ hoặc lưu ý khi gửi công ty"
                className="min-h-32"
            />
            {selectedOrder ? (
                <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                            Ngày tạo
                        </p>
                        <p className="mt-1 font-semibold text-slate-900">
                            {formatDateTime(selectedOrder.createdAt)}
                        </p>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                            Ngày gửi
                        </p>
                        <p className="mt-1 font-semibold text-slate-900">
                            {formatDateTime(selectedOrder.submittedAt)}
                        </p>
                    </div>
                </div>
            ) : null}
        </div>
    );

    const renderMobileSelectedSection = () => {
        if (mobileSection === "lines") {
            return renderMobileLinesSection();
        }

        if (mobileSection === "shipments") {
            return renderMobileShipmentsSection();
        }

        if (mobileSection === "notes") {
            return renderMobileNotesSection();
        }

        return renderMobileOverviewSection();
    };

    const renderMobileOrderDetail = () => {
        if (!selectedOrderId) {
            return renderMobileOrderList();
        }

        if (isDetailLoading || !selectedOrder) {
            return (
                <div className="space-y-4 pb-6">
                    <Button variant="ghost" size="sm" onClick={showMobileOrderList}>
                        <ArrowLeft className="h-4 w-4" />
                        Danh sách đơn
                    </Button>
                    <div className="flex items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Đang tải chi tiết đơn...
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-4 pb-32">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={showMobileOrderList}
                        className="-ml-2 mb-3"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Danh sách đơn
                    </Button>
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <h2 className="break-words text-xl font-bold text-slate-900">
                                {selectedOrder.orderNo}
                            </h2>
                            <p className="mt-1 text-sm text-slate-600">
                                {selectedOrder.company.name}
                            </p>
                            <p className="text-xs text-slate-500">
                                {selectedOrder.company.code}
                            </p>
                        </div>
                        <div className="shrink-0">
                            {renderOrderStatusBadge(selectedOrder.status)}
                        </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                        <div className="rounded-lg bg-slate-50 px-3 py-2">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                                Cập nhật
                            </p>
                            <p className="mt-1 font-semibold text-slate-900">
                                {formatDateTime(selectedOrder.updatedAt)}
                            </p>
                        </div>
                        <div className="rounded-lg bg-slate-50 px-3 py-2">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                                Ngày gửi
                            </p>
                            <p className="mt-1 font-semibold text-slate-900">
                                {formatDateTime(selectedOrder.submittedAt)}
                            </p>
                        </div>
                    </div>
                </div>

                <DrugOrderMobileSectionTabs
                    value={mobileSection}
                    tabs={mobileTabs}
                    onValueChange={(value) =>
                        setMobileSection(value as FacilityMobileSection)
                    }
                    sticky
                />

                {renderMobileSelectedSection()}

                <DrugOrderMobileActionBar
                    actions={mobileActionBarActions}
                    helperText={mobileActionHelperText}
                    maxVisibleActions={2}
                />
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="xl:hidden">{renderMobileOrderDetail()}</div>

            <div className="hidden space-y-6 xl:block">
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
                            onClick={openCreateCatalogDialog}
                            disabled={companies.length === 0}
                        >
                            <Plus className="h-4 w-4" />
                            Thêm dự trù
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
                                : "Chưa có đơn nào. Hãy thêm dự trù đầu tiên."}
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
                                        <Button
                                            variant="outline"
                                            onClick={openPrintOrder}
                                        >
                                            <Printer className="h-4 w-4" />
                                            In đơn
                                        </Button>
                                        {canEdit && (
                                            <Button
                                                variant="outline"
                                                onClick={openAppendCatalogDialog}
                                            >
                                                <Plus className="h-4 w-4" />
                                                Thêm thuốc
                                            </Button>
                                        )}
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
                                                onClick={openReceiptDialog}
                                                disabled={pendingReceiptShipments.length === 0}
                                                className={CONFIRM_RECEIPT_BUTTON_CLASS}
                                            >
                                                <CheckCircle className="h-4 w-4" />
                                                Xác nhận giao hàng
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
                                            <p className="text-xs uppercase tracking-wide text-slate-500">Mã đơn</p>
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

                                    <DrugOrderQrCode
                                        lookupUrl={selectedOrder.lookupUrl}
                                        orderNo={selectedOrder.orderNo}
                                    />

                                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                                        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                                            <p className="text-xs uppercase tracking-wide text-slate-500">
                                                Tổng số dòng
                                            </p>
                                            <p className="mt-2 text-lg font-semibold text-slate-900">
                                                {editorLines.length}
                                            </p>
                                        </div>
                                        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                                            <p className="text-xs uppercase tracking-wide text-slate-500">
                                                Đã nhập số lượng
                                            </p>
                                            <p className="mt-2 text-lg font-semibold text-slate-900">
                                                {enteredQtyLineCount}
                                            </p>
                                        </div>
                                        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                                            <p className="text-xs uppercase tracking-wide text-slate-500">
                                                Dòng có gợi ý
                                            </p>
                                            <p className="mt-2 text-lg font-semibold text-slate-900">
                                                {lineWithSuggestionCount}
                                            </p>
                                        </div>
                                        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                                            <p className="text-xs uppercase tracking-wide text-slate-500">
                                                Thuốc đề xuất nên thêm
                                            </p>
                                            <p className="mt-2 text-lg font-semibold text-slate-900">
                                                {suggestedCatalogCount}
                                            </p>
                                        </div>
                                        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                                            <p className="text-xs uppercase tracking-wide text-slate-500">
                                                Chờ xác nhận danh mục
                                            </p>
                                            <p className="mt-2 text-lg font-semibold text-slate-900">
                                                {pendingCatalogLineCount}
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
                                                Hệ thống dùng dữ liệu XNT đến tháng này để tính gợi ý 2 tháng phủ.
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
                                            <div className="flex flex-col gap-1 lg:flex-row lg:items-center lg:justify-between">
                                                <span>
                                                    Gợi ý được tính từ XNT phủ 2 tháng và trừ số lượng đã được duyệt nhưng cơ sở chưa nhận.
                                                </span>
                                                <span className="text-blue-700">
                                                    {isDraftSuggestionsLoading
                                                        ? "Đang làm mới gợi ý..."
                                                        : `Tháng tham chiếu: ${draftSuggestionEffectiveMonth || "Chưa xác định"}`}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {canEdit && draftSuggestionsError && (
                                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                                            Không tải được gợi ý mới. Bạn vẫn có thể thao tác thủ công hoặc dùng snapshot đang có nếu tồn tại.
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
                                            {canEdit && (
                                                <div className="flex flex-wrap gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={openAppendCatalogDialog}
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                        Thêm thuốc
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={applyAllSuggestedQty}
                                                        disabled={!hasApplicableSuggestion}
                                                    >
                                                        Dùng tất cả gợi ý
                                                    </Button>
                                                </div>
                                            )}
                                        </div>

                                        {canEdit && invalidDraftLineCount > 0 && (
                                            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                                                {invalidDraftLineCount === 1
                                                    ? "Còn 1 dòng chưa nhập số lượng hợp lệ."
                                                    : `Còn ${invalidDraftLineCount} dòng chưa nhập số lượng hợp lệ.`}
                                            </div>
                                        )}

                                        {canEdit && duplicateMasterLineIds.size > 0 && (
                                            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                                                Có nhiều dòng đang trùng cùng một thuốc chuẩn. Hệ thống sẽ chặn áp gợi ý và chặn lưu nháp cho đến khi bạn giữ lại một dòng cho mỗi thuốc chuẩn.
                                            </div>
                                        )}

                                        {editorLines.length === 0 ? (
                                            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                                                Thêm thuốc từ danh mục công ty để bắt đầu lập nháp.
                                            </div>
                                        ) : (
                                            <div className="overflow-hidden rounded-xl border border-slate-200">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow className="bg-slate-50">
                                                            <TableHead className="w-[24%]">Thuốc</TableHead>
                                                            <TableHead className="w-[12%]">Mã thuốc công ty</TableHead>
                                                            <TableHead className="w-[18%]">Thuốc chuẩn liên kết</TableHead>
                                                            <TableHead className="w-[8%]">Đơn vị</TableHead>
                                                            <TableHead className="w-[14%]">Số lượng yêu cầu</TableHead>
                                                            <TableHead className="w-[16%]">Gợi ý</TableHead>
                                                            <TableHead className="w-[12%]">Trạng thái</TableHead>
                                                            <TableHead className="w-[8%] text-right">Thao tác</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {editorLines.map((line) => {
                                                            const lineStatus = LINE_STATUS_META[line.lineStatus];
                                                            const companyDrugCode =
                                                                line.companyDrug?.companyDrugCode || "—";
                                                            const linkedMasterDrug = line.masterDrug;
                                                            const invalidRequestedQty =
                                                                !isValidRequestedQty(line.requestedQty);
                                                            const isHighlighted =
                                                                highlightedLineIds.includes(line.localId);
                                                            const liveSuggestion =
                                                                lineSuggestionMap[line.localId] ||
                                                                null;
                                                            const isDuplicateMasterLine =
                                                                duplicateMasterLineIds.has(
                                                                    line.localId
                                                                );
                                                            const duplicateSuggestionMessage =
                                                                liveSuggestion?.isSuppressedDuplicateMasterDrug ||
                                                                isDuplicateMasterLine
                                                                    ? "Thuốc chuẩn này đã xuất hiện ở dòng khác nên hệ thống tắt gợi ý để tránh nhân đôi số lượng."
                                                                    : null;
                                                            const resolvedSuggestedQty =
                                                                duplicateSuggestionMessage
                                                                    ? null
                                                                    : liveSuggestion?.recommendedQty ??
                                                                      line.suggestedQty;
                                                            const resolvedSuggestionReportMonth =
                                                                duplicateSuggestionMessage
                                                                    ? null
                                                                    : liveSuggestion?.suggestionReportMonth ??
                                                                      line.suggestionReportMonth;
                                                            const suggestionMeta =
                                                                liveSuggestion
                                                                    ? SUGGESTION_STATUS_META[
                                                                          liveSuggestion.status
                                                                      ]
                                                                    : null;

                                                            return (
                                                                <TableRow
                                                                    key={line.localId}
                                                                    className={cn(
                                                                        isHighlighted && "bg-blue-50/80"
                                                                    )}
                                                                >
                                                                    <TableCell className="align-top">
                                                                        <div className="space-y-1">
                                                                            <p className="font-medium text-slate-900">{line.displayName}</p>
                                                                            {line.companyDrug?.activeIngredient ? (
                                                                                <p className="text-xs text-slate-500">
                                                                                    {line.companyDrug.activeIngredient}
                                                                                </p>
                                                                            ) : null}
                                                                            {line.companyResponseReason && (
                                                                                <p className="text-xs text-rose-700">
                                                                                    Lý do công ty: {line.companyResponseReason}
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell className="align-top">
                                                                        <span className="font-medium text-slate-900">
                                                                            {companyDrugCode}
                                                                        </span>
                                                                    </TableCell>
                                                                    <TableCell className="align-top">
                                                                        {linkedMasterDrug ? (
                                                                            <div className="space-y-1">
                                                                                <p className="font-medium text-slate-900">
                                                                                    {linkedMasterDrug.maChung}
                                                                                </p>
                                                                                <p className="text-xs text-slate-500">
                                                                                    {linkedMasterDrug.tenThuoc}
                                                                                </p>
                                                                            </div>
                                                                        ) : (
                                                                            <span className="text-sm text-amber-700">
                                                                                Chưa liên kết
                                                                            </span>
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell className="align-top text-slate-600">
                                                                        {line.unit || "—"}
                                                                    </TableCell>
                                                                    <TableCell className="align-top">
                                                                        {canEdit ? (
                                                                            <div className="space-y-1">
                                                                                <Input
                                                                                    ref={(element) => {
                                                                                        lineInputRefs.current[line.localId] =
                                                                                            element;
                                                                                    }}
                                                                                    type="number"
                                                                                    min="0"
                                                                                    step="0.01"
                                                                                    value={line.requestedQty}
                                                                                    onChange={(event) => {
                                                                                        updateLineQty(
                                                                                            line.localId,
                                                                                            event.target.value
                                                                                        );
                                                                                        if (
                                                                                            pendingFocusLineId === line.localId
                                                                                        ) {
                                                                                            setPendingFocusLineId(null);
                                                                                        }
                                                                                    }}
                                                                                    className={cn(
                                                                                        "w-32 text-right",
                                                                                        invalidRequestedQty &&
                                                                                            "border-amber-400 bg-amber-50 focus-visible:ring-amber-500"
                                                                                    )}
                                                                                />
                                                                                {invalidRequestedQty && (
                                                                                    <p className="text-xs text-amber-700">
                                                                                        Cần nhập số lượng &gt; 0
                                                                                    </p>
                                                                                )}
                                                                            </div>
                                                                        ) : (
                                                                            <span className="font-medium text-slate-900">
                                                                                {formatQuantity(Number(line.requestedQty))}
                                                                            </span>
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell className="align-top">
                                                                        <div className="space-y-2">
                                                                            <p className="font-medium text-slate-900">
                                                                                {formatQuantity(resolvedSuggestedQty)}
                                                                            </p>
                                                                            {liveSuggestion ? (
                                                                                <div className="space-y-1 text-xs text-slate-500">
                                                                                    <div className="flex flex-wrap gap-2">
                                                                                        <Badge
                                                                                            variant={
                                                                                                suggestionMeta?.variant ||
                                                                                                "outline"
                                                                                            }
                                                                                            className={
                                                                                                suggestionMeta?.className
                                                                                            }
                                                                                        >
                                                                                            {liveSuggestion.statusLabel}
                                                                                        </Badge>
                                                                                        {liveSuggestion.monthsOfCover !==
                                                                                        null ? (
                                                                                            <span>
                                                                                                Độ phủ:{" "}
                                                                                                {formatQuantity(
                                                                                                    liveSuggestion.monthsOfCover
                                                                                                )}{" "}
                                                                                                tháng
                                                                                            </span>
                                                                                        ) : null}
                                                                                    </div>
                                                                                    {liveSuggestion.xntBaseQty !==
                                                                                    null ? (
                                                                                        <p>
                                                                                            Nền XNT:{" "}
                                                                                            {formatQuantity(
                                                                                                liveSuggestion.xntBaseQty
                                                                                            )}
                                                                                        </p>
                                                                                    ) : null}
                                                                                    <p>
                                                                                        Đang về:{" "}
                                                                                        {formatQuantity(
                                                                                            liveSuggestion.incomingAcceptedQty
                                                                                        )}
                                                                                    </p>
                                                                                    <p>
                                                                                        Tháng tham chiếu:{" "}
                                                                                        {liveSuggestion.suggestionReportMonth ||
                                                                                            draftSuggestionEffectiveMonth ||
                                                                                            "—"}
                                                                                    </p>
                                                                                    {(liveSuggestion.status ===
                                                                                        "UNLINKED" ||
                                                                                        liveSuggestion.status ===
                                                                                            "INSUFFICIENT_DATA") &&
                                                                                    liveSuggestion.basisLines[0] ? (
                                                                                        <p>
                                                                                            {
                                                                                                liveSuggestion.basisLines[0]
                                                                                            }
                                                                                        </p>
                                                                                    ) : null}
                                                                                    {duplicateSuggestionMessage ? (
                                                                                        <p className="text-amber-700">
                                                                                            {duplicateSuggestionMessage}
                                                                                        </p>
                                                                                    ) : null}
                                                                                </div>
                                                                            ) : (
                                                                                <div className="space-y-1 text-xs text-slate-500">
                                                                                    <p>
                                                                                        Tháng tham chiếu:{" "}
                                                                                        {resolvedSuggestionReportMonth ||
                                                                                            "Chưa tính"}
                                                                                    </p>
                                                                                    {line.suggestionBasis ? (
                                                                                        <p>{line.suggestionBasis}</p>
                                                                                    ) : null}
                                                                                    {duplicateSuggestionMessage ? (
                                                                                        <p className="text-amber-700">
                                                                                            {duplicateSuggestionMessage}
                                                                                        </p>
                                                                                    ) : null}
                                                                                </div>
                                                                            )}
                                                                            {canEdit &&
                                                                            resolvedSuggestedQty !== null &&
                                                                            resolvedSuggestedQty > 0 ? (
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="sm"
                                                                                    className="h-7 px-2 text-xs"
                                                                                    onClick={() =>
                                                                                        applySuggestedQty(
                                                                                            line.localId
                                                                                        )
                                                                                    }
                                                                                >
                                                                                    Dùng gợi ý
                                                                                </Button>
                                                                            ) : null}
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
                                                        onClick={openReceiptDialog}
                                                        disabled={pendingReceiptShipments.length === 0}
                                                        className={CONFIRM_RECEIPT_BUTTON_CLASS}
                                                    >
                                                        <CheckCircle className="h-4 w-4" />
                                                        Xác nhận giao hàng
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
                                                                            Thời gian giao:{" "}
                                                                            {formatShipmentDateRangeLabel({
                                                                                shippedFromDate: shipment.shippedFromDate,
                                                                                shippedToDate: shipment.shippedToDate,
                                                                                shippedAt: shipment.shippedAt,
                                                                            })}
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
            </div>

            <Dialog open={isReceiptDialogOpen} onOpenChange={setIsReceiptDialogOpen}>
                <DialogContent className="!left-0 !top-0 flex !h-[100dvh] !w-screen !max-w-none !translate-x-0 !translate-y-0 flex-col gap-0 overflow-hidden !rounded-none !border-0 !p-0 !shadow-none xl:!left-[50%] xl:!top-[50%] xl:!h-auto xl:!max-h-[90vh] xl:!w-full xl:!max-w-5xl xl:!translate-x-[-50%] xl:!translate-y-[-50%] xl:!rounded-lg xl:!border xl:!shadow-lg">
                    <DialogHeader className="shrink-0 border-b border-slate-200 px-4 py-4 pr-14 text-left xl:px-6 xl:py-5 xl:pr-16">
                        <DialogTitle>Xác nhận giao hàng</DialogTitle>
                        <DialogDescription>
                            Chọn đợt giao cần xác nhận và nhập số lượng thực tế cơ sở đã nhận ở từng dòng.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 xl:px-6">
                        <div className="space-y-4">
                            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
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
                                                    Đợt giao #{shipment.shipmentNo} -{" "}
                                                    {formatShipmentDateRangeLabel({
                                                        shippedFromDate: shipment.shippedFromDate,
                                                        shippedToDate: shipment.shippedToDate,
                                                        shippedAt: shipment.shippedAt,
                                                    })}
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
                                        className="min-h-20"
                                    />
                                </div>
                            </div>

                            {selectedReceiptShipment ? (
                                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm xl:hidden">
                                    <p className="font-semibold text-slate-900">
                                        Đợt giao #{selectedReceiptShipment.shipmentNo}
                                    </p>
                                    <p className="mt-1 text-slate-600">
                                        Thời gian giao:{" "}
                                        {formatShipmentDateRangeLabel({
                                            shippedFromDate:
                                                selectedReceiptShipment.shippedFromDate,
                                            shippedToDate:
                                                selectedReceiptShipment.shippedToDate,
                                            shippedAt: selectedReceiptShipment.shippedAt,
                                        })}
                                    </p>
                                </div>
                            ) : null}

                            {hasInvalidReceiptLine ? (
                                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                                    Vui lòng sửa các dòng có số lượng thực nhận không hợp lệ hoặc còn thiếu lý do chênh lệch trước khi xác nhận.
                                </div>
                            ) : null}

                            {receiptLines.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                                    Chọn đợt giao để nhập số lượng thực nhận.
                                </div>
                            ) : (
                                <>
                                    <div className="hidden space-y-3 xl:block">
                                        {receiptLines.map((line) => {
                                            const validation =
                                                receiptValidationMap.get(line.shipmentLineId) ||
                                                null;

                                            return (
                                                <div
                                                    key={line.shipmentLineId}
                                                    className={cn(
                                                        "rounded-xl border p-4",
                                                        validation?.invalidReceivedQty ||
                                                            validation?.exceedsShippedQty ||
                                                            validation?.missingDifferenceReason
                                                            ? "border-amber-300 bg-amber-50/40"
                                                            : "border-slate-200"
                                                    )}
                                                >
                                                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px_1fr]">
                                                        <div>
                                                            <p className="font-medium text-slate-900">
                                                                {line.displayName}
                                                            </p>
                                                            <p className="mt-1 text-sm text-slate-500">
                                                                Công ty giao:{" "}
                                                                {formatQuantity(line.shippedQty)}{" "}
                                                                {line.unit || ""}
                                                            </p>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label>Thực nhận</Label>
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                step="0.01"
                                                                value={line.receivedQty}
                                                                onChange={(event) =>
                                                                    updateReceiptLine(
                                                                        line.shipmentLineId,
                                                                        {
                                                                            receivedQty:
                                                                                event.target.value,
                                                                        }
                                                                    )
                                                                }
                                                                className={cn(
                                                                    validation?.invalidReceivedQty ||
                                                                        validation?.exceedsShippedQty
                                                                        ? "border-amber-400 bg-amber-50 focus-visible:ring-amber-500"
                                                                        : undefined
                                                                )}
                                                            />
                                                            {validation?.invalidReceivedQty ? (
                                                                <p className="text-xs text-amber-700">
                                                                    Nhập số lượng thực nhận hợp lệ, lớn hơn hoặc bằng 0.
                                                                </p>
                                                            ) : null}
                                                            {validation?.exceedsShippedQty ? (
                                                                <p className="text-xs text-amber-700">
                                                                    Số lượng thực nhận không được vượt quá số lượng đã giao.
                                                                </p>
                                                            ) : null}
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label>Lý do chênh lệch nếu có</Label>
                                                            <Input
                                                                value={line.differenceReason}
                                                                onChange={(event) =>
                                                                    updateReceiptLine(
                                                                        line.shipmentLineId,
                                                                        {
                                                                            differenceReason:
                                                                                event.target.value,
                                                                        }
                                                                    )
                                                                }
                                                                placeholder="Bắt buộc nếu thực nhận khác số lượng giao"
                                                                className={cn(
                                                                    validation?.missingDifferenceReason
                                                                        ? "border-amber-400 bg-amber-50 focus-visible:ring-amber-500"
                                                                        : undefined
                                                                )}
                                                            />
                                                            {validation?.missingDifferenceReason ? (
                                                                <p className="text-xs text-amber-700">
                                                                    Cần nhập lý do khi số lượng thực nhận khác số lượng giao.
                                                                </p>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="space-y-3 xl:hidden">
                                        {receiptLines.map((line, index) => {
                                            const validation =
                                                receiptValidationMap.get(line.shipmentLineId) ||
                                                null;

                                            return (
                                                <div
                                                    key={line.shipmentLineId}
                                                    className={cn(
                                                        "rounded-xl border bg-white p-4 shadow-sm",
                                                        validation?.invalidReceivedQty ||
                                                            validation?.exceedsShippedQty ||
                                                            validation?.missingDifferenceReason
                                                            ? "border-amber-300 bg-amber-50/50"
                                                            : "border-slate-200"
                                                    )}
                                                >
                                                    <div className="space-y-4">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center justify-between gap-3">
                                                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                                                                    Dòng {index + 1}
                                                                </span>
                                                                <span className="text-sm font-semibold text-slate-900">
                                                                    {formatQuantity(line.shippedQty)}{" "}
                                                                    {line.unit || ""}
                                                                </span>
                                                            </div>
                                                            <p className="break-words font-semibold text-slate-900">
                                                                {line.displayName}
                                                            </p>
                                                            <p className="text-sm text-slate-500">
                                                                Số lượng công ty giao
                                                            </p>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <Label>Thực nhận</Label>
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                step="0.01"
                                                                value={line.receivedQty}
                                                                onChange={(event) =>
                                                                    updateReceiptLine(
                                                                        line.shipmentLineId,
                                                                        {
                                                                            receivedQty:
                                                                                event.target.value,
                                                                        }
                                                                    )
                                                                }
                                                                className={cn(
                                                                    validation?.invalidReceivedQty ||
                                                                        validation?.exceedsShippedQty
                                                                        ? "border-amber-400 bg-amber-50 focus-visible:ring-amber-500"
                                                                        : undefined
                                                                )}
                                                            />
                                                            {validation?.invalidReceivedQty ? (
                                                                <p className="text-xs text-amber-700">
                                                                    Nhập số lượng thực nhận hợp lệ, lớn hơn hoặc bằng 0.
                                                                </p>
                                                            ) : null}
                                                            {validation?.exceedsShippedQty ? (
                                                                <p className="text-xs text-amber-700">
                                                                    Số lượng thực nhận không được vượt quá số lượng đã giao.
                                                                </p>
                                                            ) : null}
                                                        </div>

                                                        <div className="space-y-2">
                                                            <Label>Lý do chênh lệch nếu có</Label>
                                                            <Input
                                                                value={line.differenceReason}
                                                                onChange={(event) =>
                                                                    updateReceiptLine(
                                                                        line.shipmentLineId,
                                                                        {
                                                                            differenceReason:
                                                                                event.target.value,
                                                                        }
                                                                    )
                                                                }
                                                                placeholder="Bắt buộc nếu thực nhận khác số lượng giao"
                                                                className={cn(
                                                                    validation?.missingDifferenceReason
                                                                        ? "border-amber-400 bg-amber-50 focus-visible:ring-amber-500"
                                                                        : undefined
                                                                )}
                                                            />
                                                            {validation?.missingDifferenceReason ? (
                                                                <p className="text-xs text-amber-700">
                                                                    Cần nhập lý do khi số lượng thực nhận khác số lượng giao.
                                                                </p>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="grid shrink-0 grid-cols-2 gap-2 border-t border-slate-200 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:flex sm:flex-row sm:justify-end xl:px-6 xl:py-4">
                        <Button
                            variant="outline"
                            onClick={() => setIsReceiptDialogOpen(false)}
                            disabled={isConfirmingReceipt}
                            className="w-full sm:w-auto"
                        >
                            Đóng
                        </Button>
                        <Button
                            onClick={() => void handleConfirmReceipt()}
                            disabled={
                                isConfirmingReceipt ||
                                receiptLines.length === 0 ||
                                hasInvalidReceiptLine
                            }
                            className={cn(CONFIRM_RECEIPT_BUTTON_CLASS, "w-full sm:w-auto")}
                        >
                            {isConfirmingReceipt ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <CheckCircle className="h-4 w-4" />
                            )}
                            Xác nhận giao hàng
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <FacilityDrugOrderCatalogDialog
                open={isCatalogDialogOpen}
                mode={catalogMode}
                noneValue={NONE_VALUE}
                companies={companies}
                reportMonths={reportMonths}
                companyId={catalogCompanyId}
                baseReportMonth={catalogBaseReportMonth}
                note={catalogNote}
                items={catalogItems}
                suggestedItems={catalogSuggestions}
                search={catalogSearch}
                linkedOnly={catalogLinkedOnly}
                showAllSuggested={includeAllCatalogSuggestions}
                suggestionEffectiveMonth={catalogSuggestionEffectiveMonth}
                selectedIds={selectedCatalogDrugIds}
                existingCompanyDrugIds={blockedCatalogDrugIds}
                existingMasterDrugIds={blockedCatalogMasterDrugIds}
                isLoading={isCatalogLoading}
                suggestionsLoading={isCatalogSuggestionsLoading}
                isSubmitting={isCatalogSubmitting}
                suggestionsError={catalogSuggestionsError}
                onOpenChange={handleCatalogDialogOpenChange}
                onCompanyChange={handleCatalogCompanyChange}
                onBaseReportMonthChange={setCatalogBaseReportMonth}
                onNoteChange={setCatalogNote}
                onSearchChange={setCatalogSearch}
                onLinkedOnlyChange={setCatalogLinkedOnly}
                onShowAllSuggestedChange={setIncludeAllCatalogSuggestions}
                onToggleSelect={toggleCatalogSelection}
                onSetVisibleSelection={setVisibleCatalogSelection}
                onClearSelection={clearCatalogSelection}
                onSubmit={handleCatalogSubmit}
            />
        </div>
    );
}
