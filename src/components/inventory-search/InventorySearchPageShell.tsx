"use client";

import { useEffect, useMemo, useState } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Search, Building2, GitCompareArrows, AlertCircle } from "lucide-react";
import DrugResultsView from "./DrugResultsView";
import FacilityComparisonView from "./FacilityComparisonView";
import FacilityResultsView from "./FacilityResultsView";
import InventorySearchToolbar from "./InventorySearchToolbar";
import {
    formatDrugOptionLabel,
    type DrugOption,
    type DrugSearchResponse,
    type DrugSortOption,
    type FacilityCompareResponse,
    type FacilitySearchResponse,
    type FacilitySortOption,
    type InventoryFacilityOption,
    type InventoryViewMode,
} from "./types";

interface ListResponse<T> {
    results: T[];
}

interface FetchState<T> {
    data: T | null;
    isLoading: boolean;
    error: string | null;
}

const DEFAULT_LIMIT = 20;

const createFetchState = <T,>(): FetchState<T> => ({
    data: null,
    isLoading: false,
    error: null,
});

const getErrorMessage = async (response: Response) => {
    try {
        const payload = await response.json() as { error?: string };
        return payload.error || "Không thể tải dữ liệu";
    } catch {
        return "Không thể tải dữ liệu";
    }
};

const fetchJson = async <T,>(url: string, signal?: AbortSignal): Promise<T> => {
    const response = await fetch(url, { signal });
    if (!response.ok) {
        throw new Error(await getErrorMessage(response));
    }
    return response.json() as Promise<T>;
};

