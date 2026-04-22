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
            tone: "text-emerald-700 bg-emerald-50 border-emerald-100",
        },
        {
            label: "Giá trị xuất",
            value: formatCurrencyCompact(metrics.exportValue),
            tone: "text-blue-700 bg-blue-50 border-blue-100",
        },
        {
            label: "Số thuốc hết hàng",
            value: formatCount(metrics.stockoutCount),
            tone: "text-red-700 bg-red-50 border-red-100",
        },
        {
            label: "Thuốc dưới 1 tháng",
            value: formatCount(metrics.shortageUnderOneMonthCount),
            tone: "text-amber-700 bg-amber-50 border-amber-100",
        },
        {
            label: "Tồn không nhu cầu",
            value: formatCount(metrics.deadStockCount),
            tone: "text-slate-700 bg-slate-50 border-slate-100",
        },
        {
            label: "Hợp đồng sắp hết",
            value: formatCount(metrics.contractExpiringCount),
            tone: "text-fuchsia-700 bg-fuchsia-50 border-fuchsia-100",
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {cards.map(card => (
                <div key={card.label} className={`rounded-xl border p-4 shadow-sm ${card.tone}`}>
                    <p className="text-xs font-medium uppercase tracking-[0.14em] opacity-70">{card.label}</p>
                    <p className="mt-2 text-2xl font-bold leading-none">{card.value}</p>
                </div>
            ))}
        </div>
    );
}
