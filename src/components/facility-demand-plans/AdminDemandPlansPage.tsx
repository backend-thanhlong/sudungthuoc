"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Printer, Search } from "lucide-react";
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
import { Input } from "@/components/ui/input";
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

const ALL_VALUE = "__all__";

type DemandPlanStatus = "DRAFT" | "FINALIZED";

type FacilityInfo = {
    id: string;
    username: string;
    facilityName: string | null;
    facilityCode: string | null;
};

type DemandPlanSummary = {
    id: string;
    planNo: string;
    facilityId: string;
    facility: FacilityInfo;
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
    maNoiBoSnapshot: string;
    tenThuocSnapshot: string;
    hoatChatSnapshot: string | null;
    donViTinhSnapshot: string | null;
    nhomTcktSnapshot: string | null;
    maChungSnapshot: string | null;
    suggestedQty: number | null;
    finalQty: number;
    suggestionBasis: string | null;
    suggestionReportMonth: string | null;
    note: string | null;
};

type DemandPlanDetail = DemandPlanSummary & {
    lines: DemandPlanLine[];
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

function getFacilityLabel(facility: FacilityInfo) {
    return facility.facilityName || facility.facilityCode || facility.username;
}

function StatusBadge({ status }: { status: DemandPlanStatus }) {
    const meta = statusMeta[status];
    return (
        <Badge variant="outline" className={meta.className}>
            {meta.label}
        </Badge>
    );
}

export default function AdminDemandPlansPage() {
    const [plans, setPlans] = useState<DemandPlanSummary[]>([]);
    const [facilities, setFacilities] = useState<FacilityInfo[]>([]);
    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
    const [selectedPlan, setSelectedPlan] = useState<DemandPlanDetail | null>(null);
    const [facilityFilter, setFacilityFilter] = useState(ALL_VALUE);
    const [statusFilter, setStatusFilter] = useState(ALL_VALUE);
    const [monthFilter, setMonthFilter] = useState("");
    const [searchText, setSearchText] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isDetailLoading, setIsDetailLoading] = useState(false);

    const loadPlans = useCallback(async (preferredId?: string | null) => {
        const params = new URLSearchParams();
        if (facilityFilter !== ALL_VALUE) params.set("facilityId", facilityFilter);
        if (statusFilter !== ALL_VALUE) params.set("status", statusFilter);
        if (monthFilter.trim()) params.set("baseReportMonth", monthFilter.trim());

        setIsLoading(true);
        try {
            const res = await fetch(`/api/admin/lap-du-tru?${params.toString()}`);
            const payload = await res.json();
            if (!res.ok) {
                throw new Error(payload.message || "Không thể tải danh sách dự trù");
            }

            setPlans(payload.plans || []);
            setFacilities(payload.facilities || []);
            const nextId =
                preferredId === undefined
                    ? selectedPlanId || payload.plans?.[0]?.id || null
                    : preferredId;
            setSelectedPlanId(nextId);
            return nextId;
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Không thể tải dự trù");
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [facilityFilter, monthFilter, selectedPlanId, statusFilter]);

    const loadPlanDetail = useCallback(async (planId: string) => {
        setIsDetailLoading(true);
        try {
            const res = await fetch(`/api/admin/lap-du-tru/${planId}`);
            const payload = await res.json();
            if (!res.ok) {
                throw new Error(payload.message || "Không thể tải chi tiết dự trù");
            }
            setSelectedPlan(payload.plan);
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Không thể tải chi tiết dự trù");
        } finally {
            setIsDetailLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadPlans();
    }, [loadPlans]);

    useEffect(() => {
        if (selectedPlanId) {
            void loadPlanDetail(selectedPlanId);
        } else {
            setSelectedPlan(null);
        }
    }, [selectedPlanId, loadPlanDetail]);

    const filteredPlans = useMemo(() => {
        const query = searchText.trim().toLowerCase();
        if (!query) return plans;

        return plans.filter((plan) =>
            [
                plan.planNo,
                plan.baseReportMonth,
                plan.facility.facilityName,
                plan.facility.facilityCode,
                plan.facility.username,
            ]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(query))
        );
    }, [plans, searchText]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-normal text-gray-900">
                    Quản lý lập dự trù
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                    Theo dõi các dự trù nội bộ do cơ sở lập từ danh mục ánh xạ.
                </p>
            </div>

            <Card>
                <CardContent className="pt-6">
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_160px_160px_auto]">
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-gray-400" />
                            <Input
                                value={searchText}
                                onChange={(event) => setSearchText(event.target.value)}
                                placeholder="Tìm số dự trù hoặc cơ sở"
                                className="pl-9"
                            />
                        </div>
                        <Select value={facilityFilter} onValueChange={setFacilityFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="Cơ sở" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL_VALUE}>Tất cả cơ sở</SelectItem>
                                {facilities.map((facility) => (
                                    <SelectItem key={facility.id} value={facility.id}>
                                        {getFacilityLabel(facility)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="Trạng thái" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL_VALUE}>Tất cả</SelectItem>
                                <SelectItem value="DRAFT">Nháp</SelectItem>
                                <SelectItem value="FINALIZED">Đã chốt</SelectItem>
                            </SelectContent>
                        </Select>
                        <Input
                            value={monthFilter}
                            onChange={(event) => setMonthFilter(event.target.value)}
                            placeholder="MM/YYYY"
                        />
                        <Button onClick={() => void loadPlans(null)}>Lọc</Button>
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-[420px_minmax(0,1fr)]">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Danh sách</CardTitle>
                        <CardDescription>
                            {isLoading ? "Đang tải..." : `${filteredPlans.length} dự trù`}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {filteredPlans.length === 0 && !isLoading ? (
                            <div className="rounded-md border border-dashed p-6 text-center text-sm text-gray-500">
                                Không có dự trù phù hợp.
                            </div>
                        ) : null}
                        {filteredPlans.map((plan) => (
                            <button
                                key={plan.id}
                                type="button"
                                onClick={() => setSelectedPlanId(plan.id)}
                                className={`w-full rounded-md border p-3 text-left transition hover:border-blue-300 ${
                                    plan.id === selectedPlanId
                                        ? "border-blue-400 bg-blue-50"
                                        : "border-gray-200 bg-white"
                                }`}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-medium">{plan.planNo}</span>
                                    <StatusBadge status={plan.status} />
                                </div>
                                <div className="mt-2 text-sm text-gray-700">
                                    {getFacilityLabel(plan.facility)}
                                </div>
                                <div className="mt-1 text-xs text-gray-500">
                                    {plan.baseReportMonth || "Không chọn tháng"} ·{" "}
                                    {plan.lineCount} thuốc · {formatQty(plan.totalFinalQty)}
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
                                        ? `${getFacilityLabel(selectedPlan.facility)} · ${formatDate(selectedPlan.updatedAt)}`
                                        : "Chọn một dự trù để xem chi tiết"}
                                </CardDescription>
                            </div>
                            {selectedPlan ? (
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => window.print()}
                                    >
                                        <Printer className="mr-2 size-4" />
                                        In
                                    </Button>
                                    <Button variant="outline" size="sm" asChild>
                                        <a href={`/api/admin/lap-du-tru/${selectedPlan.id}/export`}>
                                            <Download className="mr-2 size-4" />
                                            Excel
                                        </a>
                                    </Button>
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
                                <div className="grid gap-3 text-sm md:grid-cols-3">
                                    <div className="rounded-md border bg-gray-50 p-3">
                                        <div className="text-gray-500">Tháng gốc XNT</div>
                                        <div className="font-medium">
                                            {selectedPlan.baseReportMonth || "-"}
                                        </div>
                                    </div>
                                    <div className="rounded-md border bg-gray-50 p-3">
                                        <div className="text-gray-500">Số thuốc</div>
                                        <div className="font-medium">
                                            {selectedPlan.lineCount}
                                        </div>
                                    </div>
                                    <div className="rounded-md border bg-gray-50 p-3">
                                        <div className="text-gray-500">Tổng SL dự trù</div>
                                        <div className="font-medium">
                                            {formatQty(selectedPlan.totalFinalQty)}
                                        </div>
                                    </div>
                                </div>

                                {selectedPlan.note ? (
                                    <div className="rounded-md border p-3 text-sm text-gray-700">
                                        {selectedPlan.note}
                                    </div>
                                ) : null}

                                <div className="overflow-x-auto rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Mã nội bộ</TableHead>
                                                <TableHead className="min-w-[260px]">Tên thuốc</TableHead>
                                                <TableHead>Đơn vị</TableHead>
                                                <TableHead>Nhóm</TableHead>
                                                <TableHead>Gợi ý</TableHead>
                                                <TableHead>SL dự trù</TableHead>
                                                <TableHead>Ghi chú</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {selectedPlan.lines.map((line) => (
                                                <TableRow key={line.id}>
                                                    <TableCell className="font-medium">
                                                        <div>{line.maNoiBoSnapshot}</div>
                                                        <div className="text-xs text-gray-500">
                                                            {line.maChungSnapshot || "-"}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="font-medium">
                                                            {line.tenThuocSnapshot}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            {line.hoatChatSnapshot || "-"}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{line.donViTinhSnapshot || "-"}</TableCell>
                                                    <TableCell>{line.nhomTcktSnapshot || "-"}</TableCell>
                                                    <TableCell>
                                                        <div>{formatQty(line.suggestedQty)}</div>
                                                        <div className="text-xs text-gray-500">
                                                            {line.suggestionReportMonth || ""}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{formatQty(line.finalQty)}</TableCell>
                                                    <TableCell>{line.note || "-"}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </>
                        ) : null}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