export default function InventorySearchPageShell() {
    const [viewMode, setViewMode] = useState<InventoryViewMode>("drug");
    const [query, setQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const [page, setPage] = useState(1);
    const [drugSort, setDrugSort] = useState<DrugSortOption>("drugNameAsc");
    const [facilitySort, setFacilitySort] = useState<FacilitySortOption>("drugNameAsc");

    const [facilities, setFacilities] = useState<InventoryFacilityOption[]>([]);
    const [isFacilitiesLoading, setIsFacilitiesLoading] = useState(false);
    const [selectedFacilityId, setSelectedFacilityId] = useState("");

    const [compareDrugQuery, setCompareDrugQuery] = useState("");
    const [debouncedCompareDrugQuery, setDebouncedCompareDrugQuery] = useState("");
    const [compareDrugOptions, setCompareDrugOptions] = useState<DrugOption[]>([]);
    const [isCompareDrugOptionsLoading, setIsCompareDrugOptionsLoading] = useState(false);
    const [selectedComparisonDrug, setSelectedComparisonDrug] = useState<DrugOption | null>(null);
    const [selectedComparisonFacilityIds, setSelectedComparisonFacilityIds] = useState<string[]>([]);

    const [drugState, setDrugState] = useState<FetchState<DrugSearchResponse>>(createFetchState<DrugSearchResponse>);
    const [facilityState, setFacilityState] = useState<FetchState<FacilitySearchResponse>>(createFetchState<FacilitySearchResponse>);
    const [compareState, setCompareState] = useState<FetchState<FacilityCompareResponse>>(createFetchState<FacilityCompareResponse>);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(query);
        }, 400);
        return () => clearTimeout(timer);
    }, [query]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedCompareDrugQuery(compareDrugQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [compareDrugQuery]);

    useEffect(() => {
        let ignore = false;

        const loadFacilities = async () => {
            setIsFacilitiesLoading(true);
            try {
                const response = await fetchJson<ListResponse<InventoryFacilityOption>>("/api/inventory-search/facilities");
                if (!ignore) {
                    setFacilities(response.results);
                }
            } catch (error) {
                console.error("Unable to load facility list:", error);
            } finally {
                if (!ignore) {
                    setIsFacilitiesLoading(false);
                }
            }
        };

        loadFacilities();
        return () => {
            ignore = true;
        };
    }, []);

    useEffect(() => {
        if (viewMode !== "compare") {
            setCompareDrugOptions([]);
            setIsCompareDrugOptionsLoading(false);
            return;
        }

        const currentLabel = selectedComparisonDrug ? formatDrugOptionLabel(selectedComparisonDrug) : "";
        if (selectedComparisonDrug && compareDrugQuery === currentLabel) {
            setCompareDrugOptions([]);
            setIsCompareDrugOptionsLoading(false);
            return;
        }

        if (!debouncedCompareDrugQuery.trim()) {
            setCompareDrugOptions([]);
            setIsCompareDrugOptionsLoading(false);
            return;
        }

        const controller = new AbortController();
        setIsCompareDrugOptionsLoading(true);

        fetchJson<ListResponse<DrugOption>>(
            `/api/inventory-search/drug-options?q=${encodeURIComponent(debouncedCompareDrugQuery.trim())}&limit=10`,
            controller.signal
        )
            .then((response) => {
                setCompareDrugOptions(response.results);
            })
            .catch((error) => {
                if ((error as Error).name === "AbortError") return;
                console.error("Unable to load drug options:", error);
                setCompareDrugOptions([]);
            })
            .finally(() => {
                setIsCompareDrugOptionsLoading(false);
            });

        return () => controller.abort();
    }, [compareDrugQuery, debouncedCompareDrugQuery, selectedComparisonDrug, viewMode]);

    useEffect(() => {
        if (viewMode !== "drug") {
            return;
        }

        const controller = new AbortController();
        setDrugState((current) => ({
            ...current,
            isLoading: true,
            error: null,
        }));

        const params = new URLSearchParams({
            q: debouncedQuery,
            page: String(page),
            limit: String(DEFAULT_LIMIT),
            sort: drugSort,
        });

        fetchJson<DrugSearchResponse>(`/api/inventory-search/drug?${params.toString()}`, controller.signal)
            .then((response) => {
                setDrugState({
                    data: response,
                    isLoading: false,
                    error: null,
                });
            })
            .catch((error) => {
                if ((error as Error).name === "AbortError") return;
                setDrugState({
                    data: null,
                    isLoading: false,
                    error: error instanceof Error ? error.message : "Không thể tải dữ liệu thuốc",
                });
            });

        return () => controller.abort();
    }, [debouncedQuery, drugSort, page, viewMode]);

    useEffect(() => {
        if (viewMode !== "facility") {
            return;
        }

        if (!selectedFacilityId) {
            setFacilityState(createFetchState<FacilitySearchResponse>());
            return;
        }

        const controller = new AbortController();
        setFacilityState((current) => ({
            ...current,
            isLoading: true,
            error: null,
        }));

        const params = new URLSearchParams({
            facilityId: selectedFacilityId,
            q: debouncedQuery,
            page: String(page),
            limit: String(DEFAULT_LIMIT),
            sort: facilitySort,
        });

        fetchJson<FacilitySearchResponse>(`/api/inventory-search/facility?${params.toString()}`, controller.signal)
            .then((response) => {
                setFacilityState({
                    data: response,
                    isLoading: false,
                    error: null,
                });
            })
            .catch((error) => {
                if ((error as Error).name === "AbortError") return;
                setFacilityState({
                    data: null,
                    isLoading: false,
                    error: error instanceof Error ? error.message : "Không thể tải dữ liệu theo cơ sở",
                });
            });

        return () => controller.abort();
    }, [debouncedQuery, facilitySort, page, selectedFacilityId, viewMode]);

    useEffect(() => {
        if (viewMode !== "compare") {
            return;
        }

        if (!selectedComparisonDrug || selectedComparisonFacilityIds.length < 2) {
            setCompareState(createFetchState<FacilityCompareResponse>());
            return;
        }

        const controller = new AbortController();
        setCompareState((current) => ({
            ...current,
            isLoading: true,
            error: null,
        }));

        const params = new URLSearchParams({
            masterDrugId: selectedComparisonDrug.masterDrugId,
        });
        selectedComparisonFacilityIds.forEach((facilityId) => {
            params.append("facilityIds", facilityId);
        });

        fetchJson<FacilityCompareResponse>(`/api/inventory-search/compare?${params.toString()}`, controller.signal)
            .then((response) => {
                setCompareState({
                    data: response,
                    isLoading: false,
                    error: null,
                });
            })
            .catch((error) => {
                if ((error as Error).name === "AbortError") return;
                setCompareState({
                    data: null,
                    isLoading: false,
                    error: error instanceof Error ? error.message : "Không thể tải dữ liệu so sánh",
                });
            });

        return () => controller.abort();
    }, [selectedComparisonDrug, selectedComparisonFacilityIds, viewMode]);

    const selectedFacility = useMemo(
        () => facilities.find((facility) => facility.id === selectedFacilityId) || null,
        [facilities, selectedFacilityId]
    );

    const handleViewModeChange = (nextMode: InventoryViewMode) => {
        setViewMode(nextMode);
        setPage(1);

        if (nextMode !== "facility") {
            setSelectedFacilityId("");
            setFacilityState(createFetchState<FacilitySearchResponse>());
        }

        if (nextMode !== "compare") {
            setSelectedComparisonDrug(null);
            setSelectedComparisonFacilityIds([]);
            setCompareDrugQuery("");
            setCompareDrugOptions([]);
            setCompareState(createFetchState<FacilityCompareResponse>());
        }
    };

    const handleQueryChange = (value: string) => {
        setQuery(value);
        setPage(1);
    };

    const handleDrugSortChange = (value: DrugSortOption) => {
        setDrugSort(value);
        setPage(1);
    };

    const handleFacilitySortChange = (value: FacilitySortOption) => {
        setFacilitySort(value);
        setPage(1);
    };

    const handleSelectedFacilityChange = (value: string) => {
        setSelectedFacilityId(value);
        setPage(1);
    };

    const handleCompareDrugQueryChange = (value: string) => {
        setCompareDrugQuery(value);
        if (selectedComparisonDrug && value !== formatDrugOptionLabel(selectedComparisonDrug)) {
            setSelectedComparisonDrug(null);
            setCompareState(createFetchState<FacilityCompareResponse>());
        }
    };

    const handleSelectComparisonDrug = (drug: DrugOption) => {
        setSelectedComparisonDrug(drug);
        setCompareDrugQuery(formatDrugOptionLabel(drug));
        setCompareDrugOptions([]);
    };

    const handleClearComparisonDrug = () => {
        setSelectedComparisonDrug(null);
        setCompareDrugQuery("");
        setCompareDrugOptions([]);
        setCompareState(createFetchState<FacilityCompareResponse>());
    };

    const handleToggleComparisonFacility = (facilityId: string) => {
        setSelectedComparisonFacilityIds((current) => (
            current.includes(facilityId)
                ? current.filter((item) => item !== facilityId)
                : [...current, facilityId]
        ));
    };

    const statusText = useMemo(() => {
        if (viewMode === "drug") {
            return query.trim()
                ? `Đang xem theo thuốc với từ khóa “${query.trim()}”.`
                : "Đang xem theo thuốc trên toàn bộ tồn kho đã duyệt.";
        }

        if (viewMode === "facility") {
            if (!selectedFacility) {
                return "Đang xem theo cơ sở. Chọn một cơ sở để mở danh sách thuốc còn tồn.";
            }
            return query.trim()
                ? `Đang xem ${selectedFacility.facilityName} và lọc thuốc theo từ khóa “${query.trim()}”.`
                : `Đang xem toàn bộ thuốc còn tồn tại ${selectedFacility.facilityName}.`;
        }

        if (!selectedComparisonDrug) {
            return "Đang ở chế độ so sánh cơ sở. Chọn một thuốc từ danh sách gợi ý để bắt đầu.";
        }

        return `Đang chuẩn bị so sánh ${formatDrugOptionLabel(selectedComparisonDrug)} giữa ${selectedComparisonFacilityIds.length} cơ sở.`;
    }, [query, selectedComparisonDrug, selectedComparisonFacilityIds.length, selectedFacility, viewMode]);

    const resultsTitle = useMemo(() => {
        if (viewMode === "drug") return "Kết quả theo thuốc";
        if (viewMode === "facility") return "Kết quả theo cơ sở";
        return "Ma trận so sánh cơ sở";
    }, [viewMode]);

    const resultsDescription = useMemo(() => {
        if (viewMode === "drug") {
            if (drugState.isLoading) return "Đang tải danh sách thuốc...";
            return `Tìm thấy ${new Intl.NumberFormat("vi-VN").format(drugState.data?.total || 0)} thuốc.`;
        }

        if (viewMode === "facility") {
            if (!selectedFacility) return "Chọn một cơ sở để xem danh sách thuốc của cơ sở đó.";
            if (facilityState.isLoading) return `Đang tải dữ liệu của ${selectedFacility.facilityName}...`;
            return `${selectedFacility.facilityName}: ${new Intl.NumberFormat("vi-VN").format(facilityState.data?.total || 0)} thuốc phù hợp bộ lọc.`;
        }

        if (!selectedComparisonDrug) {
            return "Chọn một thuốc, sau đó chọn ít nhất hai cơ sở để so sánh.";
        }

        if (selectedComparisonFacilityIds.length < 2) {
            return "Cần tối thiểu hai cơ sở để tạo ma trận so sánh.";
        }

        return `Đang so sánh ${selectedComparisonFacilityIds.length} cơ sở cho ${selectedComparisonDrug.tenThuoc}.`;
    }, [
        drugState.data?.total,
        drugState.isLoading,
        facilityState.data?.total,
        facilityState.isLoading,
        selectedComparisonDrug,
        selectedComparisonFacilityIds.length,
        selectedFacility,
        viewMode,
    ]);

    const currentError = viewMode === "drug"
        ? drugState.error
        : viewMode === "facility"
            ? facilityState.error
            : compareState.error;

    const renderContent = () => {
        if (currentError) {
            return (
                <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>{currentError}</p>
                </div>
            );
        }

        if (viewMode === "drug") {
            return (
                <DrugResultsView
                    data={drugState.data}
                    isLoading={drugState.isLoading}
                    query={query}
                    onPageChange={setPage}
                />
            );
        }

        if (viewMode === "facility") {
            if (!selectedFacilityId) {
                return (
                    <div className="py-12 text-center text-slate-400">
                        <Building2 className="mx-auto mb-4 h-12 w-12 opacity-50" />
                        <p>Chọn một cơ sở để xem danh sách thuốc đang còn tồn.</p>
                    </div>
                );
            }

            return (
                <FacilityResultsView
                    data={facilityState.data}
                    isLoading={facilityState.isLoading}
                    query={query}
                    onPageChange={setPage}
                />
            );
        }

        if (!selectedComparisonDrug) {
            return (
                <div className="py-12 text-center text-slate-400">
                    <Search className="mx-auto mb-4 h-12 w-12 opacity-50" />
                    <p>Chọn một thuốc từ danh sách gợi ý để bắt đầu so sánh.</p>
                </div>
            );
        }

        if (selectedComparisonFacilityIds.length < 2) {
            return (
                <div className="py-12 text-center text-slate-400">
                    <GitCompareArrows className="mx-auto mb-4 h-12 w-12 opacity-50" />
                    <p>Chọn ít nhất hai cơ sở để tạo ma trận so sánh.</p>
                </div>
            );
        }

        return (
            <FacilityComparisonView
                data={compareState.data}
                isLoading={compareState.isLoading}
            />
        );
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold text-slate-800">Tra cứu tồn kho</h2>
                <p className="mt-1 text-slate-500">
                    Tìm kiếm thuốc, xem tồn kho theo cơ sở và so sánh cùng một thuốc giữa nhiều cơ sở trên địa bàn.
                </p>
            </div>

            <InventorySearchToolbar
                viewMode={viewMode}
                onViewModeChange={handleViewModeChange}
                query={query}
                onQueryChange={handleQueryChange}
                drugSort={drugSort}
                onDrugSortChange={handleDrugSortChange}
                facilitySort={facilitySort}
                onFacilitySortChange={handleFacilitySortChange}
                facilities={facilities}
                isFacilitiesLoading={isFacilitiesLoading}
                selectedFacilityId={selectedFacilityId}
                onSelectedFacilityIdChange={handleSelectedFacilityChange}
                compareDrugQuery={compareDrugQuery}
                onCompareDrugQueryChange={handleCompareDrugQueryChange}
                compareDrugOptions={compareDrugOptions}
                isCompareDrugOptionsLoading={isCompareDrugOptionsLoading}
                selectedComparisonDrug={selectedComparisonDrug}
                onSelectComparisonDrug={handleSelectComparisonDrug}
                onClearComparisonDrug={handleClearComparisonDrug}
                selectedComparisonFacilityIds={selectedComparisonFacilityIds}
                onToggleComparisonFacility={handleToggleComparisonFacility}
                statusText={statusText}
            />

            <Card className="border-0 shadow-lg">
                <CardHeader>
                    <CardTitle>{resultsTitle}</CardTitle>
                    <CardDescription>{resultsDescription}</CardDescription>
                </CardHeader>
                <CardContent>{renderContent()}</CardContent>
            </Card>
        </div>
    );
}
