import { Activity, Building2, CircleDollarSign, Package, Percent, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { PublicDashboardKpis } from "@/lib/public-dashboard";

interface PublicDashboardKpiCardsProps {
    kpis: PublicDashboardKpis;
    formatCurrency: (value: number) => string;
    formatNumber: (value: number) => string;
    formatPercent: (value: number) => string;
}

export default function PublicDashboardKpiCards({
    kpis,
    formatCurrency,
    formatNumber,
    formatPercent,
}: PublicDashboardKpiCardsProps) {
    const cards = [
        {
            label: "Cơ sở đã nộp",
            value: `${formatNumber(kpis.submittedFacilityCount)}/${formatNumber(kpis.activeFacilityCount)}`,
            detail: `${formatPercent(kpis.submissionRate)} hoàn thành`,
            icon: Building2,
            tone: "text-sky-600 bg-sky-50 dark:bg-sky-950/40 dark:text-sky-300",
        },
        {
            label: "Giá trị tồn cuối",
            value: formatCurrency(kpis.totalInventoryValue),
            detail: "Tổng hợp toàn ngành",
            icon: CircleDollarSign,
            tone: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300",
        },
        {
            label: "Giá trị xuất",
            value: formatCurrency(kpis.totalExportValue),
            detail: "Theo kỳ báo cáo",
            icon: TrendingUp,
            tone: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-300",
        },
        {
            label: "Thuốc phát sinh",
            value: formatNumber(kpis.distinctMappedDrugCount),
            detail: "Theo mã thuốc cơ sở",
            icon: Package,
            tone: "text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300",
        },
        {
            label: "Thuốc trong nước",
            value: formatPercent(kpis.domesticExportRatio),
            detail: "Theo giá trị xuất",
            icon: Percent,
            tone: "text-rose-600 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-300",
        },
        {
            label: "Trạng thái dữ liệu",
            value: kpis.totalInventoryValue > 0 || kpis.totalExportValue > 0 ? "Có dữ liệu" : "Chưa có",
            detail: "Aggregate public",
            icon: Activity,
            tone: "text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300",
        },
    ];

    return (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            {cards.map((card) => {
                const Icon = card.icon;

                return (
                    <Card key={card.label} className="rounded-lg py-0 shadow-sm">
                        <CardContent className="flex min-h-[132px] flex-col justify-between p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
                                    <p className="mt-2 break-words text-2xl font-semibold tracking-normal text-foreground">
                                        {card.value}
                                    </p>
                                </div>
                                <span className={`flex size-9 shrink-0 items-center justify-center rounded-md ${card.tone}`}>
                                    <Icon className="size-4" />
                                </span>
                            </div>
                            <p className="mt-3 text-xs text-muted-foreground">{card.detail}</p>
                        </CardContent>
                    </Card>
                );
            })}
        </section>
    );
}
