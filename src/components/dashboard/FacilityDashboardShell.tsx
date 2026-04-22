"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Tab1Overview from "./Tab1Overview";
import Tab2Supply from "./Tab2Supply";
import Tab3Tender from "./Tab3Tender";
import Tab4Analysis from "./Tab4Analysis";

interface FacilityDashboardShellProps {
    reportPeriods: string[];
    facilityName: string;
}

export default function FacilityDashboardShell({ reportPeriods, facilityName }: FacilityDashboardShellProps) {
    const [selectedMonth, setSelectedMonth] = useState<string>("all");
    const [activeTab, setActiveTab] = useState("overview");

    const tabIcons: Record<string, string> = {
        overview: "📊",
        supply: "📦",
        tender: "📋",
        analysis: "🔬",
    };

    const apiPrefix = "/api/facility/dashboard";

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Dashboard - {facilityName}</h2>
                    <p className="text-gray-500 text-sm mt-0.5">Phân tích và giám sát hoạt động dược của đơn vị</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Report Period Filter */}
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-600">Kỳ báo cáo:</label>
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 min-w-[150px]"
                        >
                            <option value="all">Tất cả các kỳ</option>
                            {reportPeriods.map(month => (
                                <option key={month} value={month}>{month}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full bg-white border border-gray-200 rounded-xl p-1 shadow-sm h-auto flex-wrap">
                    <TabsTrigger
                        value="overview"
                        className="flex-1 min-w-[140px] data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg py-2.5 px-3 text-sm font-medium transition-all"
                    >
                        <span className="mr-1.5">{tabIcons.overview}</span>
                        Tổng quan
                    </TabsTrigger>
                    <TabsTrigger
                        value="supply"
                        className="flex-1 min-w-[140px] data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg py-2.5 px-3 text-sm font-medium transition-all"
                    >
                        <span className="mr-1.5">{tabIcons.supply}</span>
                        Cung ứng
                    </TabsTrigger>
                    <TabsTrigger
                        value="tender"
                        className="flex-1 min-w-[140px] data-[state=active]:bg-amber-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg py-2.5 px-3 text-sm font-medium transition-all"
                    >
                        <span className="mr-1.5">{tabIcons.tender}</span>
                        Đấu thầu
                    </TabsTrigger>
                    <TabsTrigger
                        value="analysis"
                        className="flex-1 min-w-[140px] data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg py-2.5 px-3 text-sm font-medium transition-all"
                    >
                        <span className="mr-1.5">{tabIcons.analysis}</span>
                        Phân tích
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-5">
                    <Tab1Overview reportMonth={selectedMonth} facilityId="" apiPrefix={apiPrefix} />
                </TabsContent>

                <TabsContent value="supply" className="mt-5">
                    <Tab2Supply reportMonth={selectedMonth} facilityId="" apiPrefix={apiPrefix} scope="facility" />
                </TabsContent>

                <TabsContent value="tender" className="mt-5">
                    <Tab3Tender reportMonth={selectedMonth} facilityId="" apiPrefix={apiPrefix} />
                </TabsContent>

                <TabsContent value="analysis" className="mt-5">
                    <Tab4Analysis reportMonth={selectedMonth} facilityId="" apiPrefix={apiPrefix} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
