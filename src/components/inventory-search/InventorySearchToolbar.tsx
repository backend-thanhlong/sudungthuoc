"use client";

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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Search, SlidersHorizontal, GitCompareArrows, Building2, X } from "lucide-react";
import type { DrugSortOption, FacilitySortOption, InventoryFacilityOption, DrugOption } from "./types";
import {
    DRUG_SORT_OPTIONS,
    FACILITY_SORT_OPTIONS,
    formatDrugOptionLabel,
    VIEW_MODE_OPTIONS,
    type InventoryViewMode,
} from "./types";

interface InventorySearchToolbarProps {
    viewMode: InventoryViewMode;
    onViewModeChange: (value: InventoryViewMode) => void;
    query: string;
    onQueryChange: (value: string) => void;
    drugSort: DrugSortOption;
    onDrugSortChange: (value: DrugSortOption) => void;
    facilitySort: FacilitySortOption;
    onFacilitySortChange: (value: FacilitySortOption) => void;
    facilities: InventoryFacilityOption[];
    isFacilitiesLoading: boolean;
    selectedFacilityId: string;
    onSelectedFacilityIdChange: (value: string) => void;
    compareDrugQuery: string;
    onCompareDrugQueryChange: (value: string) => void;
    compareDrugOptions: DrugOption[];
    isCompareDrugOptionsLoading: boolean;
    selectedComparisonDrug: DrugOption | null;
    onSelectComparisonDrug: (value: DrugOption) => void;
    onClearComparisonDrug: () => void;
    selectedComparisonFacilityIds: string[];
    onToggleComparisonFacility: (facilityId: string) => void;
    statusText: string;
}

