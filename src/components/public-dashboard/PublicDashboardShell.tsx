"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, LogIn, RefreshCw, ShieldCheck } from "lucide-react";
import PublicDashboardCharts from "@/components/public-dashboard/PublicDashboardCharts";
import PublicDashboardKpiCards from "@/components/public-dashboard/PublicDashboardKpiCards";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PublicDashboardResponse } from "@/lib/public-dashboard";

interface PublicDashboardShellProps {
    initialData: PublicDashboardResponse;
    actionHref: string;
    actionLabel: string;
    isLoggedIn: boolean;
}

const formatCurrency = (value: number) =>
    new Intl.NumberFormat("vi-VN", {
        notation: "compact",
        compactDisplay: "short",
        maximumFractionDigits: 1,
    }).format(value);

const formatFullCurrency = (value: number) =>
    new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
    }).format(value);

const formatNumber = (value: number) => new Intl.NumberFormat("vi-VN").format(value);
const formatPercent = (value: number) =>
    `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(value)}%`;

const formatUpdatedAt = (value: string | null) => {
    if (!value) {
        return "Chưa có dữ liệu cập nhật";
    }

    return new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(value));
};

export default function PublicDashboardShell({
    initialData,
    actionHref,
    actionLabel,
    isLoggedIn,
}: PublicDashboardShellProps) {
    const [data, setData] = useState(initialData);
    const [selectedReportMonth, setSelectedReportMonth] = useState(initialData.selectedReportMonth || "");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleReportMonthChange = async (reportMonth: string) => {
        setSelectedReportMonth(reportMonth);
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/public/dashboard?reportMonth=${encodeURIComponent(reportMonth)}`, {
                cache: "no-store",
            });

            if (!response.ok) {
                throw new Error("Không tải được dữ liệu kỳ báo cáo");
            }

            const nextData: PublicDashboardResponse = await response.json();
            setData(nextData);
            setSelectedReportMonth(nextData.selectedReportMonth || reportMonth);
        } catch (fetchError) {
            console.error(fetchError);
            setError("Không tải được dữ liệu. Vui lòng thử lại sau.");
        } finally {
            setIsLoading(false);
        }
    };

    const hasPeriods = data.reportPeriods.length > 0;

    return (
        <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
            <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
                <header className="flex flex-col gap-4 border-b border-slate-200 pb-4 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                            <ShieldCheck className="size-4" />
                            <span>Số liệu công khai</span>
                        </div>
                        <h1 className="mt-2 text-2xl font-semibold tracking-normal text-slate-950 sm:text-3xl dark:text-slate-50">
                            Dashboard Quản lý sử dụng thuốc
                        </h1>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base dark:text-slate-300">
                            Theo dõi số liệu tổng hợp toàn ngành theo kỳ báo cáo, phục vụ minh bạch tình hình tồn kho, sử dụng và độ phủ báo cáo.
                        </p>
                    </div>
                    <Button asChild size="lg" className="w-full sm:w-fit">
                        <Link href={actionHref}>
                            {isLoggedIn ? <ArrowRight className="size-4" /> : <LogIn className="size-4" />}
                            {actionLabel}
                        </Link>
                    </Button>
                </header>

                <section className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h2 className="text-base font-semibold text-slate-950 dark:text-slate-50">Kỳ báo cáo</h2>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                            {data.selectedReportMonth
                                ? `Đang xem kỳ ${data.selectedReportMonth}. Cập nhật: ${formatUpdatedAt(data.updatedAt)}`
                                : "Chưa có kỳ báo cáo để hiển thị."}
                        </p>
                    </div>
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                        <Select value={selectedReportMonth} onValueChange={handleReportMonthChange} disabled={!hasPeriods || isLoading}>
                            <SelectTrigger className="w-full bg-background sm:w-[180px]">
                                <SelectValue placeholder="Chọn kỳ" />
                            </SelectTrigger>
                            <SelectContent>
                                {data.reportPeriods.map((period) => (
                                    <SelectItem key={period} value={period}>
                                        {period}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <div className="flex h-9 items-center gap-2 text-sm text-muted-foreground">
                            {isLoading ? (
                                <>
                                    <Loader2 className="size-4 animate-spin" />
                                    Đang tải
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="size-4" />
                                    Cache 5 phút
                                </>
                            )}
                        </div>
                    </div>
                </section>

                {error && (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        {error}
                    </div>
                )}

                <PublicDashboardKpiCards
                    kpis={data.kpis}
                    formatCurrency={formatCurrency}
                    formatNumber={formatNumber}
                    formatPercent={formatPercent}
                />

                <PublicDashboardCharts
                    groupValueBreakdown={data.groupValueBreakdown}
                    payerBreakdown={data.payerBreakdown}
                    domesticBreakdown={data.domesticBreakdown}
                    trend={data.trend}
                    formatCurrency={formatCurrency}
                    formatFullCurrency={formatFullCurrency}
                    formatNumber={formatNumber}
                    formatPercent={formatPercent}
                />

                <footer className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                    Số liệu được tổng hợp toàn ngành và không hiển thị dữ liệu từng cơ sở.
                </footer>
            </div>
        </main>
    );
}
