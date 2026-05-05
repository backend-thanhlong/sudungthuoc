import type { SupplyScope, SupplyValueRiskRow } from "@/lib/dashboard/supply-insights";

interface SupplyValueSectionsProps {
    scope: SupplyScope;
    topOverstockByValue: SupplyValueRiskRow[];
    topShortageByRiskValue: SupplyValueRiskRow[];
}

const formatNumber = (value: number) =>
    new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(value);

const formatCurrencyCompact = (value: number) =>
    `${new Intl.NumberFormat("vi-VN", {
        notation: "compact",
        maximumFractionDigits: 1,
    }).format(value)} đ`;

function ValueRiskTable({
    rows,
    scope,
    title,
    subtitle,
    valueLabel,
    valueKey,
    tone,
    emptyText,
}: {
    rows: SupplyValueRiskRow[];
    scope: SupplyScope;
    title: string;
    subtitle: string;
    valueLabel: string;
    valueKey: "endingInventoryValue" | "riskValue";
    tone: string;
    emptyText: string;
}) {
    return (
        <div className="rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm">
            <h3 className="font-semibold text-foreground mb-1">{title}</h3>
            <p className="text-xs text-muted-foreground mb-4">{subtitle}</p>
            <div className="overflow-x-auto max-h-[340px] overflow-y-auto">
                <table className="w-full text-sm">
                    <thead className="sticky top-0">
                        <tr className={tone}>
                            <th className="text-left p-3 font-semibold rounded-tl-lg">STT</th>
                            {scope === "admin" && <th className="text-left p-3 font-semibold">Cơ sở</th>}
                            <th className="text-left p-3 font-semibold">Thuốc</th>
                            <th className="text-right p-3 font-semibold">{valueLabel}</th>
                            <th className="text-right p-3 font-semibold">Nhu cầu BQ</th>
                            <th className="text-right p-3 font-semibold rounded-tr-lg">Độ phủ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, index) => (
                            <tr key={`${row.facility}-${row.drugName}-${index}`} className="border-b border-border hover:bg-muted/40 transition-colors">
                                <td className="p-3 text-muted-foreground">{index + 1}</td>
                                {scope === "admin" && <td className="p-3 text-foreground">{row.facility}</td>}
                                <td className="p-3">
                                    <p className="font-medium text-foreground">{row.drugName}</p>
                                    <p className="text-xs text-muted-foreground">{row.hoatChat}{row.hamLuong ? ` • ${row.hamLuong}` : ""}</p>
                                    <p className="text-xs text-muted-foreground/70">{row.supplierName}</p>
                                </td>
                                <td className="p-3 text-right font-mono font-semibold text-foreground">
                                    {formatCurrencyCompact(row[valueKey])}
                                </td>
                                <td className="p-3 text-right font-mono text-foreground">{formatNumber(row.demandAvg)}</td>
                                <td className="p-3 text-right font-mono text-foreground">{formatNumber(row.monthsOfCover)} tháng</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {rows.length === 0 && (
                    <p className="text-center text-muted-foreground/70 py-8">{emptyText}</p>
                )}
            </div>
        </div>
    );
}

export default function SupplyValueSections({
    scope,
    topOverstockByValue,
    topShortageByRiskValue,
}: SupplyValueSectionsProps) {
    return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <ValueRiskTable
                rows={topOverstockByValue}
                scope={scope}
                title={scope === "admin" ? "Top tồn giá trị cao nhưng độ phủ lớn" : "Top tồn giá trị cao"}
                subtitle="Ưu tiên các thuốc đang giam vốn và vẫn còn độ phủ tồn kho từ 3 tháng trở lên."
                valueLabel="Giá trị tồn"
                valueKey="endingInventoryValue"
                tone="bg-gradient-to-r from-emerald-600 to-teal-600 text-white"
                emptyText="Không có thuốc nào vừa tồn giá trị cao vừa có độ phủ từ 3 tháng trở lên."
            />
            <ValueRiskTable
                rows={topShortageByRiskValue}
                scope={scope}
                title={scope === "admin" ? "Top thuốc nguy cơ thiếu theo giá trị" : "Danh sách thuốc cần ưu tiên mua bổ sung"}
                subtitle="Ưu tiên các thuốc có độ phủ dưới 1 tháng và giá trị rủi ro cao."
                valueLabel="Giá trị rủi ro"
                valueKey="riskValue"
                tone="bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                emptyText="Không có thuốc nào dưới 1 tháng đủ dùng trong bộ lọc hiện tại."
            />
        </div>
    );
}
