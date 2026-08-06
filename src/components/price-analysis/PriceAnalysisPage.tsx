"use client";

import { useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    BarChart3,
    Building2,
    Eye,
    Pill,
    Search,
    TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

type PricePoint = {
    facilityId: string;
    facilityName: string;
    facilityCode: string | null;
    facilityType: string | null;
    giaVat: number;
    mapCount: number;
    maNoiBos: string[];
    internalDrugNames: string[];
    units: string[];
    companies: string[];
    tenderNos: string[];
    nhomTckts: string[];
};

type PriceAnalysisItem = {
    masterDrugId: string;
    maChung: string;
    tenThuoc: string;
    hoatChat: string | null;
    hamLuong: string | null;
    dangBaoChe: string | null;
    soDangKy: string | null;
    quyCach: string | null;
    donViTinh: string | null;
    minPrice: number;
    maxPrice: number;
    priceSpread: number;
    variancePercent: number;
    priceLevelCount: number;
    facilityCount: number;
    lineCount: number;
    unitMismatch: boolean;
    units: string[];
    pricePoints: PricePoint[];
};

type PriceAnalysisPayload = {
    kpis: {
        drugCount: number;
        facilityCount: number;
        priceLineCount: number;
        maxVariancePercent: number;
        maxPriceSpread: number;
    };
    items: PriceAnalysisItem[];
};

const emptyPayload: PriceAnalysisPayload = {
    kpis: {
        drugCount: 0,
        facilityCount: 0,
        priceLineCount: 0,
        maxVariancePercent: 0,
        maxPriceSpread: 0,
    },
    items: [],
};

const formatCurrency = (value: number | null | undefined) =>
    new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
    }).format(Number(value || 0));

const formatNumber = (value: number | null | undefined) =>
    new Intl.NumberFormat("vi-VN", {
        maximumFractionDigits: 2,
    }).format(Number(value || 0));

function joinValues(values: string[], fallback = "-") {
    return values.length > 0 ? values.join(", ") : fallback;
}

function getDrugSubtitle(item: PriceAnalysisItem) {
    return [item.hoatChat, item.hamLuong, item.dangBaoChe]
        .filter(Boolean)
        .join(" - ") || "-";
}

function KpiCard({
    title,
    value,
    description,
    icon: Icon,
}: {
    title: string;
    value: string;
    description: string;
    icon: typeof BarChart3;
}) {
    return (
        <Card>
            <CardContent className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                    <p className="text-sm text-muted-foreground">{title}</p>
                    <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{description}</p>
                </div>
                <div className="rounded-md bg-blue-50 p-2 text-blue-700">
                    <Icon className="size-5" />
                </div>
            </CardContent>
        </Card>
    );
}

function TruncatedTooltipText({
    value,
    className = "",
    tooltipValue,
}: {
    value: string | null | undefined;
    className?: string;
    tooltipValue?: string;
}) {
    const normalizedValue = typeof value === "string" && value.trim().length > 0 ? value : "-";
    const tooltipText = tooltipValue || normalizedValue;
    const content = (
        <span className={`block min-w-0 max-w-full truncate ${className}`}>
            {normalizedValue}
        </span>
    );

    if (normalizedValue === "-") {
        return content;
    }

    return (
        <Tooltip>
            <TooltipTrigger asChild>{content}</TooltipTrigger>
            <TooltipContent align="start" className="max-w-sm whitespace-pre-wrap break-words">
                {tooltipText}
            </TooltipContent>
        </Tooltip>
    );
}

