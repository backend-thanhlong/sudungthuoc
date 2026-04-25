"use client";

import { useEffect, useRef, useState } from "react";
import { Building2, Check, Loader2, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type CatalogDialogMode = "create" | "append";

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

type SuggestionStatus =
    | "OFFICIAL"
    | "PROVISIONAL"
    | "UNLINKED"
    | "INSUFFICIENT_DATA";

interface SuggestedCompanyDrugOption {
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
    recommendedQty: number | null;
    xntBaseQty: number | null;
    incomingAcceptedQty: number;
    monthsOfCover: number | null;
    status: SuggestionStatus;
    statusLabel: string;
    suggestionReportMonth: string | null;
    basisLines: string[];
}

interface FacilityDrugOrderCatalogDialogProps {
    open: boolean;
    mode: CatalogDialogMode;
    noneValue: string;
    companies: CompanyOption[];
    reportMonths: ReportMonthOption[];
    companyId: string;
    baseReportMonth: string;
    note: string;
    items: CompanyDrugOption[];
    suggestedItems: SuggestedCompanyDrugOption[];
    search: string;
    linkedOnly: boolean;
    showAllSuggested: boolean;
    suggestionEffectiveMonth: string | null;
    selectedIds: string[];
    existingCompanyDrugIds: string[];
    existingMasterDrugIds: string[];
    isLoading: boolean;
    suggestionsLoading: boolean;
    isSubmitting: boolean;
    suggestionsError: string | null;
    onOpenChange: (open: boolean) => void;
    onCompanyChange: (companyId: string) => void;
    onBaseReportMonthChange: (value: string) => void;
    onNoteChange: (value: string) => void;
    onSearchChange: (value: string) => void;
    onLinkedOnlyChange: (checked: boolean) => void;
    onShowAllSuggestedChange: (checked: boolean) => void;
    onToggleSelect: (drugId: string) => void;
    onSetVisibleSelection: (visibleIds: string[], shouldSelect: boolean) => void;
    onClearSelection: () => void;
    onSubmit: () => void;
}

function isLinkedDrug(item: CompanyDrugOption) {
    return Boolean(item.masterDrugId && item.masterDrug);
}

function resolveMasterDrugId(
    item:
        | Pick<CompanyDrugOption, "masterDrugId" | "masterDrug">
        | Pick<SuggestedCompanyDrugOption, "masterDrugId" | "masterDrug">
        | null
) {
    if (!item) {
        return null;
    }

    return item.masterDrug?.id || item.masterDrugId || null;
}

function formatQuantity(value: number | null | undefined) {
    if (value === null || value === undefined) {
        return "—";
    }

    return new Intl.NumberFormat("vi-VN", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(value);
}

function buildSuggestionReason(item: SuggestedCompanyDrugOption) {
    const reasonLines = item.basisLines.filter(
        (line) =>
            line.startsWith("Xuất BQ") ||
            line.startsWith("Tồn cuối") ||
            line.startsWith("Đang về")
    );

    return (reasonLines.length > 0 ? reasonLines : item.basisLines)
        .slice(0, 3)
        .join(" | ");
}

function matchesCatalogSearch(
    normalizedSearch: string,
    item: {
        companyDrugCode: string;
        companyDrugName: string;
        activeIngredient: string | null;
        quyCach: string | null;
        masterDrugId: string | null;
        masterDrug: MasterDrugOption | null;
    }
) {
    if (!normalizedSearch) {
        return true;
    }

    return [
        item.companyDrugCode,
        item.companyDrugName,
        item.activeIngredient,
        item.quyCach,
        item.masterDrug?.maChung,
        item.masterDrug?.tenThuoc,
        item.masterDrug?.soDangKy,
    ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch));
}

const SUGGESTION_STATUS_BADGE_CLASS: Record<SuggestionStatus, string> = {
    OFFICIAL: "border-emerald-300 text-emerald-700",
    PROVISIONAL: "border-amber-300 text-amber-700",
    UNLINKED: "border-amber-300 text-amber-700",
    INSUFFICIENT_DATA: "border-slate-300 text-slate-700",
};

export default function FacilityDrugOrderCatalogDialog(
    props: FacilityDrugOrderCatalogDialogProps
) {
    const suggestedHeaderCheckboxRef = useRef<HTMLInputElement | null>(null);
    const catalogHeaderCheckboxRef = useRef<HTMLInputElement | null>(null);
    const [activeTab, setActiveTab] = useState<"suggested" | "catalog">("suggested");

    const normalizedSearch = props.search.trim().toLowerCase();
    const filteredItems = props.items.filter((item) => {
        if (props.linkedOnly && !isLinkedDrug(item)) {
            return false;
        }

        return matchesCatalogSearch(normalizedSearch, item);
    });
    const filteredSuggestedItems = props.suggestedItems.filter((item) =>
        matchesCatalogSearch(normalizedSearch, item)
    );

    const existingCompanyDrugIdSet = new Set(props.existingCompanyDrugIds);
    const existingMasterDrugIdSet = new Set(props.existingMasterDrugIds);
    const masterDrugIdByCompanyDrugId = new Map<string, string | null>();
    props.items.forEach((item) => {
        masterDrugIdByCompanyDrugId.set(item.id, resolveMasterDrugId(item));
    });
    props.suggestedItems.forEach((item) => {
        if (!masterDrugIdByCompanyDrugId.has(item.companyDrugId)) {
            masterDrugIdByCompanyDrugId.set(
                item.companyDrugId,
                resolveMasterDrugId(item)
            );
        }
    });
    const selectedIdSet = new Set(props.selectedIds);
    const selectedMasterDrugIdSet = new Set(
        props.selectedIds
            .map((id) => masterDrugIdByCompanyDrugId.get(id) || null)
            .filter((value): value is string => Boolean(value))
    );
    const selectableCatalogIds = filteredItems
        .filter((item) => {
            const masterDrugId = resolveMasterDrugId(item);
            return (
                !existingCompanyDrugIdSet.has(item.id) &&
                (!masterDrugId || !existingMasterDrugIdSet.has(masterDrugId)) &&
                (!masterDrugId ||
                    !selectedMasterDrugIdSet.has(masterDrugId) ||
                    selectedIdSet.has(item.id))
            );
        })
        .map((item) => item.id);
    const selectableSuggestedIds = filteredSuggestedItems
        .filter((item) => {
            const masterDrugId = resolveMasterDrugId(item);
            return (
                !existingCompanyDrugIdSet.has(item.companyDrugId) &&
                (!masterDrugId || !existingMasterDrugIdSet.has(masterDrugId)) &&
                (!masterDrugId ||
                    !selectedMasterDrugIdSet.has(masterDrugId) ||
                    selectedIdSet.has(item.companyDrugId))
            );
        })
        .map((item) => item.companyDrugId);
    const selectableVisibleIds =
        activeTab === "suggested" ? selectableSuggestedIds : selectableCatalogIds;
    const selectedVisibleCount = selectableVisibleIds.filter((id) => selectedIdSet.has(id)).length;
    const allVisibleSelected =
        selectableVisibleIds.length > 0 &&
        selectedVisibleCount === selectableVisibleIds.length;
    const someVisibleSelected =
        selectedVisibleCount > 0 && selectedVisibleCount < selectableVisibleIds.length;
    const selectedCount = props.selectedIds.length;
    const selectedCompany = props.companies.find((company) => company.id === props.companyId) || null;

    useEffect(() => {
        const activeHeaderCheckbox =
            activeTab === "suggested"
                ? suggestedHeaderCheckboxRef.current
                : catalogHeaderCheckboxRef.current;

        if (!activeHeaderCheckbox) {
            return;
        }

        activeHeaderCheckbox.indeterminate = someVisibleSelected;
    }, [activeTab, someVisibleSelected]);

    useEffect(() => {
        if (!props.open) {
            return;
        }

        setActiveTab(props.companyId ? "suggested" : "catalog");
    }, [props.open, props.companyId, props.mode]);

    return (
        <Dialog open={props.open} onOpenChange={props.onOpenChange}>
            <DialogContent className="!top-0 !left-0 !h-[100dvh] !w-screen !max-w-none !translate-x-0 !translate-y-0 !rounded-none !border-0 !p-0 !shadow-none flex flex-col gap-0 overflow-hidden sm:!max-w-none">
                <div className="flex h-full min-h-0 flex-col bg-white">
                    <DialogHeader className="shrink-0 border-b border-slate-200 px-4 py-4 pr-14 text-left xl:px-6 xl:py-5 xl:pr-16">
                        <DialogTitle>
                            {props.mode === "create"
                                ? "Tạo dự trù đặt hàng"
                                : "Thêm thuốc vào dự trù"}
                        </DialogTitle>
                        <DialogDescription>
                            {props.mode === "create"
                                ? "Chọn công ty, tháng gốc XNT và một hoặc nhiều thuốc từ danh mục công ty để thêm vào dự trù nháp."
                                : "Chọn thêm một hoặc nhiều thuốc từ danh mục công ty để bổ sung vào dự trù đang mở."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-3 py-3 xl:gap-5 xl:overflow-hidden xl:px-6 xl:py-5">
                        {props.mode === "create" ? (
                            <div className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 xl:px-4 xl:py-4">
                                <div className="grid gap-4 xl:grid-cols-[280px_240px_minmax(0,1fr)]">
                                    <div className="space-y-2">
                                        <Label>Công ty cung ứng</Label>
                                        <Select
                                            value={props.companyId}
                                            onValueChange={props.onCompanyChange}
                                        >
                                            <SelectTrigger className="w-full bg-white">
                                                <SelectValue placeholder="Chọn công ty" />
                                            </SelectTrigger>
                                            <SelectContent className="z-[70] max-h-[60dvh]">
                                                {props.companies.map((company) => (
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
                                            value={props.baseReportMonth}
                                            onValueChange={props.onBaseReportMonthChange}
                                        >
                                            <SelectTrigger className="w-full bg-white">
                                                <SelectValue placeholder="Không chọn" />
                                            </SelectTrigger>
                                            <SelectContent className="z-[70] max-h-[60dvh]">
                                                <SelectItem value={props.noneValue}>Không chọn</SelectItem>
                                                {props.reportMonths.map((month) => (
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
                                            value={props.note}
                                            onChange={(event) => props.onNoteChange(event.target.value)}
                                            placeholder="Ghi chú nội bộ nếu cần"
                                            className="min-h-24 bg-white"
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 xl:px-4">
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                    <div className="space-y-1">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                            Công ty cung ứng
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <Building2 className="h-4 w-4 text-emerald-600" />
                                            <span className="font-medium text-slate-900">
                                                {selectedCompany?.name || "—"}
                                            </span>
                                            {selectedCompany?.code ? (
                                                <span className="text-sm text-slate-500">
                                                    ({selectedCompany.code})
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-500">
                                        Chọn thêm thuốc để bổ sung vào dự trù đang mở.
                                    </p>
                                </div>
                            </div>
                        )}

                        <Tabs
                            value={activeTab}
                            onValueChange={(value) =>
                                setActiveTab(value as "suggested" | "catalog")
                            }
                            className="flex min-h-0 flex-none overflow-visible rounded-xl border border-slate-200 bg-white shadow-sm xl:flex-1 xl:overflow-hidden"
                        >
                            <div className="shrink-0 flex flex-col gap-3 border-b border-slate-200 px-3 py-3 xl:px-4 xl:py-4">
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                    <div>
                                        <h3 className="font-semibold text-slate-900">
                                            {activeTab === "suggested"
                                                ? "Gợi ý nên thêm"
                                                : "Danh mục công ty"}
                                        </h3>
                                        <p className="text-sm text-slate-500">
                                            {activeTab === "suggested"
                                                ? props.companyId
                                                    ? `Ưu tiên thuốc thiếu hụt theo gợi ý hiện tại.${props.suggestionEffectiveMonth ? ` Tham chiếu XNT: ${props.suggestionEffectiveMonth}.` : ""}`
                                                    : "Chọn công ty để xem danh sách gợi ý."
                                                : props.companyId
                                                    ? "Chọn một hoặc nhiều thuốc để thêm vào dự trù."
                                                    : "Chọn công ty để tải danh mục thuốc."}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 text-sm">
                                        <span className="rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-700">
                                            Đã chọn: {selectedCount} thuốc
                                        </span>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={props.onClearSelection}
                                            disabled={selectedCount === 0}
                                        >
                                            Bỏ chọn tất cả
                                        </Button>
                                    </div>
                                </div>

                                <TabsList variant="line" className="w-full overflow-x-auto justify-start xl:w-fit">
                                    <TabsTrigger value="suggested">Gợi ý nên thêm</TabsTrigger>
                                    <TabsTrigger value="catalog">Danh mục công ty</TabsTrigger>
                                </TabsList>
                            </div>

                            <div className="flex min-h-0 flex-col gap-3 px-3 py-3 xl:flex-1 xl:gap-4 xl:px-4 xl:py-4">
                                <div className="shrink-0 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                    <div className="relative w-full xl:max-w-xl">
                                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                        <Input
                                            value={props.search}
                                            onChange={(event) => props.onSearchChange(event.target.value)}
                                            placeholder="Tìm theo mã thuốc công ty, tên thuốc, hoạt chất, mã chuẩn, tên thuốc chuẩn"
                                            className="pl-9"
                                        />
                                    </div>

                                    {activeTab === "catalog" ? (
                                        <label className="flex items-center gap-2 text-sm text-slate-600">
                                            <input
                                                type="checkbox"
                                                checked={props.linkedOnly}
                                                onChange={(event) =>
                                                    props.onLinkedOnlyChange(event.target.checked)
                                                }
                                                className="h-4 w-4 rounded border-slate-300 text-blue-600"
                                            />
                                            Chỉ hiện thuốc đã liên kết thuốc chuẩn
                                        </label>
                                    ) : (
                                        <label className="flex items-center gap-2 text-sm text-slate-600">
                                            <input
                                                type="checkbox"
                                                checked={props.showAllSuggested}
                                                onChange={(event) =>
                                                    props.onShowAllSuggestedChange(
                                                        event.target.checked
                                                    )
                                                }
                                                className="h-4 w-4 rounded border-slate-300 text-blue-600"
                                            />
                                            Hiện cả thuốc có dữ liệu XNT
                                        </label>
                                    )}
                                </div>

                                <TabsContent value="suggested" className="min-h-0 xl:flex-1">
                                    <div className="min-h-0 rounded-xl border border-slate-200 xl:h-full xl:overflow-auto">
                                        {props.suggestionsLoading ? (
                                            <div className="flex items-center gap-2 p-4 text-sm text-slate-500">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Đang tải gợi ý thuốc nên thêm...
                                            </div>
                                        ) : !props.companyId ? (
                                            <div className="p-4 text-sm text-slate-500">
                                                Vui lòng chọn công ty cung ứng.
                                            </div>
                                        ) : props.suggestionsError ? (
                                            <div className="p-4 text-sm text-amber-800">
                                                Không tải được gợi ý. Bạn vẫn có thể chuyển sang tab danh mục công ty để chọn thủ công.
                                            </div>
                                        ) : props.suggestedItems.length === 0 ? (
                                            <div className="p-4 text-sm text-slate-500">
                                                {props.showAllSuggested
                                                    ? "Hiện chưa có thuốc nào có dữ liệu XNT để hiển thị."
                                                    : "Hiện chưa có thuốc nào được đề xuất thêm."}
                                            </div>
                                        ) : filteredSuggestedItems.length === 0 ? (
                                            <div className="p-4 text-sm text-slate-500">
                                                Không tìm thấy thuốc phù hợp với từ khóa.
                                            </div>
                                        ) : (
                                            <>
                                                <div className="hidden xl:block">
                                                    <Table className="min-w-[1320px]">
                                                        <TableHeader>
                                                    <TableRow className="border-slate-200 bg-slate-50">
                                                        <TableHead className="sticky left-0 top-0 z-30 w-12 bg-slate-50">
                                                            <input
                                                                ref={suggestedHeaderCheckboxRef}
                                                                type="checkbox"
                                                                checked={allVisibleSelected}
                                                                onChange={(event) =>
                                                                    props.onSetVisibleSelection(
                                                                        selectableVisibleIds,
                                                                        event.target.checked
                                                                    )
                                                                }
                                                                disabled={
                                                                    selectableVisibleIds.length ===
                                                                    0
                                                                }
                                                                className="h-4 w-4 rounded border-slate-300 text-blue-600"
                                                            />
                                                        </TableHead>
                                                        <TableHead className="sticky left-12 top-0 z-20 min-w-[140px] bg-slate-50">
                                                            Mã thuốc công ty
                                                        </TableHead>
                                                        <TableHead className="sticky top-0 z-20 min-w-[260px] bg-slate-50">
                                                            Tên thuốc
                                                        </TableHead>
                                                        <TableHead className="sticky top-0 z-20 min-w-[220px] bg-slate-50">
                                                            Thuốc chuẩn liên kết
                                                        </TableHead>
                                                        <TableHead className="sticky top-0 z-20 bg-slate-50 text-right">
                                                            Gợi ý
                                                        </TableHead>
                                                        <TableHead className="sticky top-0 z-20 bg-slate-50">
                                                            Độ phủ
                                                        </TableHead>
                                                        <TableHead className="sticky top-0 z-20 min-w-[360px] bg-slate-50">
                                                            Lý do
                                                        </TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {filteredSuggestedItems.map((item) => {
                                                        const isExisting =
                                                            existingCompanyDrugIdSet.has(
                                                                item.companyDrugId
                                                            );
                                                        const masterDrugId =
                                                            resolveMasterDrugId(item);
                                                        const isExistingMaster =
                                                            Boolean(
                                                                masterDrugId &&
                                                                    existingMasterDrugIdSet.has(
                                                                        masterDrugId
                                                                    )
                                                            );
                                                        const isSelected =
                                                            selectedIdSet.has(item.companyDrugId);
                                                        const isSelectedMasterConflict =
                                                            Boolean(
                                                                masterDrugId &&
                                                                    selectedMasterDrugIdSet.has(
                                                                        masterDrugId
                                                                    ) &&
                                                                    !isSelected
                                                            );
                                                        const isUnavailable =
                                                            isExisting ||
                                                            isExistingMaster ||
                                                            isSelectedMasterConflict;

                                                        return (
                                                            <TableRow
                                                                key={item.companyDrugId}
                                                                data-state={
                                                                    isSelected
                                                                        ? "selected"
                                                                        : undefined
                                                                }
                                                                className={cn(
                                                                    "cursor-pointer border-slate-200",
                                                                    isUnavailable &&
                                                                        "cursor-not-allowed opacity-60",
                                                                    isSelected && "bg-blue-50"
                                                                )}
                                                                onClick={() => {
                                                                    if (isUnavailable) {
                                                                        return;
                                                                    }

                                                                    props.onToggleSelect(
                                                                        item.companyDrugId
                                                                    );
                                                                }}
                                                            >
                                                                <TableCell
                                                                    className={cn(
                                                                        "sticky left-0 z-10 w-12",
                                                                        isSelected
                                                                            ? "bg-blue-50"
                                                                            : "bg-white"
                                                                    )}
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isSelected}
                                                                        disabled={isUnavailable}
                                                                        onClick={(event) =>
                                                                            event.stopPropagation()
                                                                        }
                                                                        onChange={() =>
                                                                            props.onToggleSelect(
                                                                                item.companyDrugId
                                                                            )
                                                                        }
                                                                        className="h-4 w-4 rounded border-slate-300 text-blue-600"
                                                                    />
                                                                </TableCell>
                                                                <TableCell
                                                                    className={cn(
                                                                        "sticky left-12 z-10 font-medium",
                                                                        isSelected
                                                                            ? "bg-blue-50"
                                                                            : "bg-white"
                                                                    )}
                                                                >
                                                                    {item.companyDrugCode}
                                                                </TableCell>
                                                                <TableCell className="min-w-[260px] whitespace-normal">
                                                                    <div className="space-y-2">
                                                                        <p className="font-medium text-slate-900">
                                                                            {item.companyDrugName}
                                                                        </p>
                                                                        <div className="flex flex-wrap gap-2">
                                                                            <Badge
                                                                                variant="outline"
                                                                                className={
                                                                                    SUGGESTION_STATUS_BADGE_CLASS[
                                                                                        item.status
                                                                                    ]
                                                                                }
                                                                            >
                                                                                {item.statusLabel}
                                                                            </Badge>
                                                                            {isExisting ? (
                                                                                <Badge variant="secondary">
                                                                                    Đã có trong dự trù
                                                                                </Badge>
                                                                            ) : null}
                                                                            {isExistingMaster ? (
                                                                                <Badge variant="secondary">
                                                                                    Trùng thuốc chuẩn trong dự trù
                                                                                </Badge>
                                                                            ) : null}
                                                                            {isSelectedMasterConflict ? (
                                                                                <Badge variant="secondary">
                                                                                    Đã chọn thuốc cùng thuốc chuẩn
                                                                                </Badge>
                                                                            ) : null}
                                                                        </div>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="whitespace-normal">
                                                                    {item.masterDrug ? (
                                                                        <div>
                                                                            <p className="font-medium text-slate-900">
                                                                                {item.masterDrug.maChung}
                                                                            </p>
                                                                            <p className="text-xs text-slate-500">
                                                                                {item.masterDrug.tenThuoc}
                                                                            </p>
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-amber-700">
                                                                            Chưa liên kết
                                                                        </span>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="text-right font-medium text-slate-900">
                                                                    {formatQuantity(
                                                                        item.recommendedQty
                                                                    )}
                                                                </TableCell>
                                                                <TableCell>
                                                                    {item.monthsOfCover !== null
                                                                        ? `${formatQuantity(item.monthsOfCover)} tháng`
                                                                        : "—"}
                                                                </TableCell>
                                                                <TableCell className="whitespace-normal text-sm text-slate-600">
                                                                    {buildSuggestionReason(item) ||
                                                                        "—"}
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                        </TableBody>
                                                    </Table>
                                                </div>

                                                <div className="space-y-3 p-3 xl:hidden">
                                                    {filteredSuggestedItems.map((item) => {
                                                        const isExisting =
                                                            existingCompanyDrugIdSet.has(
                                                                item.companyDrugId
                                                            );
                                                        const masterDrugId =
                                                            resolveMasterDrugId(item);
                                                        const isExistingMaster =
                                                            Boolean(
                                                                masterDrugId &&
                                                                    existingMasterDrugIdSet.has(
                                                                        masterDrugId
                                                                    )
                                                            );
                                                        const isSelected =
                                                            selectedIdSet.has(item.companyDrugId);
                                                        const isSelectedMasterConflict =
                                                            Boolean(
                                                                masterDrugId &&
                                                                    selectedMasterDrugIdSet.has(
                                                                        masterDrugId
                                                                    ) &&
                                                                    !isSelected
                                                            );
                                                        const isUnavailable =
                                                            isExisting ||
                                                            isExistingMaster ||
                                                            isSelectedMasterConflict;
                                                        const reason =
                                                            buildSuggestionReason(item);

                                                        return (
                                                            <button
                                                                key={item.companyDrugId}
                                                                type="button"
                                                                disabled={isUnavailable}
                                                                aria-pressed={isSelected}
                                                                onClick={() =>
                                                                    props.onToggleSelect(
                                                                        item.companyDrugId
                                                                    )
                                                                }
                                                                className={cn(
                                                                    "w-full rounded-xl border p-4 text-left shadow-sm transition",
                                                                    isSelected
                                                                        ? "border-blue-400 bg-blue-50"
                                                                        : "border-slate-200 bg-white hover:border-slate-300",
                                                                    isUnavailable &&
                                                                        "cursor-not-allowed opacity-65 hover:border-slate-200"
                                                                )}
                                                            >
                                                                <div className="flex items-start gap-3">
                                                                    <span
                                                                        className={cn(
                                                                            "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border",
                                                                            isSelected
                                                                                ? "border-blue-600 bg-blue-600 text-white"
                                                                                : "border-slate-300 bg-white text-transparent"
                                                                        )}
                                                                        aria-hidden="true"
                                                                    >
                                                                        <Check className="h-4 w-4" />
                                                                    </span>
                                                                    <div className="min-w-0 flex-1 space-y-3">
                                                                        <div className="space-y-1">
                                                                            <div className="flex flex-wrap items-center gap-2">
                                                                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                                                                                    {item.companyDrugCode}
                                                                                </span>
                                                                                <Badge
                                                                                    variant="outline"
                                                                                    className={
                                                                                        SUGGESTION_STATUS_BADGE_CLASS[
                                                                                            item.status
                                                                                        ]
                                                                                    }
                                                                                >
                                                                                    {item.statusLabel}
                                                                                </Badge>
                                                                            </div>
                                                                            <p className="break-words font-semibold text-slate-900">
                                                                                {item.companyDrugName}
                                                                            </p>
                                                                            <p className="text-sm text-slate-500">
                                                                                {item.activeIngredient || "Chưa có hoạt chất"} · Đơn vị:{" "}
                                                                                {item.unit || item.masterDrug?.donViTinh || "—"}
                                                                            </p>
                                                                        </div>

                                                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                                                            <div className="rounded-lg bg-slate-50 px-3 py-2">
                                                                                <p className="text-[11px] font-medium uppercase text-slate-500">
                                                                                    Gợi ý
                                                                                </p>
                                                                                <p className="mt-1 font-semibold text-slate-900">
                                                                                    {formatQuantity(item.recommendedQty)}
                                                                                </p>
                                                                            </div>
                                                                            <div className="rounded-lg bg-slate-50 px-3 py-2">
                                                                                <p className="text-[11px] font-medium uppercase text-slate-500">
                                                                                    Độ phủ
                                                                                </p>
                                                                                <p className="mt-1 font-semibold text-slate-900">
                                                                                    {item.monthsOfCover !== null
                                                                                        ? `${formatQuantity(item.monthsOfCover)} tháng`
                                                                                        : "—"}
                                                                                </p>
                                                                            </div>
                                                                        </div>

                                                                        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                                                                            <p className="text-[11px] font-medium uppercase text-slate-500">
                                                                                Thuốc chuẩn
                                                                            </p>
                                                                            {item.masterDrug ? (
                                                                                <div className="mt-1">
                                                                                    <p className="font-medium text-slate-900">
                                                                                        {item.masterDrug.maChung}
                                                                                    </p>
                                                                                    <p className="text-xs text-slate-500">
                                                                                        {item.masterDrug.tenThuoc}
                                                                                    </p>
                                                                                </div>
                                                                            ) : (
                                                                                <p className="mt-1 text-amber-700">
                                                                                    Chưa liên kết
                                                                                </p>
                                                                            )}
                                                                        </div>

                                                                        {reason ? (
                                                                            <p className="text-sm text-slate-600">
                                                                                {reason}
                                                                            </p>
                                                                        ) : null}

                                                                        <div className="flex flex-wrap gap-2">
                                                                            {isExisting ? (
                                                                                <Badge variant="secondary">
                                                                                    Đã có trong dự trù
                                                                                </Badge>
                                                                            ) : null}
                                                                            {isExistingMaster ? (
                                                                                <Badge variant="secondary">
                                                                                    Trùng thuốc chuẩn trong dự trù
                                                                                </Badge>
                                                                            ) : null}
                                                                            {isSelectedMasterConflict ? (
                                                                                <Badge variant="secondary">
                                                                                    Đã chọn thuốc cùng thuốc chuẩn
                                                                                </Badge>
                                                                            ) : null}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </TabsContent>

                                <TabsContent value="catalog" className="min-h-0 xl:flex-1">
                                    <div className="min-h-0 rounded-xl border border-slate-200 xl:h-full xl:overflow-auto">
                                        {props.isLoading ? (
                                            <div className="flex items-center gap-2 p-4 text-sm text-slate-500">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Đang tải danh mục công ty...
                                            </div>
                                        ) : !props.companyId ? (
                                            <div className="p-4 text-sm text-slate-500">
                                                Vui lòng chọn công ty cung ứng.
                                            </div>
                                        ) : props.items.length === 0 ? (
                                            <div className="p-4 text-sm text-slate-500">
                                                Công ty này chưa có thuốc trong danh mục.
                                            </div>
                                        ) : filteredItems.length === 0 ? (
                                            <div className="p-4 text-sm text-slate-500">
                                                Không tìm thấy thuốc phù hợp với từ khóa.
                                            </div>
                                        ) : (
                                            <>
                                                <div className="hidden xl:block">
                                                    <Table className="min-w-[1560px]">
                                                        <TableHeader>
                                                    <TableRow className="border-slate-200 bg-slate-50">
                                                        <TableHead className="sticky left-0 top-0 z-30 w-12 bg-slate-50">
                                                            <input
                                                                ref={catalogHeaderCheckboxRef}
                                                                type="checkbox"
                                                                checked={allVisibleSelected}
                                                                onChange={(event) =>
                                                                    props.onSetVisibleSelection(
                                                                        selectableVisibleIds,
                                                                        event.target.checked
                                                                    )
                                                                }
                                                                disabled={
                                                                    selectableVisibleIds.length ===
                                                                    0
                                                                }
                                                                className="h-4 w-4 rounded border-slate-300 text-blue-600"
                                                            />
                                                        </TableHead>
                                                        <TableHead className="sticky left-12 top-0 z-20 min-w-[140px] bg-slate-50">
                                                            Mã thuốc công ty
                                                        </TableHead>
                                                        <TableHead className="sticky top-0 z-20 min-w-[260px] bg-slate-50">
                                                            Tên thuốc
                                                        </TableHead>
                                                        <TableHead className="sticky top-0 z-20 min-w-[180px] bg-slate-50">
                                                            Hoạt chất
                                                        </TableHead>
                                                        <TableHead className="sticky top-0 z-20 bg-slate-50">
                                                            Hàm lượng
                                                        </TableHead>
                                                        <TableHead className="sticky top-0 z-20 bg-slate-50">
                                                            Số đăng ký
                                                        </TableHead>
                                                        <TableHead className="sticky top-0 z-20 bg-slate-50">
                                                            Dạng bào chế
                                                        </TableHead>
                                                        <TableHead className="sticky top-0 z-20 min-w-[180px] bg-slate-50">
                                                            Quy cách
                                                        </TableHead>
                                                        <TableHead className="sticky top-0 z-20 min-w-[240px] bg-slate-50">
                                                            Thuốc chuẩn liên kết
                                                        </TableHead>
                                                        <TableHead className="sticky top-0 z-20 bg-slate-50">
                                                            Đơn vị
                                                        </TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {filteredItems.map((item) => {
                                                        const isExisting =
                                                            existingCompanyDrugIdSet.has(item.id);
                                                        const masterDrugId =
                                                            resolveMasterDrugId(item);
                                                        const isExistingMaster =
                                                            Boolean(
                                                                masterDrugId &&
                                                                    existingMasterDrugIdSet.has(
                                                                        masterDrugId
                                                                    )
                                                            );
                                                        const isSelected =
                                                            selectedIdSet.has(item.id);
                                                        const isSelectedMasterConflict =
                                                            Boolean(
                                                                masterDrugId &&
                                                                    selectedMasterDrugIdSet.has(
                                                                        masterDrugId
                                                                    ) &&
                                                                    !isSelected
                                                            );
                                                        const linked = isLinkedDrug(item);
                                                        const quyCach =
                                                            item.quyCach ||
                                                            item.masterDrug?.quyCach ||
                                                            "—";
                                                        const isUnavailable =
                                                            isExisting ||
                                                            isExistingMaster ||
                                                            isSelectedMasterConflict;

                                                        return (
                                                            <TableRow
                                                                key={item.id}
                                                                data-state={
                                                                    isSelected
                                                                        ? "selected"
                                                                        : undefined
                                                                }
                                                                className={cn(
                                                                    "cursor-pointer border-slate-200",
                                                                    isUnavailable &&
                                                                        "cursor-not-allowed opacity-60",
                                                                    isSelected && "bg-blue-50"
                                                                )}
                                                                onClick={() => {
                                                                    if (isUnavailable) {
                                                                        return;
                                                                    }

                                                                    props.onToggleSelect(item.id);
                                                                }}
                                                            >
                                                                <TableCell
                                                                    className={cn(
                                                                        "sticky left-0 z-10 w-12",
                                                                        isSelected
                                                                            ? "bg-blue-50"
                                                                            : "bg-white"
                                                                    )}
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isSelected}
                                                                        disabled={isUnavailable}
                                                                        onClick={(event) =>
                                                                            event.stopPropagation()
                                                                        }
                                                                        onChange={() =>
                                                                            props.onToggleSelect(
                                                                                item.id
                                                                            )
                                                                        }
                                                                        className="h-4 w-4 rounded border-slate-300 text-blue-600"
                                                                    />
                                                                </TableCell>
                                                                <TableCell
                                                                    className={cn(
                                                                        "sticky left-12 z-10 font-medium",
                                                                        isSelected
                                                                            ? "bg-blue-50"
                                                                            : "bg-white"
                                                                    )}
                                                                >
                                                                    {item.companyDrugCode}
                                                                </TableCell>
                                                                <TableCell className="min-w-[260px] whitespace-normal">
                                                                    <div className="space-y-2">
                                                                        <p className="font-medium text-slate-900">
                                                                            {item.companyDrugName}
                                                                        </p>
                                                                        <div className="flex flex-wrap gap-2">
                                                                            {!linked ? (
                                                                                <Badge
                                                                                    variant="outline"
                                                                                    className="border-amber-300 text-amber-700"
                                                                                >
                                                                                    Chưa liên kết thuốc chuẩn
                                                                                </Badge>
                                                                            ) : null}
                                                                            {isExisting ? (
                                                                                <Badge variant="secondary">
                                                                                    Đã có trong dự trù
                                                                                </Badge>
                                                                            ) : null}
                                                                            {isExistingMaster ? (
                                                                                <Badge variant="secondary">
                                                                                    Trùng thuốc chuẩn trong dự trù
                                                                                </Badge>
                                                                            ) : null}
                                                                            {isSelectedMasterConflict ? (
                                                                                <Badge variant="secondary">
                                                                                    Đã chọn thuốc cùng thuốc chuẩn
                                                                                </Badge>
                                                                            ) : null}
                                                                        </div>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="whitespace-normal">
                                                                    {item.activeIngredient ||
                                                                        item.masterDrug?.hoatChat ||
                                                                        "—"}
                                                                </TableCell>
                                                                <TableCell>
                                                                    {item.masterDrug?.hamLuong ||
                                                                        "—"}
                                                                </TableCell>
                                                                <TableCell>
                                                                    {item.masterDrug?.soDangKy || "—"}
                                                                </TableCell>
                                                                <TableCell>
                                                                    {item.masterDrug?.dangBaoChe ||
                                                                        "—"}
                                                                </TableCell>
                                                                <TableCell className="whitespace-normal">
                                                                    {quyCach}
                                                                </TableCell>
                                                                <TableCell className="whitespace-normal">
                                                                    {item.masterDrug ? (
                                                                        <div>
                                                                            <p className="font-medium text-slate-900">
                                                                                {item.masterDrug.maChung}
                                                                            </p>
                                                                            <p className="text-xs text-slate-500">
                                                                                {item.masterDrug.tenThuoc}
                                                                            </p>
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-amber-700">
                                                                            Chưa liên kết
                                                                        </span>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell>
                                                                    {item.unit ||
                                                                        item.masterDrug?.donViTinh ||
                                                                        "—"}
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                        </TableBody>
                                                    </Table>
                                                </div>

                                                <div className="space-y-3 p-3 xl:hidden">
                                                    {filteredItems.map((item) => {
                                                        const isExisting =
                                                            existingCompanyDrugIdSet.has(item.id);
                                                        const masterDrugId =
                                                            resolveMasterDrugId(item);
                                                        const isExistingMaster =
                                                            Boolean(
                                                                masterDrugId &&
                                                                    existingMasterDrugIdSet.has(
                                                                        masterDrugId
                                                                    )
                                                            );
                                                        const isSelected =
                                                            selectedIdSet.has(item.id);
                                                        const isSelectedMasterConflict =
                                                            Boolean(
                                                                masterDrugId &&
                                                                    selectedMasterDrugIdSet.has(
                                                                        masterDrugId
                                                                    ) &&
                                                                    !isSelected
                                                            );
                                                        const linked = isLinkedDrug(item);
                                                        const quyCach =
                                                            item.quyCach ||
                                                            item.masterDrug?.quyCach ||
                                                            "—";
                                                        const isUnavailable =
                                                            isExisting ||
                                                            isExistingMaster ||
                                                            isSelectedMasterConflict;

                                                        return (
                                                            <button
                                                                key={item.id}
                                                                type="button"
                                                                disabled={isUnavailable}
                                                                aria-pressed={isSelected}
                                                                onClick={() =>
                                                                    props.onToggleSelect(item.id)
                                                                }
                                                                className={cn(
                                                                    "w-full rounded-xl border p-4 text-left shadow-sm transition",
                                                                    isSelected
                                                                        ? "border-blue-400 bg-blue-50"
                                                                        : "border-slate-200 bg-white hover:border-slate-300",
                                                                    isUnavailable &&
                                                                        "cursor-not-allowed opacity-65 hover:border-slate-200"
                                                                )}
                                                            >
                                                                <div className="flex items-start gap-3">
                                                                    <span
                                                                        className={cn(
                                                                            "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border",
                                                                            isSelected
                                                                                ? "border-blue-600 bg-blue-600 text-white"
                                                                                : "border-slate-300 bg-white text-transparent"
                                                                        )}
                                                                        aria-hidden="true"
                                                                    >
                                                                        <Check className="h-4 w-4" />
                                                                    </span>
                                                                    <div className="min-w-0 flex-1 space-y-3">
                                                                        <div className="space-y-1">
                                                                            <div className="flex flex-wrap items-center gap-2">
                                                                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                                                                                    {item.companyDrugCode}
                                                                                </span>
                                                                                {!linked ? (
                                                                                    <Badge
                                                                                        variant="outline"
                                                                                        className="border-amber-300 text-amber-700"
                                                                                    >
                                                                                        Chưa liên kết thuốc chuẩn
                                                                                    </Badge>
                                                                                ) : null}
                                                                            </div>
                                                                            <p className="break-words font-semibold text-slate-900">
                                                                                {item.companyDrugName}
                                                                            </p>
                                                                            <p className="text-sm text-slate-500">
                                                                                {item.activeIngredient ||
                                                                                    item.masterDrug?.hoatChat ||
                                                                                    "Chưa có hoạt chất"}
                                                                            </p>
                                                                        </div>

                                                                        <div className="grid gap-2 text-sm sm:grid-cols-2">
                                                                            <div className="rounded-lg bg-slate-50 px-3 py-2">
                                                                                <p className="text-[11px] font-medium uppercase text-slate-500">
                                                                                    Quy cách
                                                                                </p>
                                                                                <p className="mt-1 font-medium text-slate-900">
                                                                                    {quyCach}
                                                                                </p>
                                                                            </div>
                                                                            <div className="rounded-lg bg-slate-50 px-3 py-2">
                                                                                <p className="text-[11px] font-medium uppercase text-slate-500">
                                                                                    Đơn vị
                                                                                </p>
                                                                                <p className="mt-1 font-medium text-slate-900">
                                                                                    {item.unit ||
                                                                                        item.masterDrug?.donViTinh ||
                                                                                        "—"}
                                                                                </p>
                                                                            </div>
                                                                        </div>

                                                                        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                                                                            <p className="text-[11px] font-medium uppercase text-slate-500">
                                                                                Thuốc chuẩn
                                                                            </p>
                                                                            {item.masterDrug ? (
                                                                                <div className="mt-1">
                                                                                    <p className="font-medium text-slate-900">
                                                                                        {item.masterDrug.maChung}
                                                                                    </p>
                                                                                    <p className="text-xs text-slate-500">
                                                                                        {item.masterDrug.tenThuoc}
                                                                                    </p>
                                                                                </div>
                                                                            ) : (
                                                                                <p className="mt-1 text-amber-700">
                                                                                    Chưa liên kết
                                                                                </p>
                                                                            )}
                                                                        </div>

                                                                        <div className="flex flex-wrap gap-2">
                                                                            {isExisting ? (
                                                                                <Badge variant="secondary">
                                                                                    Đã có trong dự trù
                                                                                </Badge>
                                                                            ) : null}
                                                                            {isExistingMaster ? (
                                                                                <Badge variant="secondary">
                                                                                    Trùng thuốc chuẩn trong dự trù
                                                                                </Badge>
                                                                            ) : null}
                                                                            {isSelectedMasterConflict ? (
                                                                                <Badge variant="secondary">
                                                                                    Đã chọn thuốc cùng thuốc chuẩn
                                                                                </Badge>
                                                                            ) : null}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </TabsContent>
                            </div>
                        </Tabs>
                    </div>

                    <DialogFooter className="shrink-0 border-t border-slate-200 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] xl:px-6 xl:py-4">
                        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-slate-500">
                                Đã chọn {selectedCount} thuốc. Số lượng yêu cầu sẽ nhập ở màn chi tiết sau khi thêm.
                            </p>
                            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
                                <Button
                                    variant="outline"
                                    onClick={() => props.onOpenChange(false)}
                                    disabled={props.isSubmitting}
                                    className="w-full sm:w-auto"
                                >
                                    Hủy
                                </Button>
                                <Button
                                    onClick={props.onSubmit}
                                    disabled={props.isSubmitting || selectedCount === 0}
                                    className="w-full sm:w-auto"
                                >
                                    {props.isSubmitting ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Plus className="h-4 w-4" />
                                    )}
                                    Thêm vào dự trù
                                </Button>
                            </div>
                        </div>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}
