"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import ChartColorShortcut from "@/components/dashboard/ChartColorShortcut";
import { useChartColors } from "@/components/dashboard/ChartColorProvider";
import { normalizeDynamicChartKey } from "@/lib/chart-colors";

interface InventoryValueData {
    facilityName: string;
    totalValue: number;
}

interface InventoryValueBarChartProps {
    data: InventoryValueData[];
}

export default function InventoryValueBarChart({ data }: InventoryValueBarChartProps) {
    const chartColors = useChartColors();

    // Format currency to VND
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
    };

    // Compact format for axis (e.g., 1B, 1M)
    const formatCompactNumber = (number: number) => {
        return new Intl.NumberFormat('vi-VN', { notation: "compact", compactDisplay: "short" }).format(number);
    };

    return (
        <div className="relative h-[400px] w-full">
            <div className="absolute right-0 top-0 z-10">
                <ChartColorShortcut chartId="inventory.inventoryValue" />
            </div>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis
                        dataKey="facilityName"
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        tick={{ fontSize: 12, fill: "#6b7280" }}
                        interval={0}
                    />
                    <YAxis
                        tick={{ fontSize: 12, fill: "#6b7280" }}
                        tickFormatter={formatCompactNumber}
                        width={80}
                    />
                    <Tooltip
                        cursor={{ fill: 'transparent' }}
                        contentStyle={{
                            backgroundColor: "white",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                            boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)"
                        }}
                        labelStyle={{ fontWeight: "bold", marginBottom: "4px", color: "#111827" }}
                        formatter={(value: number | undefined) => [formatCurrency(value || 0), "Tổng giá trị tồn"]}
                    />
                    <Bar dataKey="totalValue" radius={[4, 4, 0, 0]}>
                        {data.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={`url(#valueGradient${index})`}
                            />
                        ))}
                    </Bar>
                    <defs>
                        {data.map((entry, index) => {
                            const baseColor = chartColors.resolveColor({
                                chartId: "inventory.inventoryValue",
                                key: normalizeDynamicChartKey(entry.facilityName),
                                index,
                            });
                            const gradient = chartColors.getGradientStops(index);
                            return (
                            <linearGradient key={`${entry.facilityName}-${index}`} id={`valueGradient${index}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={baseColor} stopOpacity={0.86} />
                                <stop offset="100%" stopColor={gradient.to} stopOpacity={0.92} />
                            </linearGradient>
                            );
                        })}
                    </defs>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
