"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Search, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FacilityStock {
    facilityCode: string;
    facilityName: string;
    currentStock: number;
    priceVAT: number;
    reportMonth: string;
}

interface DrugInventory {
    drugCode: string;
    drugName: string;
    activeIngredient: string;
    dosage: string;
    unit: string;
    facilities: FacilityStock[];
    totalStock: number;
    facilityCount: number;
}

interface SearchResult {
    results: DrugInventory[];
    total: number;
    page: number;
    limit: number;
}

export default function InventorySearchPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const [results, setResults] = useState<DrugInventory[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [isLoading, setIsLoading] = useState(false);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(searchQuery);
            setPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const fetchInventory = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                q: debouncedQuery,
                page: page.toString(),
                limit: limit.toString(),
            });
            const res = await fetch(`/api/inventory-search?${params}`);
            if (res.ok) {
                const data: SearchResult = await res.json();
                setResults(data.results);
                setTotal(data.total);
            }
        } catch (error) {
            console.error("Error fetching inventory:", error);
        } finally {
            setIsLoading(false);
        }
    }, [debouncedQuery, page, limit]);

    useEffect(() => {
        fetchInventory();
    }, [fetchInventory]);

    const toggleRow = (drugCode: string) => {
        setExpandedRows(prev => {
            const next = new Set(prev);
            if (next.has(drugCode)) {
                next.delete(drugCode);
            } else {
                next.add(drugCode);
            }
            return next;
        });
    };

    const totalPages = Math.ceil(total / limit);

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat("vi-VN").format(num);
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold text-gray-800">Tra cứu tồn kho</h2>
                <p className="text-gray-500 mt-1">
                    Tìm kiếm thuốc và xem tồn kho tại các cơ sở trên địa bàn
                </p>
            </div>

            {/* Search Card */}
            <Card className="border-0 shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Search className="w-5 h-5 text-blue-500" />
                        Tìm kiếm
                    </CardTitle>
                    <CardDescription>
                        Nhập tên thuốc, hoạt chất, hoặc mã thuốc để tìm kiếm
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="VD: Paracetamol, Amoxicillin..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Button
                            onClick={fetchInventory}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            Tìm kiếm
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Results Card */}
            <Card className="border-0 shadow-lg">
                <CardHeader>
                    <CardTitle>Kết quả tìm kiếm</CardTitle>
                    <CardDescription>
                        {isLoading
                            ? "Đang tìm kiếm..."
                            : `Tìm thấy ${formatNumber(total)} thuốc`}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : results.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>Không tìm thấy kết quả phù hợp</p>
                            <p className="text-sm mt-1">
                                Thử tìm kiếm với từ khóa khác
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-12"></TableHead>
                                            <TableHead className="w-12">STT</TableHead>
                                            <TableHead>Mã thuốc</TableHead>
                                            <TableHead>Tên thuốc</TableHead>
                                            <TableHead>Hoạt chất</TableHead>
                                            <TableHead>Hàm lượng</TableHead>
                                            <TableHead>ĐVT</TableHead>
                                            <TableHead className="text-center">Số cơ sở</TableHead>
                                            <TableHead className="text-right">Tổng tồn kho</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {results.map((drug, index) => (
                                            <React.Fragment key={drug.drugCode}>
                                                {/* Main drug row */}
                                                <TableRow
                                                    key={drug.drugCode}
                                                    className="cursor-pointer hover:bg-blue-50 transition-colors"
                                                    onClick={() => toggleRow(drug.drugCode)}
                                                >
                                                    <TableCell>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6">
                                                            {expandedRows.has(drug.drugCode) ? (
                                                                <ChevronUp className="w-4 h-4" />
                                                            ) : (
                                                                <ChevronDown className="w-4 h-4" />
                                                            )}
                                                        </Button>
                                                    </TableCell>
                                                    <TableCell className="font-medium">
                                                        {(page - 1) * limit + index + 1}
                                                    </TableCell>
                                                    <TableCell className="font-mono text-sm">
                                                        {drug.drugCode}
                                                    </TableCell>
                                                    <TableCell className="font-medium">
                                                        {drug.drugName}
                                                    </TableCell>
                                                    <TableCell className="text-gray-600">
                                                        {drug.activeIngredient}
                                                    </TableCell>
                                                    <TableCell>{drug.dosage}</TableCell>
                                                    <TableCell>{drug.unit}</TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                                            <Building2 className="w-3 h-3 mr-1" />
                                                            {drug.facilityCount}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right font-semibold text-emerald-600">
                                                        {formatNumber(drug.totalStock)}
                                                    </TableCell>
                                                </TableRow>

                                                {/* Expanded facilities */}
                                                {expandedRows.has(drug.drugCode) && (
                                                    <TableRow key={`${drug.drugCode}-facilities`}>
                                                        <TableCell colSpan={9} className="bg-gray-50 p-0">
                                                            <div className="px-8 py-4">
                                                                <p className="text-sm font-medium text-gray-600 mb-3">
                                                                    Danh sách cơ sở có tồn kho:
                                                                </p>
                                                                <Table>
                                                                    <TableHeader>
                                                                        <TableRow className="bg-gray-100">
                                                                            <TableHead className="w-12">STT</TableHead>
                                                                            <TableHead>Mã cơ sở</TableHead>
                                                                            <TableHead>Tên cơ sở</TableHead>
                                                                            <TableHead className="text-right">Tồn kho</TableHead>
                                                                            <TableHead className="text-right">Giá VAT</TableHead>
                                                                            <TableHead>Kỳ báo cáo</TableHead>
                                                                        </TableRow>
                                                                    </TableHeader>
                                                                    <TableBody>
                                                                        {drug.facilities.map((facility, fIndex) => (
                                                                            <TableRow key={`${drug.drugCode}-${facility.facilityCode}`} className="bg-white">
                                                                                <TableCell>{fIndex + 1}</TableCell>
                                                                                <TableCell className="font-mono text-sm">
                                                                                    {facility.facilityCode}
                                                                                </TableCell>
                                                                                <TableCell className="font-medium">
                                                                                    {facility.facilityName}
                                                                                </TableCell>
                                                                                <TableCell className="text-right font-semibold text-emerald-600">
                                                                                    {formatNumber(facility.currentStock)}
                                                                                </TableCell>
                                                                                <TableCell className="text-right">
                                                                                    {formatNumber(facility.priceVAT)}
                                                                                </TableCell>
                                                                                <TableCell className="text-gray-500">
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
                                            </React.Fragment>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                                    <p className="text-sm text-gray-500">
                                        Trang {page} / {totalPages}
                                    </p>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPage(p => Math.max(1, p - 1))}
                                            disabled={page === 1}
                                        >
                                            <ChevronLeft className="w-4 h-4 mr-1" />
                                            Trước
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                            disabled={page === totalPages}
                                        >
                                            Sau
                                            <ChevronRight className="w-4 h-4 ml-1" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
