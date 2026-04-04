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
    // Default to the latest month if available, otherwise "all"
    const latestMonth = reportPeriods.length > 0 ? reportPeriods[0] : "all";
    const [selectedMonth, setSelectedMonth] = useState<string>(latestMonth);

    // Filter data based on selected month
    const filteredData = useMemo(() => {
        let currentData = data;

        if (selectedMonth !== "all") {
            currentData = data.filter(item => item.month === selectedMonth);
        } else {
            // When "all" is selected, we should probably aggregate values by facility across all months
            // OR show an average. For simplicity and meaningful data, let's SUM user values.
            // But wait, summing inventory value across months doesn't make sense (it's a snapshot).
            // So if "all" is selected, let's show the LATEST data for each facility.

            // Group by facility and find the latest report for each
            const latestByFacility = new Map<string, InventoryValueData>();

            data.forEach(item => {
                const existing = latestByFacility.get(item.facilityId);
                // Simple string comparison for "MM/YYYY" isn't perfect for sorting time, 
                // but if we assume data comes sorted or we parse it, it's safer.
                // Here we rely on the fact that we probably want the most recent entry.
                // Let's assume the API returns data that helps us, or we parse the date.
                // Ideally, the user should select a specific month.
                // Let's just default to showing the raw data if it matches, 
                // OR we just summing it up is WRONG.
                // Safe bet: Default to latest month.

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
                                <SelectValue placeholder="Chọn tháng" />
                            </SelectTrigger>
                            <SelectContent>
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
                            Không có dữ liệu cho tháng đã chọn
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
