"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
    CheckCircle2,
    ChevronDown,
    Download,
    FileText,
    History,
    Plus,
    Printer,
    Save,
    Search,
    Trash2,
    X,
} from "lucide-react";
import { toast } from "sonner";
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
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Textarea } from "@/components/ui/textarea";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

const NONE_VALUE = "__none__";
const ALL_COMPANIES_VALUE = "__all_companies__";
const ALL_COMPANIES_LABEL = "Tất cả công ty";
const CATALOG_STICKY_HEAD_CLASS = "sticky top-0 z-20 bg-white font-bold shadow-sm";
const DEFAULT_EXPORT_HISTORY_MONTH_COUNT = 3;
const MAX_EXPORT_HISTORY_MONTH_COUNT = 6;

type DemandPlanStatus = "DRAFT" | "FINALIZED";

type FacilityInfo = {
    id: string;
    username: string;
    facilityName: string | null;
    facilityCode: string | null;
};

type MasterDrug = {
    id: string;
    maChung: string;
    tenThuoc: string;
    hoatChat: string | null;
    hamLuong: string | null;
    dangBaoChe: string | null;
    soDangKy: string | null;
    quyCach: string | null;
    donViTinh: string | null;
};

type CatalogItem = {
    id: string;
    maNoiBo: string;
    tenThuocNoiBo: string;
    hoatChatNoiBo: string | null;
    soDangKyNoiBo: string | null;
    donViTinhNoiBo: string | null;
    nhomTckt: string | null;
    giaVat: number;
    tenCongTy: string | null;
    demandRoundingEnabled: boolean;
    demandPackageUnit: string | null;
    demandPackageSize: number | null;
    masterDrugId: string;
    masterDrug: MasterDrug;
    suggestedQty: number | null;
    rawSuggestedQty: number | null;
    roundedSuggestedQty: number | null;
    packageUnit: string | null;
    packageSize: number | null;
    roundingNote: string | null;
    exportHistory?: Record<string, number>;
    suggestionBasis: string | null;
    suggestionReportMonth: string | null;
    suggestionRuleVersion: string | null;
};

type DemandPlanSummary = {
    id: string;
    planNo: string;
    status: DemandPlanStatus;
    baseReportMonth: string | null;
    note: string | null;
    finalizedAt: string | null;
    createdAt: string;
    updatedAt: string;
    lineCount: number;
    totalFinalQty: number;
};

type DemandPlanLine = {
    id: string;
    mapId: string;
    masterDrugId: string;
    maNoiBoSnapshot: string;
    tenThuocSnapshot: string;
    hoatChatSnapshot: string | null;
    donViTinhSnapshot: string | null;
    nhomTcktSnapshot: string | null;
    maChungSnapshot: string | null;
    suggestedQty: number | null;
    rawSuggestedQty: number | null;
    roundedSuggestedQty: number | null;
    packageUnitSnapshot: string | null;
    packageSizeSnapshot: number | null;
    roundingNote: string | null;
    finalQty: number;
    suggestionBasis: string | null;
    suggestionReportMonth: string | null;
    suggestionRuleVersion: string | null;
    note: string | null;
};

type XntHistoryItem = {
    reportMonth: string;
    tonDau: number;
    nhap: number;
    xuat: number;
    tonCuoi: number;
};

type DemandPlanDetail = DemandPlanSummary & {
    facility: FacilityInfo;
    permissions: {
        canEdit: boolean;
        canFinalize: boolean;
        canDelete: boolean;
    };
    lines: DemandPlanLine[];
};

type EditorLine = Omit<DemandPlanLine, "id"> & {
    id?: string;
    finalQtyInput: string;
    noteInput: string;
};

const statusMeta: Record<
    DemandPlanStatus,
    { label: string; className: string }
> = {
    DRAFT: {
        label: "Nháp",
        className: "border-amber-300 bg-amber-50 text-amber-700",
    },
    FINALIZED: {
        label: "Đã chốt",
        className: "border-emerald-300 bg-emerald-50 text-emerald-700",
    },
};

function formatDate(value: string | null | undefined) {
    if (!value) return "-";
    return new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "short",
        timeStyle: "short",
    }).format(new Date(value));
}

function formatQty(value: number | null | undefined) {
    if (value === null || value === undefined) return "-";
    return new Intl.NumberFormat("vi-VN", {
        maximumFractionDigits: 2,
    }).format(value);
}

function formatCurrency(value: number | null | undefined) {
    if (value === null || value === undefined) return "-";
    return new Intl.NumberFormat("vi-VN", {
        maximumFractionDigits: 0,
    }).format(value);
}

function formatPackageRule(unit?: string | null, size?: number | null) {
    if (!unit || !size || size <= 0) return "-";
    return `1 ${unit} = ${formatQty(size)}`;
}

function formatCompanyFilterLabel(value: string) {
    return value === ALL_COMPANIES_VALUE ? ALL_COMPANIES_LABEL : value;
}

function getDefaultExportHistoryMonths(reportMonths: string[]) {
    return reportMonths.slice(0, DEFAULT_EXPORT_HISTORY_MONTH_COUNT);
}

function isQtyNotRoundedToPackage(qtyInput: string, packageSize?: number | null) {
    if (!packageSize || packageSize <= 0) return false;
    const qty = Number(qtyInput);
    if (!Number.isFinite(qty) || qty <= 0) return false;
    const quotient = qty / packageSize;
    return Math.abs(quotient - Math.round(quotient)) > 0.000001;
}

function SuggestedQtySummary({
    suggestedQty,
    rawSuggestedQty,
    roundedSuggestedQty,
    packageUnit,
    packageSize,
    roundingNote,
    suggestionReportMonth,
}: {
    suggestedQty?: number | null;
    rawSuggestedQty?: number | null;
    roundedSuggestedQty?: number | null;
    packageUnit?: string | null;
    packageSize?: number | null;
    roundingNote?: string | null;
    suggestionReportMonth?: string | null;
}) {
    const hasRoundedSuggestion =
        rawSuggestedQty !== null &&
        rawSuggestedQty !== undefined &&
        roundedSuggestedQty !== null &&
        roundedSuggestedQty !== undefined;
    const packageRule = formatPackageRule(packageUnit, packageSize);

    return (
        <div
            className="flex flex-col gap-1 text-sm"
            title={roundingNote || undefined}
        >
            {hasRoundedSuggestion ? (
                <>
                    <span className="font-medium text-gray-900">
                        Đề xuất: {formatQty(roundedSuggestedQty)}
                    </span>
                    <span className="text-xs text-gray-500">
                        Gợi ý XNT: {formatQty(rawSuggestedQty)}
                    </span>
                </>
            ) : (
                <span>{formatQty(suggestedQty)}</span>
            )}
            {packageRule !== "-" ? (
                <span className="text-xs text-blue-700">{packageRule}</span>
            ) : null}
            {suggestionReportMonth ? (
                <span className="text-xs text-gray-500">
                    {suggestionReportMonth}
                </span>
            ) : null}
        </div>
    );
}

