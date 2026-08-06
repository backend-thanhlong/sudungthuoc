import type { SupplySummaryMetrics } from "@/lib/dashboard/supply-insights";

interface SupplySummaryCardsProps {
    metrics: SupplySummaryMetrics;
}

const formatCurrencyCompact = (value: number) =>
    `${new Intl.NumberFormat("vi-VN", {
        notation: "compact",
        maximumFractionDigits: 1,
    }).format(value)} đ`;

const formatCount = (value: number) =>
    new Intl.NumberFormat("vi-VN").format(value);

export default function SupplySummaryCards({ metrics }: SupplySummaryCardsProps) {
    const cards = [
        {
            label: "Giá trị tồn cuối",
            value: formatCurrencyCompact(metrics.endingInventoryValue),
            tone: "border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/35 dark:text-emerald-200",
        },
        {
            label: "Giá trị xuất",
            value: formatCurrencyCompact(metrics.exportValue),
            tone: "border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-900/70 dark:bg-blue-950/35 dark:text-blue-200",
        },
        {
            label: "Số thuốc hết hàng",
            value: formatCount(metrics.stockoutCount),
            tone: "border-red-100 bg-red-50 text-red-700 dark:border-red-900/70 dark:bg-red-950/35 dark:text-red-200",
        },
        {
            label: "Thuốc dưới 1 tháng",
            value: formatCount(metrics.shortageUnderOneMonthCount),
            tone: "border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/35 dark:text-amber-200",
        },
        {
            label: "Tồn không nhu cầu",
            value: formatCount(metrics.deadStockCount),
            tone: "text-foreground bg-muted/40 border-border",
        },
        {
            label: "Hợp đồng sắp hết",
            value: formatCount(metrics.contractExpiringCount),
            tone: "border-fuchsia-100 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-900/70 dark:bg-fuchsia-950/35 dark:text-fuchsia-200",
        },
    ];

    return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 xl:gap-4">
            {cards.map(card => (
                <div key={card.label} className={`rounded-xl border p-3 shadow-sm sm:p-4 ${card.tone}`}>
                    <p className="text-xs font-medium uppercase tracking-[0.14em] opacity-70">{card.label}</p>
                    <p className="mt-2 text-xl font-bold leading-none sm:text-2xl">{card.value}</p>
                </div>
            ))}
        </div>
    );
}
