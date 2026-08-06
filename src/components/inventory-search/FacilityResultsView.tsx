"use client";

import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Building2, ChevronLeft, ChevronRight, PackageSearch, Search } from "lucide-react";
import type { FacilitySearchResponse } from "./types";

interface FacilityResultsViewProps {
    data: FacilitySearchResponse | null;
    isLoading: boolean;
    query: string;
    onPageChange: (page: number) => void;
}

const formatNumber = (value: number) => new Intl.NumberFormat("vi-VN").format(value);

export default function FacilityResultsView({
    data,
    isLoading,
    query,
    onPageChange,
}: FacilityResultsViewProps) {
    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
            </div>
        );
    }

    if (!data?.facility) {
        return (
            <div className="py-12 text-center text-slate-400">
                <Building2 className="mx-auto mb-4 h-12 w-12 opacity-50" />
                <p>Chọn một cơ sở để xem danh sách thuốc đang còn tồn.</p>
            </div>
        );
    }

    const totalPages = Math.max(1, Math.ceil(data.total / data.limit));

    return (
        <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Cơ sở</p>
                    <p className="mt-2 font-semibold text-slate-900">{data.facility.facilityName}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Mã cơ sở</p>
                    <p className="mt-2 font-semibold text-slate-900">{data.facility.facilityCode || "Chưa có mã"}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Số thuốc có tồn</p>
                    <p className="mt-2 font-semibold text-slate-900">{formatNumber(data.summary.drugCount)}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Tổng lượng tồn</p>
                    <p className="mt-2 font-semibold text-emerald-700">{formatNumber(data.summary.totalStock)}</p>
                </div>
            </div>

            {data.results.length === 0 ? (
                <div className="py-10 text-center text-slate-400">
                    {query.trim() ? (
                        <>
                            <Search className="mx-auto mb-4 h-12 w-12 opacity-50" />
                            <p>Không tìm thấy thuốc phù hợp trong cơ sở đã chọn.</p>
                        </>
                    ) : (
                        <>
                            <PackageSearch className="mx-auto mb-4 h-12 w-12 opacity-50" />
                            <p>Cơ sở này hiện chưa có tồn kho đã duyệt.</p>
                        </>
                    )}
                </div>
            ) : (
                <>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12">STT</TableHead>
                                    <TableHead>Mã thuốc</TableHead>
                                    <TableHead>Tên thuốc</TableHead>
                                    <TableHead>Hoạt chất</TableHead>
                                    <TableHead>Hàm lượng</TableHead>
                                    <TableHead>Nhóm TCKT</TableHead>
                                    <TableHead>Số đăng ký</TableHead>
                                    <TableHead>ĐVT</TableHead>
                                    <TableHead className="text-right">Tồn kho</TableHead>
                                    <TableHead className="text-right">Giá VAT</TableHead>
                                    <TableHead>Kỳ báo cáo</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.results.map((drug, index) => (
                                    <TableRow
                                        key={`${drug.masterDrugId || drug.drugCode}-${index}`}
                                        className={cn(
                                            drug.isThuocHiem && "bg-red-50 hover:bg-red-100 [&>td]:text-red-700"
                                        )}
                                    >
                                        <TableCell>{(data.page - 1) * data.limit + index + 1}</TableCell>
                                        <TableCell className="font-mono text-sm">{drug.drugCode}</TableCell>
                                        <TableCell className="font-medium">{drug.drugName}</TableCell>
                                        <TableCell className="whitespace-normal break-words text-slate-600">
                                            {drug.activeIngredient}
                                        </TableCell>
                                        <TableCell className="whitespace-normal break-words">
                                            {drug.dosage}
                                        </TableCell>
                                        <TableCell className="whitespace-normal break-words text-slate-600">
                                            {drug.nhomTckt || "-"}
                                        </TableCell>
                                        <TableCell className="whitespace-normal break-words text-slate-600">
                                            {drug.soDangKy || "-"}
                                        </TableCell>
                                        <TableCell>{drug.unit}</TableCell>
                                        <TableCell className="text-right font-semibold text-emerald-700">
                                            {formatNumber(drug.currentStock)}
                                        </TableCell>
                                        <TableCell className="text-right">{formatNumber(drug.priceVAT)}</TableCell>
                                        <TableCell className="text-slate-500">{drug.reportMonth}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between border-t pt-4">
                            <p className="text-sm text-slate-500">
                                Trang {data.page} / {totalPages}
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onPageChange(Math.max(1, data.page - 1))}
                                    disabled={data.page === 1}
                                >
                                    <ChevronLeft className="mr-1 h-4 w-4" />
                                    Trước
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onPageChange(Math.min(totalPages, data.page + 1))}
                                    disabled={data.page === totalPages}
                                >
                                    Sau
                                    <ChevronRight className="ml-1 h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