function XntHistoryGroupedTable({ history }: { history: XntHistoryItem[] }) {
    if (history.length === 0) {
        return (
            <div className="rounded-md border border-dashed p-6 text-center text-sm text-gray-500">
                Chưa có dữ liệu XNT cho thuốc này.
            </div>
        );
    }

    return (
        <div className="overflow-x-auto rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        {history.map((item) => (
                            <TableHead
                                key={item.reportMonth}
                                colSpan={4}
                                className="min-w-[320px] border-r text-center font-semibold text-gray-900"
                            >
                                Kỳ {item.reportMonth}
                            </TableHead>
                        ))}
                    </TableRow>
                    <TableRow>
                        {history.map((item) => (
                            <Fragment key={`${item.reportMonth}-headers`}>
                                <TableHead
                                    className="text-right whitespace-nowrap"
                                >
                                    Tồn đầu
                                </TableHead>
                                <TableHead
                                    className="text-right whitespace-nowrap"
                                >
                                    Nhập
                                </TableHead>
                                <TableHead
                                    className="text-right whitespace-nowrap"
                                >
                                    Xuất
                                </TableHead>
                                <TableHead
                                    className="border-r text-right whitespace-nowrap"
                                >
                                    Tồn cuối
                                </TableHead>
                            </Fragment>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow>
                        {history.map((item) => (
                            <Fragment key={`${item.reportMonth}-values`}>
                                <TableCell
                                    className="text-right tabular-nums"
                                >
                                    {formatQty(item.tonDau)}
                                </TableCell>
                                <TableCell
                                    className="text-right tabular-nums"
                                >
                                    {formatQty(item.nhap)}
                                </TableCell>
                                <TableCell
                                    className="text-right tabular-nums"
                                >
                                    {formatQty(item.xuat)}
                                </TableCell>
                                <TableCell
                                    className="border-r text-right tabular-nums"
                                >
                                    {formatQty(item.tonCuoi)}
                                </TableCell>
                            </Fragment>
                        ))}
                    </TableRow>
                </TableBody>
            </Table>
        </div>
    );
}

function TruncatedTooltipText({
    value,
    className = "",
    textClassName = "",
}: {
    value?: string | null;
    className?: string;
    textClassName?: string;
}) {
    const text = value?.trim() || "-";

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <span
                    tabIndex={0}
                    className={`block min-w-0 cursor-help ${className}`}
                >
                    <span className={`line-clamp-2 break-words ${textClassName}`}>
                        {text}
                    </span>
                </span>
            </TooltipTrigger>
            <TooltipContent
                side="top"
                align="start"
                className="max-w-lg whitespace-normal break-words leading-relaxed"
            >
                {text}
            </TooltipContent>
        </Tooltip>
    );
}

function buildEditorLineFromPlan(line: DemandPlanLine): EditorLine {
    return {
        ...line,
        finalQtyInput: String(line.finalQty || ""),
        noteInput: line.note || "",
    };
}

function buildEditorLineFromCatalog(item: CatalogItem): EditorLine {
    return {
        mapId: item.id,
        masterDrugId: item.masterDrugId,
        maNoiBoSnapshot: item.maNoiBo,
        tenThuocSnapshot: item.tenThuocNoiBo,
        hoatChatSnapshot: item.hoatChatNoiBo || item.masterDrug?.hoatChat || null,
        donViTinhSnapshot:
            item.donViTinhNoiBo || item.masterDrug?.donViTinh || null,
        nhomTcktSnapshot: item.nhomTckt,
        maChungSnapshot: item.masterDrug?.maChung || null,
        suggestedQty: item.suggestedQty,
        rawSuggestedQty: item.rawSuggestedQty,
        roundedSuggestedQty: item.roundedSuggestedQty,
        packageUnitSnapshot: item.packageUnit,
        packageSizeSnapshot: item.packageSize,
        roundingNote: item.roundingNote,
        finalQty: item.suggestedQty || 0,
        finalQtyInput: item.suggestedQty ? String(item.suggestedQty) : "",
        suggestionBasis: item.suggestionBasis,
        suggestionReportMonth: item.suggestionReportMonth,
        suggestionRuleVersion: item.suggestionRuleVersion,
        note: null,
        noteInput: "",
    };
}

function StatusBadge({ status }: { status: DemandPlanStatus }) {
    const meta = statusMeta[status];
    return (
        <Badge variant="outline" className={meta.className}>
            {meta.label}
        </Badge>
    );
}

