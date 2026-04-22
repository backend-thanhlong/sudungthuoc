"use client";

import { Fragment, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Building2, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Search } from "lucide-react";
import type { DrugSearchResponse } from "./types";

interface DrugResultsViewProps {
    data: DrugSearchResponse | null;
    isLoading: boolean;
    query: string;
    onPageChange: (page: number) => void;
}

const formatNumber = (value: number) => new Intl.NumberFormat("vi-VN").format(value);

export default function DrugResultsView({
    data,
    isLoading,
    query,
    onPageChange,
}: DrugResultsViewProps) {
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
            </div>
        );
    }

    if (!data || data.results.length === 0) {
        return (
            <div className="py-12 text-center text-slate-400">
                <Search className="mx-auto mb-4 h-12 w-12 opacity-50" />
                <p>Không tìm thấy thuốc phù hợp</p>
                <p className="mt-1 text-sm">
                    {query.trim() ? "Thử đổi từ khóa hoặc cách sắp xếp." : "Dữ liệu sẽ xuất hiện khi có tồn kho đã duyệt."}
                </p>
            </div>
        );
    }

    const totalPages = Math.max(1, Math.ceil(data.total / data.limit));

    const toggleRow = (drugCode: string) => {
        setExpandedRows((prev) => {
            const next = new Set(prev);
            if (next.has(drugCode)) {
                next.delete(drugCode);
            } else {
                next.add(drugCode);
            }
            return next;
        });
    };

    return (
        <>
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-12" />
                            <TableHead className="w-12">STT</TableHead>
                            <TableHead>Mã thuốc</TableHead>
                            <TableHead>Tên thuốc</TableHead>
                            <TableHead>Hoạt chất</TableHead>
                            <TableHead>Hàm lượng</TableHead>
                            <TableHead>Số đăng ký</TableHead>
                            <TableHead>ĐVT</TableHead>
                            <TableHead className="text-center">Số cơ sở</TableHead>
                            <TableHead className="text-right">Tổng tồn kho</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.results.map((drug, index) => (
                            <Fragment key={drug.masterDrugId || drug.drugCode}>
                                <TableRow
                                    key={`${drug.masterDrugId || drug.drugCode}-row`}
                                    className="cursor-pointer transition-colors hover:bg-blue-50"
                                    onClick={() => toggleRow(drug.masterDrugId || drug.drugCode)}
                                >
                                    <TableCell>
                                        <Button variant="ghost" size="icon" className="h-6 w-6">
                                            {expandedRows.has(drug.masterDrugId || drug.drugCode) ? (
                                                <ChevronUp className="h-4 w-4" />
                                            ) : (
                                                <ChevronDown className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {(data.page - 1) * data.limit + index + 1}
                                    </TableCell>
                                    <TableCell className="font-mono text-sm">{drug.drugCode}</TableCell>
                                    <TableCell className="font-medium">{drug.drugName}</TableCell>
                                    <TableCell className="whitespace-normal break-words align-top text-slate-600">
                                        {drug.activeIngredient}
                                    </TableCell>
                                    <TableCell className="whitespace-normal break-words align-top">
                                        {drug.dosage}
                                    </TableCell>
                                    <TableCell className="whitespace-normal break-words align-top text-slate-600">
                                        {drug.soDangKy || "-"}
                                    </TableCell>
                                    <TableCell>{drug.unit}</TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
                                            <Building2 className="mr-1 h-3 w-3" />
                                            {drug.facilityCount}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-semibold text-emerald-600">
                                        {formatNumber(drug.totalStock)}
                                    </TableCell>
                                </TableRow>

                                {expandedRows.has(drug.masterDrugId || drug.drugCode) && (
                                    <TableRow key={`${drug.masterDrugId || drug.drugCode}-facilities`}>
                                        <TableCell colSpan={10} className="bg-slate-50 p-0">
                                            <div className="px-6 py-3">
                                                <p className="mb-3 text-sm font-medium text-slate-600">
                                                    Danh sách cơ sở còn tồn kho
                                                </p>
                                                <Table className="table-auto">
                                                    <TableHeader>
                                                        <TableRow className="bg-slate-100">
                                                            <TableHead className="w-12">STT</TableHead>
                                                            <TableHead className="w-[120px]">Mã cơ sở</TableHead>
                                                            <TableHead>Tên cơ sở</TableHead>
                                                            <TableHead className="w-[120px] text-right">Tồn kho</TableHead>
                                                            <TableHead className="w-[140px] text-right">Giá VAT</TableHead>
                                                            <TableHead className="w-[120px]">Kỳ báo cáo</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {drug.facilities.map((facility, facilityIndex) => (
                                                            <TableRow key={`${drug.drugCode}-${facility.facilityId}`} className="bg-white">
                                                                <TableCell className="align-top">{facilityIndex + 1}</TableCell>
                                                                <TableCell className="font-mono text-sm align-top">
                                                                    {facility.facilityCode}
                                                                </TableCell>
                                                                <TableCell className="whitespace-normal break-words align-top font-medium">
                                                                    {facility.facilityName}
                                                                </TableCell>
                                                                <TableCell className="text-right font-semibold text-emerald-600 align-top">
                                                                    {formatNumber(facility.currentStock)}
                                                                </TableCell>
                                                                <TableCell className="text-right align-top">
                                                                    {formatNumber(facility.priceVAT)}
                                                                </TableCell>
                                                                <TableCell className="align-top text-slate-500">
                                                                    {facility.reportMonth}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </Fragment>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between border-t pt-4">
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
    );
}
