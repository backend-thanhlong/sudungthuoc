"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Tab1Overview from "./Tab1Overview";
import Tab2Supply from "./Tab2Supply";
import Tab3Tender from "./Tab3Tender";
import Tab4Analysis from "./Tab4Analysis";
import Tab5RareDrugs from "./Tab5RareDrugs";

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
        rareDrugs: "💊",
    };

    const apiPrefix = "/api/facility/dashboard";

    return (
        <div className="space-y-4 sm:space-y-5">
            {/* Header */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0">
                    <h2 className="text-xl font-bold text-foreground sm:text-2xl">Dashboard - {facilityName}</h2>
                    <p className="text-muted-foreground text-sm mt-0.5">Phân tích và giám sát hoạt động dược của đơn vị</p>
                </div>
                <div className="grid w-full grid-cols-1 gap-3 sm:w-auto">
                    {/* Report Period Filter */}
                    <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
                        <label className="text-sm font-medium text-muted-foreground">Kỳ báo cáo:</label>
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="w-full min-w-0 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 sm:min-w-[150px]"
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
                <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-xl border border-border bg-card p-1 shadow-sm sm:grid-cols-5">
                    <TabsTrigger
                        value="overview"
                        className="min-w-0 data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg py-2.5 px-2 text-sm font-medium transition-all"
                    >
                        <span className="mr-1.5">{tabIcons.overview}</span>
                        Tổng quan
                    </TabsTrigger>
                    <TabsTrigger
                        value="supply"
                        className="min-w-0 data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg py-2.5 px-2 text-sm font-medium transition-all"
                    >
                        <span className="mr-1.5">{tabIcons.supply}</span>
                        Cung ứng
                    </TabsTrigger>
                    <TabsTrigger
                        value="tender"
                        className="min-w-0 data-[state=active]:bg-amber-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg py-2.5 px-2 text-sm font-medium transition-all"
                    >
                        <span className="mr-1.5">{tabIcons.tender}</span>
                        Đấu thầu
                    </TabsTrigger>
                    <TabsTrigger
                        value="analysis"
                        className="min-w-0 data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg py-2.5 px-2 text-sm font-medium transition-all"
                    >
                        <span className="mr-1.5">{tabIcons.analysis}</span>
                        Phân tích sử dụng thuốc
                    </TabsTrigger>
                    <TabsTrigger
                        value="rareDrugs"
                        className="min-w-0 data-[state=active]:bg-rose-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg py-2.5 px-2 text-sm font-medium transition-all"
                    >
                        <span className="mr-1.5">{tabIcons.rareDrugs}</span>
                        Thuốc hiếm
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

                <TabsContent value="rareDrugs" className="mt-5">
                    <Tab5RareDrugs reportMonth={selectedMonth} facilityId="" apiPrefix={apiPrefix} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
