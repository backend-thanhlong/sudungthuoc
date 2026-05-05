"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Tab1Overview from "./Tab1Overview";
import Tab2Supply from "./Tab2Supply";
import Tab3Tender from "./Tab3Tender";
import Tab4Analysis from "./Tab4Analysis";

interface Facility {
    id: string;
    name: string;
    type: string;
}

interface DashboardShellProps {
    reportPeriods: string[];
    facilities: Facility[];
}

export default function DashboardShell({ reportPeriods, facilities }: DashboardShellProps) {
    const [selectedMonth, setSelectedMonth] = useState<string>("all");
    const [selectedFacility, setSelectedFacility] = useState<string>("all");
    const [activeTab, setActiveTab] = useState("overview");

    const tabIcons: Record<string, string> = {
        overview: "📊",
        supply: "📦",
        tender: "📋",
        analysis: "🔬",
    };

    const facilityId = selectedFacility === "all" ? "" : selectedFacility;
    const selectedFacilityName = selectedFacility === "all"
        ? "Tất cả đơn vị"
        : facilities.find(f => f.id === selectedFacility)?.name || "";

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-foreground">Dashboard Quản lý Dược</h2>
                    <p className="text-muted-foreground text-sm mt-0.5">Phân tích và giám sát hoạt động dược toàn ngành</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Facility Filter */}
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                            <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            Đơn vị:
                        </label>
                        <select
                            value={selectedFacility}
                            onChange={(e) => setSelectedFacility(e.target.value)}
                            className="px-3 py-2 border border-border rounded-lg text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 min-w-[220px] max-w-[320px]"
                        >
                            <option value="all">🏥 Tất cả đơn vị</option>
                            {facilities.map(f => (
                                <option key={f.id} value={f.id}>
                                    {f.name}{f.type ? ` (${f.type})` : ""}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Divider */}
                    <div className="hidden md:block w-px h-8 bg-border" />

                    {/* Report Period Filter */}
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-muted-foreground">Kỳ báo cáo:</label>
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="px-3 py-2 border border-border rounded-lg text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 min-w-[150px]"
                        >
                            <option value="all">Tất cả các kỳ</option>
                            {reportPeriods.map(month => (
                                <option key={month} value={month}>{month}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Active Filter Badge */}
            {selectedFacility !== "all" && (
                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-sm font-medium dark:border-blue-900/70 dark:bg-blue-950/45 dark:text-blue-200">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        {selectedFacilityName}
                        <button
                            onClick={() => setSelectedFacility("all")}
                            className="ml-1 hover:bg-blue-200 rounded-full p-0.5 transition-colors dark:hover:bg-blue-900"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </span>
                    <span className="text-xs text-muted-foreground">Đang xem dữ liệu của đơn vị này</span>
                </div>
            )}

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full bg-card border border-border rounded-xl p-1 shadow-sm h-auto flex-wrap">
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
                    <Tab1Overview reportMonth={selectedMonth} facilityId={facilityId} />
                </TabsContent>

                <TabsContent value="supply" className="mt-5">
                    <Tab2Supply reportMonth={selectedMonth} facilityId={facilityId} scope="admin" />
                </TabsContent>

                <TabsContent value="tender" className="mt-5">
                    <Tab3Tender reportMonth={selectedMonth} facilityId={facilityId} />
                </TabsContent>

                <TabsContent value="analysis" className="mt-5">
                    <Tab4Analysis reportMonth={selectedMonth} facilityId={facilityId} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