export default function PriceAnalysisPage() {
    const [payload, setPayload] = useState<PriceAnalysisPayload>(emptyPayload);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState("");
    const [detailItem, setDetailItem] = useState<PriceAnalysisItem | null>(null);

    useEffect(() => {
        let ignore = false;
        setIsLoading(true);
        setError(null);

        fetch("/api/price-analysis")
            .then(async (res) => {
                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.message || "Không thể tải phân tích giá thuốc");
                }
                return data as PriceAnalysisPayload;
            })
            .then((data) => {
                if (ignore) return;
                setPayload(data);
            })
            .catch((fetchError) => {
                if (ignore) return;
                console.error(fetchError);
                setError(fetchError instanceof Error ? fetchError.message : "Không thể tải phân tích giá thuốc");
                setPayload(emptyPayload);
            })
            .finally(() => {
                if (!ignore) setIsLoading(false);
            });

        return () => {
            ignore = true;
        };
    }, []);

    const filteredItems = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        if (!normalizedQuery) {
            return payload.items;
        }

        return payload.items.filter((item) =>
            [
                item.maChung,
                item.tenThuoc,
                item.hoatChat,
                item.hamLuong,
                item.soDangKy,
                ...item.pricePoints.flatMap((point) => [
                    point.facilityName,
                    point.facilityCode,
                    ...point.internalDrugNames,
                    ...point.companies,
                ]),
            ]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(normalizedQuery))
        );
    }, [payload.items, query]);

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-normal text-foreground">
                        Phân tích giá thuốc
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        So sánh các mức giá VAT giữa cơ sở cho cùng một mã thuốc dùng chung.
                    </p>
                </div>
                <div className="relative w-full lg:w-[360px]">
                    <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
                    <Input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Tìm mã chung, tên thuốc, cơ sở..."
                        className="pl-9"
                    />
                </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <KpiCard
                    title="Thuốc có nhiều giá"
                    value={payload.kpis.drugCount.toLocaleString("vi-VN")}
                    description="Có từ 2 mức giá VAT khác nhau"
                    icon={Pill}
                />
                <KpiCard
                    title="Đơn vị liên quan"
                    value={payload.kpis.facilityCount.toLocaleString("vi-VN")}
                    description="Tính trên nhóm thuốc chênh giá"
                    icon={Building2}
                />
                <KpiCard
                    title="Dòng giá"
                    value={payload.kpis.priceLineCount.toLocaleString("vi-VN")}
                    description="Đã gộp theo đơn vị và giá"
                    icon={BarChart3}
                />
                <KpiCard
                    title="Chênh lệch lớn nhất"
                    value={`${formatNumber(payload.kpis.maxVariancePercent)}%`}
                    description={formatCurrency(payload.kpis.maxPriceSpread)}
                    icon={TrendingUp}
                />
            </div>

            {error ? (
                <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {error}
                </div>
            ) : null}

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Top thuốc có nhiều mức giá</CardTitle>
                    <CardDescription>
                        {isLoading
                            ? "Đang tải..."
                            : `Hiển thị ${filteredItems.length.toLocaleString("vi-VN")} / ${payload.items.length.toLocaleString("vi-VN")} thuốc`}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <TooltipProvider delayDuration={250}>
                        <div className="max-h-[680px] overflow-auto rounded-md border">
                            <Table className="table-fixed">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[220px]">Thuốc</TableHead>
                                        <TableHead className="w-[150px]">Đơn vị tính / quy cách</TableHead>
                                        <TableHead className="w-[130px] text-right">Giá thấp</TableHead>
                                        <TableHead className="w-[130px] text-right">Giá cao</TableHead>
                                        <TableHead className="w-[100px] text-right">Chênh</TableHead>
                                        <TableHead className="w-[90px] text-center">Mức giá</TableHead>
                                        <TableHead className="w-[80px] text-center">Cơ sở</TableHead>
                                        <TableHead className="w-[120px] text-center">Chi tiết</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="h-24 text-center text-sm text-muted-foreground">
                                                Đang tải dữ liệu...
                                            </TableCell>
                                        </TableRow>
                                    ) : null}
                                    {!isLoading && filteredItems.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="h-24 text-center text-sm text-muted-foreground">
                                                Không có thuốc phù hợp.
                                            </TableCell>
                                        </TableRow>
                                    ) : null}
                                    {filteredItems.map((item) => {
                                        const subtitle = getDrugSubtitle(item);
                                        const unitsText = joinValues(item.units);
                                        const packageText = item.quyCach || "-";
                                        const drugTooltip = [
                                            item.maChung,
                                            item.tenThuoc,
                                            subtitle !== "-" ? subtitle : null,
                                        ].filter(Boolean).join("\n");
                                        const unitTooltip = [
                                            `ĐVT: ${unitsText}`,
                                            `Quy cách: ${packageText}`,
                                        ].join("\n");

                                        return (
                                            <TableRow key={item.masterDrugId}>
                                                <TableCell>
                                                    <div className="flex min-w-0 items-start gap-2">
                                                        {item.unitMismatch ? (
                                                            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                                                        ) : null}
                                                        <div className="min-w-0">
                                                            <TruncatedTooltipText
                                                                value={item.maChung}
                                                                tooltipValue={drugTooltip}
                                                                className="font-mono text-xs font-semibold text-blue-700"
                                                            />
                                                            <TruncatedTooltipText
                                                                value={item.tenThuoc}
                                                                tooltipValue={drugTooltip}
                                                                className="font-medium text-foreground"
                                                            />
                                                            <TruncatedTooltipText
                                                                value={subtitle}
                                                                tooltipValue={drugTooltip}
                                                                className="text-xs text-muted-foreground"
                                                            />
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <TruncatedTooltipText
                                                        value={unitsText}
                                                        tooltipValue={unitTooltip}
                                                        className="text-sm"
                                                    />
                                                    <TruncatedTooltipText
                                                        value={packageText}
                                                        tooltipValue={unitTooltip}
                                                        className="mt-1 text-xs text-muted-foreground"
                                                    />
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-emerald-700">
                                                    {formatCurrency(item.minPrice)}
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-red-700">
                                                    {formatCurrency(item.maxPrice)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Badge className="bg-amber-100 text-amber-800">
                                                        {formatNumber(item.variancePercent)}%
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-center tabular-nums">
                                                    {item.priceLevelCount}
                                                </TableCell>
                                                <TableCell className="text-center tabular-nums">
                                                    {item.facilityCount}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 gap-1 px-2"
                                                        onClick={() => setDetailItem(item)}
                                                    >
                                                        <Eye className="size-4" />
                                                        Chi tiết
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </TooltipProvider>
                </CardContent>
            </Card>

            <Dialog open={Boolean(detailItem)} onOpenChange={(open) => {
                if (!open) setDetailItem(null);
            }}>
                <DialogContent className="!left-0 !top-0 flex !h-[100dvh] !w-screen !max-w-none !translate-x-0 !translate-y-0 flex-col gap-0 overflow-hidden !rounded-none !border-0 !p-0 !shadow-none sm:!max-w-none">
                    <DialogHeader className="shrink-0 border-b px-6 py-4 pr-14 text-left">
                        <DialogTitle>Chi tiết giá theo đơn vị</DialogTitle>
                        <DialogDescription>
                            {detailItem
                                ? `${detailItem.maChung} - ${detailItem.tenThuoc}`
                                : ""}
                        </DialogDescription>
                    </DialogHeader>
                    {detailItem ? (
                        <div className="min-h-0 flex-1 space-y-4 overflow-auto px-6 py-4">
                            <div className="grid gap-3 md:grid-cols-4">
                                <div className="rounded-md border bg-muted/30 p-3">
                                    <div className="text-xs text-muted-foreground">Giá thấp</div>
                                    <div className="mt-1 font-mono text-sm font-semibold text-emerald-700">
                                        {formatCurrency(detailItem.minPrice)}
                                    </div>
                                </div>
                                <div className="rounded-md border bg-muted/30 p-3">
                                    <div className="text-xs text-muted-foreground">Giá cao</div>
                                    <div className="mt-1 font-mono text-sm font-semibold text-red-700">
                                        {formatCurrency(detailItem.maxPrice)}
                                    </div>
                                </div>
                                <div className="rounded-md border bg-muted/30 p-3">
                                    <div className="text-xs text-muted-foreground">Chênh lệch</div>
                                    <div className="mt-1 text-sm font-semibold">
                                        {formatNumber(detailItem.variancePercent)}%
                                    </div>
                                </div>
                                <div className="rounded-md border bg-muted/30 p-3">
                                    <div className="text-xs text-muted-foreground">Mức giá / cơ sở</div>
                                    <div className="mt-1 text-sm font-semibold">
                                        {detailItem.priceLevelCount} mức · {detailItem.facilityCount} cơ sở
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-md border bg-muted/30 p-3">
                                <div className="text-xs text-muted-foreground">Đơn vị tính / quy cách</div>
                                <div className="mt-1 text-sm font-medium">
                                    {joinValues(detailItem.units)} · {detailItem.quyCach || "-"}
                                </div>
                            </div>

                            {detailItem.unitMismatch ? (
                                <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                                    <span>
                                        Thuốc này có đơn vị tính không đồng nhất giữa các cơ sở. Cần kiểm tra đơn vị/quy cách trước khi kết luận chênh giá.
                                    </span>
                                </div>
                            ) : null}

                            <div className="overflow-auto rounded-md border">
                                <Table className="min-w-[1280px]">
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="min-w-[180px]">Đơn vị</TableHead>
                                            <TableHead className="min-w-[120px]">Mã nội bộ</TableHead>
                                            <TableHead className="min-w-[220px]">Thuốc nội bộ</TableHead>
                                            <TableHead>ĐVT</TableHead>
                                            <TableHead>Công ty</TableHead>
                                            <TableHead>Số QĐ</TableHead>
                                            <TableHead>Nhóm TCKT</TableHead>
                                            <TableHead className="text-right">Giá VAT</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {detailItem.pricePoints.map((point) => (
                                            <TableRow key={`${point.facilityId}-${point.giaVat}`}>
                                                <TableCell>
                                                    <div className="font-medium text-foreground">
                                                        {point.facilityName}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {[point.facilityCode, point.facilityType]
                                                            .filter(Boolean)
                                                            .join(" · ") || "-"}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="whitespace-normal break-words align-top">
                                                    {joinValues(point.maNoiBos)}
                                                </TableCell>
                                                <TableCell className="whitespace-normal break-words align-top">
                                                    <div className="line-clamp-2 text-sm">
                                                        {joinValues(point.internalDrugNames)}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="whitespace-normal break-words align-top">
                                                    {joinValues(point.units)}
                                                </TableCell>
                                                <TableCell className="whitespace-normal break-words align-top">
                                                    {joinValues(point.companies)}
                                                </TableCell>
                                                <TableCell className="whitespace-normal break-words align-top">
                                                    {joinValues(point.tenderNos)}
                                                </TableCell>
                                                <TableCell className="whitespace-normal break-words align-top">
                                                    {joinValues(point.nhomTckts)}
                                                </TableCell>
                                                <TableCell
                                                    className={`text-right font-mono font-semibold ${
                                                        point.giaVat === detailItem.maxPrice
                                                            ? "text-red-700"
                                                            : point.giaVat === detailItem.minPrice
                                                                ? "text-emerald-700"
                                                                : "text-foreground"
                                                    }`}
                                                >
                                                    {formatCurrency(point.giaVat)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    ) : null}
                </DialogContent>
            </Dialog>
        </div>
    );
}
