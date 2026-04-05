"use client";

import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { AlertTriangle, GitCompareArrows } from "lucide-react";
import type { FacilityCompareResponse } from "./types";

interface FacilityComparisonViewProps {
    data: FacilityCompareResponse | null;
    isLoading: boolean;
}

export default function FacilityComparisonView({
    data,
    isLoading,
}: FacilityComparisonViewProps) {
    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="py-12 text-center text-slate-400">
                <GitCompareArrows className="mx-auto mb-4 h-12 w-12 opacity-50" />
                <p>Chọn một thuốc và ít nhất hai cơ sở để xem ma trận so sánh.</p>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
                        {data.drug.maChung}
                    </Badge>
                    <h3 className="text-lg font-semibold text-slate-900">{data.drug.tenThuoc}</h3>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                    {[data.drug.hoatChat, data.drug.hamLuong, data.drug.unit].filter(Boolean).join(" • ")}
                </p>
            </div>

            {data.reportMonthMismatch && (
                <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>Kỳ báo cáo giữa các cơ sở đang không đồng nhất. Cần đọc cùng với hàng “Kỳ báo cáo” trước khi so sánh tồn kho hoặc giá VAT.</p>
                </div>
            )}

            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="min-w-[160px]">Chỉ số</TableHead>
                            {data.facilities.map((facility) => (
                                <TableHead key={facility.id} className="min-w-[220px] align-top">
                                    <div className="space-y-1">
                                        <p className="font-semibold text-slate-900">{facility.facilityName}</p>
                                        <p className="text-xs font-normal text-slate-500">
                                            {[facility.facilityCode, facility.facilityType].filter(Boolean).join(" • ") || "Chưa có mã cơ sở"}
                                        </p>
                                    </div>
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.metrics.map((metric) => (
                            <TableRow key={metric.key}>
                                <TableCell className="font-medium text-slate-700">{metric.label}</TableCell>
                                {metric.values.map((value) => (
                                    <TableCell
                                        key={`${metric.key}-${value.facilityId}`}
                                        className={cn(
                                            "align-top",
                                            value.missing && "text-slate-400",
                                            metric.key === "currentStock" && value.highlighted && "bg-emerald-50 font-semibold text-emerald-800",
                                            metric.key === "priceVAT" && value.highlighted && "bg-blue-50 font-semibold text-blue-800",
                                            metric.key === "reportMonth" && value.highlighted && "bg-amber-50 font-semibold text-amber-900"
                                        )}
                                    >
                                        {value.display}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