export default function InventorySearchToolbar({
    viewMode,
    onViewModeChange,
    query,
    onQueryChange,
    drugSort,
    onDrugSortChange,
    facilitySort,
    onFacilitySortChange,
    facilities,
    isFacilitiesLoading,
    selectedFacilityId,
    onSelectedFacilityIdChange,
    compareDrugQuery,
    onCompareDrugQueryChange,
    compareDrugOptions,
    isCompareDrugOptionsLoading,
    selectedComparisonDrug,
    onSelectComparisonDrug,
    onClearComparisonDrug,
    selectedComparisonFacilityIds,
    onToggleComparisonFacility,
    statusText,
}: InventorySearchToolbarProps) {
    const selectedFacility = facilities.find((facility) => facility.id === selectedFacilityId) || null;

    return (
        <Card className="border-0 shadow-lg">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5 text-blue-600" />
                    Tra cứu tồn kho
                </CardTitle>
                <CardDescription>
                    Chuyển giữa các chế độ xem để tra cứu theo thuốc, theo cơ sở hoặc so sánh cùng một thuốc giữa nhiều cơ sở.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
                <div className="inline-flex w-full flex-wrap gap-2 rounded-2xl bg-slate-100 p-1">
                    {VIEW_MODE_OPTIONS.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => onViewModeChange(option.value)}
                            className={cn(
                                "rounded-xl px-4 py-2 text-sm font-medium transition-colors",
                                viewMode === option.value
                                    ? "bg-white text-slate-900 shadow-sm"
                                    : "text-slate-600 hover:text-slate-900"
                            )}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>

                {viewMode === "drug" && (
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                value={query}
                                onChange={(event) => onQueryChange(event.target.value)}
                                placeholder="Nhập tên thuốc, hoạt chất, hàm lượng hoặc mã thuốc"
                                className="pl-10"
                            />
                        </div>
                        <div className="space-y-2">
                            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                                <SlidersHorizontal className="h-3.5 w-3.5" />
                                Sắp xếp
                            </p>
                            <Select value={drugSort} onValueChange={(value) => onDrugSortChange(value as DrugSortOption)}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Chọn cách sắp xếp" />
                                </SelectTrigger>
                                <SelectContent>
                                    {DRUG_SORT_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                )}

                {viewMode === "facility" && (
                    <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)_220px]">
                        <div className="space-y-2">
                            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                                <Building2 className="h-3.5 w-3.5" />
                                Chọn cơ sở
                            </p>
                            <Select value={selectedFacilityId || "__placeholder__"} onValueChange={(value) => onSelectedFacilityIdChange(value === "__placeholder__" ? "" : value)}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder={isFacilitiesLoading ? "Đang tải cơ sở..." : "Chọn một cơ sở"} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__placeholder__">Chọn một cơ sở</SelectItem>
                                    {facilities.map((facility) => (
                                        <SelectItem key={facility.id} value={facility.id}>
                                            {facility.facilityName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Lọc thuốc trong cơ sở</p>
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <Input
                                    value={query}
                                    onChange={(event) => onQueryChange(event.target.value)}
                                    placeholder={selectedFacility ? `Lọc thuốc trong ${selectedFacility.facilityName}` : "Chọn cơ sở trước để lọc thuốc"}
                                    className="pl-10"
                                    disabled={!selectedFacilityId}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                                <SlidersHorizontal className="h-3.5 w-3.5" />
                                Sắp xếp
                            </p>
                            <Select value={facilitySort} onValueChange={(value) => onFacilitySortChange(value as FacilitySortOption)}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Chọn cách sắp xếp" />
                                </SelectTrigger>
                                <SelectContent>
                                    {FACILITY_SORT_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                )}

                {viewMode === "compare" && (
                    <div className="space-y-4">
                        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
                            <div className="space-y-2">
                                <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                                    <GitCompareArrows className="h-3.5 w-3.5" />
                                    Chọn thuốc để so sánh
                                </p>
                                <div className="relative">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    <Input
                                        value={compareDrugQuery}
                                        onChange={(event) => onCompareDrugQueryChange(event.target.value)}
                                        placeholder="Tìm thuốc theo tên, hoạt chất hoặc mã chung"
                                        className="pl-10"
                                    />
                                </div>
                                {selectedComparisonDrug && (
                                    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                                        <span className="font-medium">{formatDrugOptionLabel(selectedComparisonDrug)}</span>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 px-2 text-emerald-700 hover:bg-emerald-100"
                                            onClick={onClearComparisonDrug}
                                        >
                                            <X className="mr-1 h-3.5 w-3.5" />
                                            Bỏ chọn
                                        </Button>
                                    </div>
                                )}
                                {!selectedComparisonDrug && compareDrugQuery.trim() && (
                                    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                                        {isCompareDrugOptionsLoading ? (
                                            <p className="px-3 py-3 text-sm text-slate-500">Đang tìm thuốc...</p>
                                        ) : compareDrugOptions.length === 0 ? (
                                            <p className="px-3 py-3 text-sm text-slate-500">Không tìm thấy thuốc phù hợp.</p>
                                        ) : (
                                            <div className="max-h-60 overflow-y-auto py-1">
                                                {compareDrugOptions.map((drug) => (
                                                    <button
                                                        key={drug.masterDrugId}
                                                        type="button"
                                                        onClick={() => onSelectComparisonDrug(drug)}
                                                        className="flex w-full flex-col items-start gap-1 px-3 py-2 text-left transition-colors hover:bg-slate-50"
                                                    >
                                                        <span className="font-medium text-slate-800">{drug.tenThuoc}</span>
                                                        <span className="text-xs text-slate-500">
                                                            {[drug.maChung, drug.hoatChat, drug.hamLuong].filter(Boolean).join(" • ")}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Tóm tắt lựa chọn</p>
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                                    <p>{selectedComparisonDrug ? "Đã khóa đúng thuốc để so sánh giữa các cơ sở." : "Chọn một thuốc từ danh sách gợi ý để bắt đầu so sánh."}</p>
                                    <p className="mt-2">
                                        Đã chọn <span className="font-semibold text-slate-800">{selectedComparisonFacilityIds.length}</span> cơ sở.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Chọn các cơ sở cần so sánh</p>
                            <div className="grid max-h-72 gap-2 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-2 xl:grid-cols-3">
                                {facilities.map((facility) => {
                                    const isSelected = selectedComparisonFacilityIds.includes(facility.id);
                                    return (
                                        <button
                                            key={facility.id}
                                            type="button"
                                            onClick={() => onToggleComparisonFacility(facility.id)}
                                            className={cn(
                                                "rounded-xl border px-3 py-3 text-left transition-colors",
                                                isSelected
                                                    ? "border-blue-500 bg-blue-50 text-blue-900"
                                                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                                            )}
                                        >
                                            <p className="font-medium">{facility.facilityName}</p>
                                            <p className="mt-1 text-xs text-slate-500">
                                                {[facility.facilityCode, facility.facilityType].filter(Boolean).join(" • ") || "Chưa có mã cơ sở"}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    {statusText}
                </div>
            </CardContent>
        </Card>
    );
}
