"use client";

import { useState, useMemo } from "react";
import InventoryValueBarChart from "./InventoryValueBarChart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface InventoryValueData {
    facilityId: string;
    facilityName: string;
    month: string;
    totalValue: number;
}

interface InventoryValueChartWithFiltersProps {
    data: InventoryValueData[];
    reportPeriods: string[];
}

export default function InventoryValueChartWithFilters({ data, reportPeriods }: InventoryValueChartWithFiltersProps) {
    const [selectedMonth, setSelectedMonth] = useState<string>("all");

    // Filter data based on selected month
    const filteredData = useMemo(() => {
        let currentData = data;

        if (selectedMonth !== "all") {
            currentData = data.filter(item => item.month === selectedMonth);
        } else {
            // For the aggregate view, keep one latest snapshot per facility.
            const latestByFacility = new Map<string, InventoryValueData>();

            data.forEach(item => {
                const existing = latestByFacility.get(item.facilityId);
                if (!existing || isLater(item.month, existing.month)) {
                    latestByFacility.set(item.facilityId, item);
                }
            });

            currentData = Array.from(latestByFacility.values());
        }

        // Sort by value descending
        return currentData.sort((a, b) => b.totalValue - a.totalValue);
    }, [data, selectedMonth]);

    // Helper to compare MM/YYYY dates
    function isLater(date1: string, date2: string) {
        const [m1, y1] = date1.split('/').map(Number);
        const [m2, y2] = date2.split('/').map(Number);
        if (y1 > y2) return true;
        if (y1 === y2 && m1 > m2) return true;
        return false;
    }

    return (
        <Card className="border-0 shadow-lg">
            <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <CardTitle>Giá trị tồn kho tại các đơn vị</CardTitle>
                        <CardDescription>Tổng thành tiền tồn cuối theo báo cáo</CardDescription>
                    </div>
                    <div className="w-full md:w-[200px]">
                        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                            <SelectTrigger>
                                <SelectValue placeholder="Tất cả các kỳ" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tất cả các kỳ</SelectItem>
                                {reportPeriods.map(month => (
                                    <SelectItem key={month} value={month}>
                                        {month}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {filteredData.length > 0 ? (
                    <InventoryValueBarChart data={filteredData} />
                ) : (
                    <div className="h-[400px] flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-gray-500 text-center">
                            Không có dữ liệu cho kỳ báo cáo đã chọn
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
