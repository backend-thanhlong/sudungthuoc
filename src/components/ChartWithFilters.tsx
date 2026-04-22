"use client";

import { useState } from "react";
import DrugInventoryChart from "./DrugInventoryChart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ChartData {
    facilityName: string;
    drugCount: number;
}

interface Facility {
    id: string;
    facilityName: string;
}

interface ChartWithFiltersProps {
    chartData: ChartData[];
    facilities: Facility[];
    reportPeriods: string[];
}

export default function ChartWithFilters({ chartData, facilities, reportPeriods }: ChartWithFiltersProps) {
    const [selectedMonth, setSelectedMonth] = useState<string>("all");
    const [selectedFacility, setSelectedFacility] = useState<string>("all");

    // Filter chart data based on selections
    const filteredData = chartData.filter(item => {
        // If facility filter is applied, only show that facility
        if (selectedFacility !== "all" && item.facilityName !== selectedFacility) {
            return false;
        }
        return true;
    });

    return (
        <div className="space-y-4">
            {/* Filter Controls */}
            <div className="flex flex-wrap gap-4">
                {/* Month Filter */}
                <div className="flex-1 min-w-[200px]">
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                        Chọn tháng báo cáo
                    </label>
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger className="w-full">
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

                {/* Facility Filter */}
                <div className="flex-1 min-w-[200px]">
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                        Chọn cơ sở
                    </label>
                    <Select value={selectedFacility} onValueChange={setSelectedFacility}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Tất cả cơ sở" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tất cả cơ sở</SelectItem>
                            {facilities.map(facility => (
                                <SelectItem key={facility.id} value={facility.facilityName}>
                                    {facility.facilityName}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Chart */}
            {filteredData.length > 0 ? (
                <DrugInventoryChart data={filteredData} />
            ) : (
                <div className="h-[400px] flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-gray-500 text-center">
                        Không có dữ liệu cho bộ lọc đã chọn
                    </p>
                </div>
            )}
        </div>
    );
}
