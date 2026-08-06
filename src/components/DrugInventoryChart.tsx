"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import ChartColorShortcut from "@/components/dashboard/ChartColorShortcut";
import { useChartColors } from "@/components/dashboard/ChartColorProvider";
import { normalizeDynamicChartKey } from "@/lib/chart-colors";

interface DrugChartData {
    facilityName: string;
    drugCount: number;
}

interface DrugInventoryChartProps {
    data: DrugChartData[];
}

export default function DrugInventoryChart({ data }: DrugInventoryChartProps) {
    const chartColors = useChartColors();

    return (
        <div className="relative h-[400px] w-full">
            <div className="absolute right-0 top-0 z-10">
                <ChartColorShortcut chartId="inventory.drugQuantity" />
            </div>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                        dataKey="facilityName"
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        tick={{ fontSize: 12 }}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: "white",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
                        }}
                        labelStyle={{ fontWeight: "bold", marginBottom: "4px" }}
                        formatter={(value: number | undefined) => [`${value || 0} thuốc`, "Số lượng"]}
                    />
                    <Bar dataKey="drugCount" radius={[8, 8, 0, 0]}>
                        {data.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={`url(#colorGradient${index})`}
                            />
                        ))}
                    </Bar>
                    <defs>
                        {data.map((entry, index) => {
                            const baseColor = chartColors.resolveColor({
                                chartId: "inventory.drugQuantity",
                                key: normalizeDynamicChartKey(entry.facilityName),
                                index,
                            });
                            const gradient = chartColors.getGradientStops(index);
                            return (
                            <linearGradient key={`${entry.facilityName}-${index}`} id={`colorGradient${index}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={baseColor} stopOpacity={0.82} />
                                <stop offset="100%" stopColor={gradient.to} stopOpacity={0.9} />
                            </linearGradient>
                            );
                        })}
                    </defs>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