export default function FacilityDemandPlansPage() {
    const [plans, setPlans] = useState<DemandPlanSummary[]>([]);
    const [reportMonths, setReportMonths] = useState<string[]>([]);
    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
    const [selectedPlan, setSelectedPlan] = useState<DemandPlanDetail | null>(null);
    const [editorLines, setEditorLines] = useState<EditorLine[]>([]);
    const [editorMonth, setEditorMonth] = useState(NONE_VALUE);
    const [editorNote, setEditorNote] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isDetailLoading, setIsDetailLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isFinalizing, setIsFinalizing] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    const [isCatalogOpen, setIsCatalogOpen] = useState(false);
    const [catalogMode, setCatalogMode] = useState<"create" | "append">("create");
    const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
    const [catalogCompanyOptions, setCatalogCompanyOptions] = useState<string[]>([]);
    const [selectedCatalogItemMap, setSelectedCatalogItemMap] = useState<
        Map<string, CatalogItem>
    >(() => new Map());
    const [catalogSearch, setCatalogSearch] = useState("");
    const [catalogMonth, setCatalogMonth] = useState(NONE_VALUE);
    const [catalogExportMonths, setCatalogExportMonths] = useState<string[]>([]);
    const [catalogCompanyName, setCatalogCompanyName] = useState(ALL_COMPANIES_VALUE);
    const [catalogCompanySearch, setCatalogCompanySearch] = useState(ALL_COMPANIES_LABEL);
    const [isCompanyPickerOpen, setIsCompanyPickerOpen] = useState(false);
    const [catalogNote, setCatalogNote] = useState("");
    const [isCatalogLoading, setIsCatalogLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [historyLine, setHistoryLine] = useState<EditorLine | null>(null);
    const [historyItems, setHistoryItems] = useState<XntHistoryItem[]>([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);

    const refreshPlans = useCallback(async (preferredId?: string | null) => {
        const res = await fetch("/api/facility/lap-du-tru");
        const payload = await res.json();
        if (!res.ok) {
            throw new Error(payload.message || "Không thể tải danh sách dự trù");
        }

        setPlans(payload.plans || []);
        setReportMonths(payload.reportMonths || []);
        const nextId =
            preferredId === undefined
                ? selectedPlanId || payload.plans?.[0]?.id || null
                : preferredId;
        setSelectedPlanId(nextId);
        return nextId;
    }, [selectedPlanId]);

    const loadPlanDetail = useCallback(async (planId: string) => {
        setIsDetailLoading(true);
        try {
            const res = await fetch(`/api/facility/lap-du-tru/${planId}`);
            const payload = await res.json();
            if (!res.ok) {
                throw new Error(payload.message || "Không thể tải chi tiết dự trù");
            }

            const plan = payload.plan as DemandPlanDetail;
            setSelectedPlan(plan);
            setEditorLines(plan.lines.map(buildEditorLineFromPlan));
            setEditorMonth(plan.baseReportMonth || NONE_VALUE);
            setEditorNote(plan.note || "");
            setIsDirty(false);
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Không thể tải chi tiết dự trù");
        } finally {
            setIsDetailLoading(false);
        }
    }, []);

    useEffect(() => {
        let ignore = false;
        setIsLoading(true);
        refreshPlans()
            .then((nextId) => {
                if (!ignore && nextId) {
                    void loadPlanDetail(nextId);
                }
            })
            .catch((error) => {
                console.error(error);
                toast.error(error instanceof Error ? error.message : "Không thể tải dự trù");
            })
            .finally(() => {
                if (!ignore) setIsLoading(false);
            });

        return () => {
            ignore = true;
        };
    }, [loadPlanDetail, refreshPlans]);

    useEffect(() => {
        if (selectedPlanId) {
            void loadPlanDetail(selectedPlanId);
        } else {
            setSelectedPlan(null);
            setEditorLines([]);
        }
    }, [selectedPlanId, loadPlanDetail]);

    const existingMapIds = useMemo(
        () => new Set(editorLines.map((line) => line.mapId)),
        [editorLines]
    );

    const filteredCatalogItems = useMemo(() => {
        const query = catalogSearch.trim().toLowerCase();
        return catalogItems.filter((item) => {
            if (catalogMode === "append" && existingMapIds.has(item.id)) {
                return false;
            }

            if (!query) return true;
            return [
                item.maNoiBo,
                item.tenThuocNoiBo,
                item.hoatChatNoiBo,
                item.tenCongTy,
                item.soDangKyNoiBo,
                item.masterDrug?.maChung,
                item.masterDrug?.tenThuoc,
            ]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(query));
        });
    }, [catalogItems, catalogMode, catalogSearch, existingMapIds]);

    const selectedCatalogIds = useMemo(
        () => Array.from(selectedCatalogItemMap.keys()),
        [selectedCatalogItemMap]
    );

    const selectedCatalogItems = useMemo(
        () => Array.from(selectedCatalogItemMap.values()),
        [selectedCatalogItemMap]
    );

    const filteredCatalogCompanyOptions = useMemo(() => {
        const query = catalogCompanySearch.trim().toLowerCase();
        if (!query || query === ALL_COMPANIES_LABEL.toLowerCase()) {
            return catalogCompanyOptions;
        }

        return catalogCompanyOptions.filter((companyName) =>
            companyName.toLowerCase().includes(query)
        );
    }, [catalogCompanyOptions, catalogCompanySearch]);

    const canEdit = Boolean(selectedPlan?.permissions.canEdit);
    const invalidLineCount = editorLines.filter((line) => {
        const qty = Number(line.finalQtyInput);
        return !Number.isFinite(qty) || qty <= 0;
    }).length;

    const loadCatalog = useCallback(async (
        baseReportMonth: string,
        companyName: string,
        exportMonths: string[]
    ) => {
        setIsCatalogLoading(true);
        try {
            const params = new URLSearchParams();
            if (baseReportMonth !== NONE_VALUE) {
                params.set("baseReportMonth", baseReportMonth);
            }
            if (companyName !== ALL_COMPANIES_VALUE) {
                params.set("companyName", companyName);
            }
            exportMonths.forEach((month) => params.append("exportMonths", month));
            const res = await fetch(
                `/api/facility/lap-du-tru/catalog?${params.toString()}`
            );
            const payload = await res.json();
            if (!res.ok) {
                throw new Error(payload.message || "Không thể tải danh mục dự trù");
            }
            const nextItems: CatalogItem[] = payload.items || [];
            setCatalogItems(nextItems);
            setSelectedCatalogItemMap((current) => {
                if (current.size === 0) {
                    return current;
                }

                const itemById = new Map(nextItems.map((item) => [item.id, item]));
                const nextMap = new Map<string, CatalogItem>();
                current.forEach((item, id) => {
                    const nextItem = itemById.get(id);
                    if (nextItem) {
                        nextMap.set(id, nextItem);
                    }
                });
                return nextMap;
            });
            setCatalogCompanyOptions(payload.companyOptions || []);
        } catch (error) {
            console.error(error);
            setCatalogItems([]);
            toast.error(error instanceof Error ? error.message : "Không thể tải danh mục dự trù");
        } finally {
            setIsCatalogLoading(false);
        }
    }, []);

    const openCreateDialog = () => {
        const month = reportMonths[0] || NONE_VALUE;
        const defaultExportMonths = getDefaultExportHistoryMonths(reportMonths);
        setCatalogMode("create");
        setCatalogMonth(month);
        setCatalogExportMonths(defaultExportMonths);
        setCatalogCompanyName(ALL_COMPANIES_VALUE);
        setCatalogCompanySearch(ALL_COMPANIES_LABEL);
        setIsCompanyPickerOpen(false);
        setCatalogNote("");
        setSelectedCatalogItemMap(new Map());
        setCatalogSearch("");
        setIsCatalogOpen(true);
        void loadCatalog(month, ALL_COMPANIES_VALUE, defaultExportMonths);
    };

    const openAppendDialog = () => {
        if (!selectedPlan || !canEdit) return;
        const defaultExportMonths = getDefaultExportHistoryMonths(reportMonths);
        setCatalogMode("append");
        setCatalogMonth(editorMonth);
        setCatalogExportMonths(defaultExportMonths);
        setCatalogCompanyName(ALL_COMPANIES_VALUE);
        setCatalogCompanySearch(ALL_COMPANIES_LABEL);
        setIsCompanyPickerOpen(false);
        setCatalogNote(editorNote);
        setSelectedCatalogItemMap(new Map());
        setCatalogSearch("");
        setIsCatalogOpen(true);
        void loadCatalog(editorMonth, ALL_COMPANIES_VALUE, defaultExportMonths);
    };

    const handleCatalogMonthChange = (month: string) => {
        setCatalogMonth(month);
        setSelectedCatalogItemMap(new Map());
        void loadCatalog(month, catalogCompanyName, catalogExportMonths);
    };

    const handleCatalogCompanyChange = (companyName: string) => {
        setCatalogCompanyName(companyName);
        setCatalogCompanySearch(formatCompanyFilterLabel(companyName));
        setIsCompanyPickerOpen(false);
        void loadCatalog(catalogMonth, companyName, catalogExportMonths);
    };

    const handleCatalogCompanyBlur = () => {
        window.setTimeout(() => {
            const query = catalogCompanySearch.trim();
            if (!query) {
                handleCatalogCompanyChange(ALL_COMPANIES_VALUE);
                return;
            }

            const exactMatch = catalogCompanyOptions.find(
                (companyName) => companyName.toLowerCase() === query.toLowerCase()
            );
            if (exactMatch) {
                if (exactMatch !== catalogCompanyName) {
                    handleCatalogCompanyChange(exactMatch);
                } else {
                    setCatalogCompanySearch(exactMatch);
                    setIsCompanyPickerOpen(false);
                }
                return;
            }

            setCatalogCompanySearch(formatCompanyFilterLabel(catalogCompanyName));
            setIsCompanyPickerOpen(false);
        }, 120);
    };

    const handleCatalogExportMonthToggle = (month: string, checked: boolean) => {
        if (checked && catalogExportMonths.length >= MAX_EXPORT_HISTORY_MONTH_COUNT) {
            toast.error(`Chỉ được chọn tối đa ${MAX_EXPORT_HISTORY_MONTH_COUNT} kỳ xuất`);
            return;
        }

        const nextMonthSet = new Set(catalogExportMonths);
        if (checked) {
            nextMonthSet.add(month);
        } else {
            nextMonthSet.delete(month);
        }
        const nextMonths = reportMonths.filter((item) => nextMonthSet.has(item));

        setCatalogExportMonths(nextMonths);
        void loadCatalog(catalogMonth, catalogCompanyName, nextMonths);
    };

    const toggleCatalogItem = (id: string) => {
        const item = catalogItems.find((catalogItem) => catalogItem.id === id);
        if (!item) return;

        setSelectedCatalogItemMap((current) => {
            const next = new Map(current);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.set(id, item);
            }
            return next;
        });
    };

    const toggleVisibleCatalogItems = () => {
        setSelectedCatalogItemMap((current) => {
            const next = new Map(current);
            const allVisibleSelected =
                filteredCatalogItems.length > 0 &&
                filteredCatalogItems.every((item) => next.has(item.id));

            if (allVisibleSelected) {
                filteredCatalogItems.forEach((item) => next.delete(item.id));
            } else {
                filteredCatalogItems.forEach((item) => next.set(item.id, item));
            }

            return next;
        });
    };

    const createPlanFromCatalog = async () => {
        if (selectedCatalogItems.length === 0) {
            toast.error("Vui lòng chọn ít nhất một thuốc");
            return;
        }

        setIsCreating(true);
        try {
            const res = await fetch("/api/facility/lap-du-tru", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    baseReportMonth: catalogMonth === NONE_VALUE ? null : catalogMonth,
                    note: catalogNote.trim() || null,
                    lines: selectedCatalogItems.map((item) => ({
                        mapId: item.id,
                        finalQty: item.suggestedQty || 0,
                        note: null,
                    })),
                }),
            });
            const payload = await res.json();
            if (!res.ok) {
                throw new Error(payload.message || "Không thể tạo dự trù");
            }

            setIsCatalogOpen(false);
            const nextId = await refreshPlans(payload.plan.id);
            if (nextId) await loadPlanDetail(nextId);
            toast.success("Đã tạo dự trù nháp");
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Không thể tạo dự trù");
        } finally {
            setIsCreating(false);
        }
    };

    const appendCatalogToDraft = () => {
        if (selectedCatalogItems.length === 0) {
            toast.error("Vui lòng chọn ít nhất một thuốc");
            return;
        }

        setEditorLines((current) => [
            ...current,
            ...selectedCatalogItems
                .filter((item) => !existingMapIds.has(item.id))
                .map(buildEditorLineFromCatalog),
        ]);
        setIsDirty(true);
        setIsCatalogOpen(false);
        toast.success(`Đã thêm ${selectedCatalogItems.length} thuốc vào dự trù`);
    };

    const saveDraft = async () => {
        if (!selectedPlan || !canEdit) return null;

        setIsSaving(true);
        try {
            const res = await fetch(`/api/facility/lap-du-tru/${selectedPlan.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    baseReportMonth: editorMonth === NONE_VALUE ? null : editorMonth,
                    note: editorNote.trim() || null,
                    lines: editorLines.map((line) => ({
                        mapId: line.mapId,
                        finalQty: Number(line.finalQtyInput || 0),
                        note: line.noteInput.trim() || null,
                    })),
                }),
            });
            const payload = await res.json();
            if (!res.ok) {
                throw new Error(payload.message || "Không thể lưu dự trù");
            }

            setSelectedPlan(payload.plan);
            setEditorLines(payload.plan.lines.map(buildEditorLineFromPlan));
            setEditorMonth(payload.plan.baseReportMonth || NONE_VALUE);
            setEditorNote(payload.plan.note || "");
            setIsDirty(false);
            await refreshPlans(payload.plan.id);
            toast.success("Đã lưu nháp dự trù");
            return payload.plan as DemandPlanDetail;
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Không thể lưu dự trù");
            return null;
        } finally {
            setIsSaving(false);
        }
    };

    const finalizePlan = async () => {
        if (!selectedPlan || !canEdit) return;
        if (invalidLineCount > 0) {
            toast.error("Tất cả dòng thuốc cần có số lượng dự trù lớn hơn 0");
            return;
        }

        let latestPlan = selectedPlan;
        if (isDirty) {
            const saved = await saveDraft();
            if (!saved) return;
            latestPlan = saved;
        }

        setIsFinalizing(true);
        try {
            const res = await fetch(
                `/api/facility/lap-du-tru/${latestPlan.id}/finalize`,
                { method: "POST" }
            );
            const payload = await res.json();
            if (!res.ok) {
                throw new Error(payload.message || "Không thể chốt dự trù");
            }

            setSelectedPlan(payload.plan);
            setEditorLines(payload.plan.lines.map(buildEditorLineFromPlan));
            setIsDirty(false);
            await refreshPlans(payload.plan.id);
            toast.success("Đã chốt dự trù");
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Không thể chốt dự trù");
        } finally {
            setIsFinalizing(false);
        }
    };

    const deletePlan = async () => {
        if (!selectedPlan?.permissions.canDelete) return;
        if (!window.confirm("Xóa dự trù nháp này?")) return;

        setIsDeleting(true);
        try {
            const res = await fetch(`/api/facility/lap-du-tru/${selectedPlan.id}`, {
                method: "DELETE",
            });
            const payload = await res.json();
            if (!res.ok) {
                throw new Error(payload.message || "Không thể xóa dự trù");
            }
            const nextId = plans.find((plan) => plan.id !== selectedPlan.id)?.id || null;
            await refreshPlans(nextId);
            setSelectedPlanId(nextId);
            toast.success("Đã xóa dự trù nháp");
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Không thể xóa dự trù");
        } finally {
            setIsDeleting(false);
        }
    };

    const updateLine = (mapId: string, changes: Partial<EditorLine>) => {
        setEditorLines((current) =>
            current.map((line) =>
                line.mapId === mapId ? { ...line, ...changes } : line
            )
        );
        setIsDirty(true);
    };

    const removeLine = (mapId: string) => {
        setEditorLines((current) => current.filter((line) => line.mapId !== mapId));
        setIsDirty(true);
    };

    const applySuggestedQty = (mapId: string) => {
        const line = editorLines.find((item) => item.mapId === mapId);
        if (!line || line.suggestedQty === null || line.suggestedQty <= 0) return;
        updateLine(mapId, { finalQtyInput: String(line.suggestedQty) });
    };

    const applyAllSuggestedQty = () => {
        setEditorLines((current) =>
            current.map((line) =>
                line.suggestedQty !== null && line.suggestedQty > 0
                    ? { ...line, finalQtyInput: String(line.suggestedQty) }
                    : line
            )
        );
        setIsDirty(true);
    };

    const openXntHistory = async (line: EditorLine) => {
        setHistoryLine(line);
        setHistoryItems([]);
        setIsHistoryOpen(true);
        setIsHistoryLoading(true);
        try {
            const params = new URLSearchParams({ mapId: line.mapId });
            const res = await fetch(
                `/api/facility/lap-du-tru/history?${params.toString()}`
            );
            const payload = await res.json();
            if (!res.ok) {
                throw new Error(payload.message || "Không thể tải lịch sử XNT");
            }

            setHistoryItems(payload.history || []);
        } catch (error) {
            console.error(error);
            setHistoryItems([]);
            toast.error(error instanceof Error ? error.message : "Không thể tải lịch sử XNT");
        } finally {
            setIsHistoryLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-normal text-gray-900">
                        Lập dự trù
                    </h1>
                    <p className="mt-1 text-sm text-gray-600">
                        Lập dự trù nội bộ từ danh mục thuốc đã ánh xạ của đơn vị.
                    </p>
                </div>
                <Button onClick={openCreateDialog}>
                    <Plus className="mr-2 size-4" />
                    Thêm dự trù
                </Button>
            </div>

            <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Danh sách dự trù</CardTitle>
                        <CardDescription>
                            {isLoading
                                ? "Đang tải..."
                                : `${plans.length} dự trù đã tạo`}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {plans.length === 0 && !isLoading ? (
                            <div className="rounded-md border border-dashed p-6 text-center text-sm text-gray-500">
                                Chưa có dự trù. Bấm Thêm dự trù để bắt đầu.
                            </div>
                        ) : null}
                        {plans.map((plan) => (
                            <button
                                key={plan.id}
                                type="button"
                                onClick={() => {
                                    if (isDirty && !window.confirm("Bỏ thay đổi chưa lưu?")) {
                                        return;
                                    }
                                    setSelectedPlanId(plan.id);
                                }}
                                className={`w-full rounded-md border p-3 text-left transition hover:border-blue-300 ${
                                    plan.id === selectedPlanId
                                        ? "border-blue-400 bg-blue-50"
                                        : "border-gray-200 bg-white"
                                }`}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-medium text-gray-900">
                                        {plan.planNo}
                                    </span>
                                    <StatusBadge status={plan.status} />
                                </div>
                                <div className="mt-2 text-xs text-gray-600">
                                    {plan.baseReportMonth || "Không chọn tháng gốc"} ·{" "}
                                    {plan.lineCount} thuốc · {formatQty(plan.totalFinalQty)}
                                </div>
                                <div className="mt-1 text-xs text-gray-500">
                                    Cập nhật {formatDate(plan.updatedAt)}
                                </div>
                            </button>
                        ))}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    {selectedPlan?.planNo || "Chi tiết dự trù"}
                                    {selectedPlan ? (
                                        <StatusBadge status={selectedPlan.status} />
                                    ) : null}
                                </CardTitle>
                                <CardDescription>
                                    {selectedPlan
                                        ? `Tạo ${formatDate(selectedPlan.createdAt)}`
                                        : "Chọn một dự trù để xem chi tiết"}
                                </CardDescription>
                            </div>
                            {selectedPlan ? (
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => window.print()}
                                    >
                                        <Printer className="mr-2 size-4" />
                                        In
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        asChild
                                    >
                                        <a href={`/api/facility/lap-du-tru/${selectedPlan.id}/export`}>
                                            <Download className="mr-2 size-4" />
                                            Excel
                                        </a>
                                    </Button>
                                    {canEdit ? (
                                        <>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={openAppendDialog}
                                            >
                                                <Plus className="mr-2 size-4" />
                                                Thêm thuốc
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => void saveDraft()}
                                                disabled={isSaving}
                                            >
                                                <Save className="mr-2 size-4" />
                                                Lưu
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() => void finalizePlan()}
                                                disabled={isFinalizing || editorLines.length === 0}
                                            >
                                                <CheckCircle2 className="mr-2 size-4" />
                                                Khóa dữ liệu
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => void deletePlan()}
                                                disabled={isDeleting}
                                            >
                                                <Trash2 className="mr-2 size-4" />
                                                Xóa
                                            </Button>
                                        </>
                                    ) : null}
                                </div>
                            ) : null}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {!selectedPlan && !isDetailLoading ? (
                            <div className="rounded-md border border-dashed p-8 text-center text-sm text-gray-500">
                                Không có dự trù được chọn.
                            </div>
                        ) : null}

                        {selectedPlan ? (
                            <>
                                <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
                                    <div className="space-y-2">
                                        <Label>Tháng gốc XNT</Label>
                                        <Select
                                            value={editorMonth}
                                            onValueChange={(value) => {
                                                setEditorMonth(value);
                                                setIsDirty(true);
                                            }}
                                            disabled={!canEdit}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Chọn tháng" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value={NONE_VALUE}>
                                                    Không chọn
                                                </SelectItem>
                                                {reportMonths.map((month) => (
                                                    <SelectItem key={month} value={month}>
                                                        {month}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Ghi chú</Label>
                                        <Textarea
                                            value={editorNote}
                                            onChange={(event) => {
                                                setEditorNote(event.target.value);
                                                setIsDirty(true);
                                            }}
                                            disabled={!canEdit}
                                            rows={2}
                                        />
                                    </div>
                                </div>

                                {canEdit && editorLines.some((line) => line.suggestedQty !== null) ? (
                                    <div className="flex items-center justify-between rounded-md border bg-gray-50 px-3 py-2 text-sm">
                                        <span className="text-gray-600">
                                            Có thể dùng số lượng gợi ý từ XNT cho các dòng đủ dữ liệu.
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={applyAllSuggestedQty}
                                        >
                                            Dùng tất cả gợi ý
                                        </Button>
                                    </div>
                                ) : null}

                                <div className="overflow-x-auto rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[130px]">Mã nội bộ</TableHead>
                                                <TableHead className="min-w-[240px]">Tên thuốc</TableHead>
                                                <TableHead>Đơn vị</TableHead>
                                                <TableHead>Nhóm</TableHead>
                                                <TableHead>Gợi ý</TableHead>
                                                <TableHead className="min-w-[140px]">Quy cách</TableHead>
                                                <TableHead className="w-[150px]">SL dự trù</TableHead>
                                                <TableHead className="min-w-[180px]">Ghi chú</TableHead>
                                                <TableHead className="w-[90px] text-center">XNT</TableHead>
                                                {canEdit ? <TableHead className="w-[80px]" /> : null}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {editorLines.length === 0 ? (
                                                <TableRow>
                                                    <TableCell
                                                        colSpan={canEdit ? 10 : 9}
                                                        className="h-24 text-center text-sm text-gray-500"
                                                    >
                                                        Chưa có thuốc trong dự trù.
                                                    </TableCell>
                                                </TableRow>
                                            ) : null}
                                            {editorLines.map((line) => (
                                                <TableRow key={line.mapId}>
                                                    <TableCell className="font-medium">
                                                        <div>{line.maNoiBoSnapshot}</div>
                                                        <div className="text-xs text-gray-500">
                                                            {line.maChungSnapshot || "-"}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="font-medium text-gray-900">
                                                            {line.tenThuocSnapshot}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            {line.hoatChatSnapshot || "-"}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{line.donViTinhSnapshot || "-"}</TableCell>
                                                    <TableCell>{line.nhomTcktSnapshot || "-"}</TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col gap-1">
                                                            <SuggestedQtySummary
                                                                suggestedQty={line.suggestedQty}
                                                                rawSuggestedQty={line.rawSuggestedQty}
                                                                roundedSuggestedQty={line.roundedSuggestedQty}
                                                                packageUnit={line.packageUnitSnapshot}
                                                                packageSize={line.packageSizeSnapshot}
                                                                roundingNote={line.roundingNote}
                                                                suggestionReportMonth={line.suggestionReportMonth}
                                                            />
                                                            {canEdit && line.suggestedQty !== null && line.suggestedQty > 0 ? (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="h-7 w-fit"
                                                                    onClick={() => applySuggestedQty(line.mapId)}
                                                                >
                                                                    Dùng
                                                                </Button>
                                                            ) : null}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div
                                                            className="text-sm"
                                                            title={line.roundingNote || undefined}
                                                        >
                                                            {formatPackageRule(
                                                                line.packageUnitSnapshot,
                                                                line.packageSizeSnapshot
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="space-y-1">
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                value={line.finalQtyInput}
                                                                onChange={(event) =>
                                                                    updateLine(line.mapId, {
                                                                        finalQtyInput: event.target.value,
                                                                    })
                                                                }
                                                                disabled={!canEdit}
                                                            />
                                                            {isQtyNotRoundedToPackage(
                                                                line.finalQtyInput,
                                                                line.packageSizeSnapshot
                                                            ) ? (
                                                                <div className="text-xs text-amber-700">
                                                                    Chưa tròn theo{" "}
                                                                    {formatPackageRule(
                                                                        line.packageUnitSnapshot,
                                                                        line.packageSizeSnapshot
                                                                    )}
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input
                                                            value={line.noteInput}
                                                            onChange={(event) =>
                                                                updateLine(line.mapId, {
                                                                    noteInput: event.target.value,
                                                                })
                                                            }
                                                            disabled={!canEdit}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-8 gap-1 px-2"
                                                            onClick={() => void openXntHistory(line)}
                                                        >
                                                            <History className="size-4" />
                                                            XNT
                                                        </Button>
                                                    </TableCell>
                                                    {canEdit ? (
                                                        <TableCell>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => removeLine(line.mapId)}
                                                            >
                                                                <X className="size-4" />
                                                            </Button>
                                                        </TableCell>
                                                    ) : null}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>

                                {isDirty ? (
                                    <div className="text-sm text-amber-700">
                                        Có thay đổi chưa lưu.
                                    </div>
                                ) : null}
                            </>
                        ) : null}
                    </CardContent>
                </Card>
            </div>

            <Dialog
                open={isHistoryOpen}
                onOpenChange={(open) => {
                    setIsHistoryOpen(open);
                    if (!open) {
                        setHistoryLine(null);
                        setHistoryItems([]);
                    }
                }}
            >
                <DialogContent className="max-h-[90dvh] max-w-[92vw] overflow-hidden sm:max-w-5xl">
                    <DialogHeader>
                        <DialogTitle>Lịch sử XNT</DialogTitle>
                        <DialogDescription>
                            {historyLine ? (
                                <>
                                    {historyLine.maNoiBoSnapshot} · {historyLine.tenThuocSnapshot}
                                </>
                            ) : (
                                "6 kỳ gần nhất của thuốc được chọn."
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="min-h-0 overflow-auto">
                        {isHistoryLoading ? (
                            <div className="rounded-md border p-8 text-center text-sm text-gray-500">
                                Đang tải lịch sử XNT...
                            </div>
                        ) : (
                            <XntHistoryGroupedTable history={historyItems} />
                        )}
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsHistoryOpen(false)}
                        >
                            Đóng
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isCatalogOpen} onOpenChange={setIsCatalogOpen}>
                <DialogContent className="left-0 top-0 h-[100dvh] max-h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 grid-rows-[auto_auto_auto_minmax(0,1fr)_auto] overflow-hidden rounded-none border-0 p-6 sm:max-w-none">
                    <DialogHeader>
                        <DialogTitle>
                            {catalogMode === "create" ? "Tạo dự trù" : "Thêm thuốc vào dự trù"}
                        </DialogTitle>
                        <DialogDescription>
                            Chọn thuốc từ danh mục ánh xạ đã duyệt của đơn vị.
                        </DialogDescription>
                    </DialogHeader>

                    <div
                        className={`grid gap-3 ${
                            catalogMode === "create"
                                ? "md:grid-cols-[220px_minmax(360px,1fr)_180px]"
                                : "md:grid-cols-[220px_minmax(360px,1fr)]"
                        }`}
                    >
                        <div className="space-y-2">
                            <Label>Tháng gốc XNT</Label>
                            <Select value={catalogMonth} onValueChange={handleCatalogMonthChange}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={NONE_VALUE}>Không chọn</SelectItem>
                                    {reportMonths.map((month) => (
                                        <SelectItem key={month} value={month}>
                                            {month}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="relative space-y-2">
                            <Label>Tên Công ty</Label>
                            <Input
                                value={catalogCompanySearch}
                                onChange={(event) => {
                                    setCatalogCompanySearch(event.target.value);
                                    setIsCompanyPickerOpen(true);
                                }}
                                onFocus={() => setIsCompanyPickerOpen(true)}
                                onBlur={handleCatalogCompanyBlur}
                                placeholder="Gõ tên công ty để tìm..."
                                autoComplete="off"
                            />
                            {isCompanyPickerOpen ? (
                                <div className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-white py-1 text-sm shadow-lg">
                                    <button
                                        type="button"
                                        className={`block w-full px-3 py-2 text-left hover:bg-blue-50 ${
                                            catalogCompanyName === ALL_COMPANIES_VALUE
                                                ? "bg-blue-50 font-medium text-blue-700"
                                                : "text-gray-700"
                                        }`}
                                        onMouseDown={(event) => event.preventDefault()}
                                        onClick={() => handleCatalogCompanyChange(ALL_COMPANIES_VALUE)}
                                    >
                                        {ALL_COMPANIES_LABEL}
                                    </button>
                                    {filteredCatalogCompanyOptions.map((companyName) => (
                                        <button
                                            key={companyName}
                                            type="button"
                                            className={`block w-full px-3 py-2 text-left hover:bg-blue-50 ${
                                                catalogCompanyName === companyName
                                                    ? "bg-blue-50 font-medium text-blue-700"
                                                    : "text-gray-700"
                                            }`}
                                            onMouseDown={(event) => event.preventDefault()}
                                            onClick={() => handleCatalogCompanyChange(companyName)}
                                        >
                                            {companyName}
                                        </button>
                                    ))}
                                    {filteredCatalogCompanyOptions.length === 0 ? (
                                        <div className="px-3 py-2 text-gray-500">
                                            Không có công ty phù hợp
                                        </div>
                                    ) : null}
                                </div>
                            ) : null}
                        </div>
                        {catalogMode === "create" ? (
                            <div className="space-y-2">
                                <Label>Ghi chú</Label>
                                <Input
                                    value={catalogNote}
                                    onChange={(event) => setCatalogNote(event.target.value)}
                                />
                            </div>
                        ) : null}
                    </div>

                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="relative md:w-96">
                            <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-gray-400" />
                            <Input
                                value={catalogSearch}
                                onChange={(event) => setCatalogSearch(event.target.value)}
                                placeholder="Tìm mã, tên thuốc, hoạt chất..."
                                className="pl-9"
                            />
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="gap-2">
                                        {catalogExportMonths.length > 0
                                            ? `Xuất: ${catalogExportMonths.length} kỳ`
                                            : "Chưa chọn kỳ xuất"}
                                        <ChevronDown className="size-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="max-h-80 w-56">
                                    <DropdownMenuLabel>Kỳ xuất hiển thị</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {reportMonths.map((month) => {
                                        const checked = catalogExportMonths.includes(month);
                                        const disabled =
                                            !checked &&
                                            catalogExportMonths.length >= MAX_EXPORT_HISTORY_MONTH_COUNT;

                                        return (
                                            <DropdownMenuCheckboxItem
                                                key={month}
                                                checked={checked}
                                                disabled={disabled}
                                                onCheckedChange={(nextChecked) =>
                                                    handleCatalogExportMonthToggle(month, Boolean(nextChecked))
                                                }
                                                onSelect={(event) => event.preventDefault()}
                                            >
                                                {month}
                                            </DropdownMenuCheckboxItem>
                                        );
                                    })}
                                    {reportMonths.length === 0 ? (
                                        <div className="px-2 py-1.5 text-sm text-gray-500">
                                            Chưa có kỳ báo cáo
                                        </div>
                                    ) : null}
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <span>Đã chọn {selectedCatalogIds.length} thuốc</span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={toggleVisibleCatalogItems}
                                disabled={filteredCatalogItems.length === 0}
                            >
                                Chọn/Bỏ chọn trang này
                            </Button>
                        </div>
                    </div>

                    <div className="min-h-0 overflow-hidden rounded-md border [&_[data-slot=table-container]]:h-full [&_[data-slot=table-container]]:overflow-auto">
                        <TooltipProvider>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className={`${CATALOG_STICKY_HEAD_CLASS} w-[64px] text-center`}>STT</TableHead>
                                    <TableHead className={`${CATALOG_STICKY_HEAD_CLASS} w-[54px]`}>Chọn</TableHead>
                                    <TableHead className={CATALOG_STICKY_HEAD_CLASS}>Mã nội bộ</TableHead>
                                    <TableHead className={`${CATALOG_STICKY_HEAD_CLASS} w-[220px] min-w-[200px] max-w-[220px]`}>Tên thuốc</TableHead>
                                    <TableHead className={`${CATALOG_STICKY_HEAD_CLASS} w-[220px] min-w-[200px] max-w-[220px]`}>Hoạt chất</TableHead>
                                    <TableHead className={`${CATALOG_STICKY_HEAD_CLASS} w-[220px] min-w-[200px] max-w-[220px]`}>Hàm lượng</TableHead>
                                    <TableHead className={CATALOG_STICKY_HEAD_CLASS}>Số đăng ký</TableHead>
                                    <TableHead className={CATALOG_STICKY_HEAD_CLASS}>Dạng bào chế</TableHead>
                                    <TableHead className={CATALOG_STICKY_HEAD_CLASS}>Đơn vị tính</TableHead>
                                    <TableHead className={CATALOG_STICKY_HEAD_CLASS}>Đơn giá</TableHead>
                                    <TableHead className={CATALOG_STICKY_HEAD_CLASS}>Nhóm</TableHead>
                                    {catalogExportMonths.map((month) => (
                                        <TableHead
                                            key={month}
                                            className={`${CATALOG_STICKY_HEAD_CLASS} text-right whitespace-nowrap`}
                                        >
                                            Xuất {month}
                                        </TableHead>
                                    ))}
                                    <TableHead className={CATALOG_STICKY_HEAD_CLASS}>Gợi ý</TableHead>
                                    <TableHead className={CATALOG_STICKY_HEAD_CLASS}>Quy cách dự trù</TableHead>
                                    <TableHead className={CATALOG_STICKY_HEAD_CLASS}>Thuốc chuẩn</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isCatalogLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={14 + catalogExportMonths.length} className="h-24 text-center">
                                            Đang tải danh mục...
                                        </TableCell>
                                    </TableRow>
                                ) : null}
                                {!isCatalogLoading && filteredCatalogItems.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={14 + catalogExportMonths.length} className="h-24 text-center text-sm text-gray-500">
                                            Không có thuốc phù hợp.
                                        </TableCell>
                                    </TableRow>
                                ) : null}
                                {filteredCatalogItems.map((item, index) => (
                                    <TableRow
                                        key={item.id}
                                        className={selectedCatalogIds.includes(item.id) ? "bg-blue-50" : ""}
                                        onClick={() => toggleCatalogItem(item.id)}
                                    >
                                        <TableCell className="text-center text-sm text-gray-500">
                                            {index + 1}
                                        </TableCell>
                                        <TableCell>
                                            <input
                                                type="checkbox"
                                                checked={selectedCatalogIds.includes(item.id)}
                                                onChange={() => toggleCatalogItem(item.id)}
                                                onClick={(event) => event.stopPropagation()}
                                                className="size-4"
                                            />
                                        </TableCell>
                                        <TableCell className="font-medium">{item.maNoiBo}</TableCell>
                                        <TableCell className="w-[220px] max-w-[220px]">
                                            <TruncatedTooltipText
                                                value={item.tenThuocNoiBo}
                                                textClassName="font-medium"
                                            />
                                            <TruncatedTooltipText
                                                value={item.masterDrug?.tenThuoc}
                                                textClassName="text-xs text-gray-500"
                                            />
                                        </TableCell>
                                        <TableCell className="w-[220px] max-w-[220px]">
                                            <TruncatedTooltipText
                                                value={item.hoatChatNoiBo || item.masterDrug?.hoatChat}
                                            />
                                        </TableCell>
                                        <TableCell className="w-[220px] max-w-[220px]">
                                            <TruncatedTooltipText value={item.masterDrug?.hamLuong} />
                                        </TableCell>
                                        <TableCell>{item.soDangKyNoiBo || item.masterDrug?.soDangKy || "-"}</TableCell>
                                        <TableCell>{item.masterDrug?.dangBaoChe || "-"}</TableCell>
                                        <TableCell>{item.donViTinhNoiBo || item.masterDrug?.donViTinh || "-"}</TableCell>
                                        <TableCell>{formatCurrency(item.giaVat)}</TableCell>
                                        <TableCell>{item.nhomTckt || "-"}</TableCell>
                                        {catalogExportMonths.map((month) => (
                                            <TableCell
                                                key={`${item.id}-${month}`}
                                                className="text-right tabular-nums"
                                            >
                                                {formatQty(item.exportHistory?.[month])}
                                            </TableCell>
                                        ))}
                                        <TableCell>
                                            <SuggestedQtySummary
                                                suggestedQty={item.suggestedQty}
                                                rawSuggestedQty={item.rawSuggestedQty}
                                                roundedSuggestedQty={item.roundedSuggestedQty}
                                                packageUnit={item.packageUnit}
                                                packageSize={item.packageSize}
                                                roundingNote={item.roundingNote}
                                                suggestionReportMonth={item.suggestionReportMonth}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <div
                                                className="text-sm"
                                                title={item.roundingNote || undefined}
                                            >
                                                {formatPackageRule(item.packageUnit, item.packageSize)}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div>{item.masterDrug?.maChung || "-"}</div>
                                            <div className="text-xs text-gray-500">
                                                {item.masterDrug?.tenThuoc || "-"}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        </TooltipProvider>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsCatalogOpen(false)}
                            disabled={isCreating}
                        >
                            Hủy
                        </Button>
                        <Button
                            onClick={() =>
                                catalogMode === "create"
                                    ? void createPlanFromCatalog()
                                    : appendCatalogToDraft()
                            }
                            disabled={selectedCatalogIds.length === 0 || isCreating}
                        >
                            {catalogMode === "create" ? (
                                <>
                                    <FileText className="mr-2 size-4" />
                                    Tạo dự trù
                                </>
                            ) : (
                                <>
                                    <Plus className="mr-2 size-4" />
                                    Thêm vào dự trù
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
