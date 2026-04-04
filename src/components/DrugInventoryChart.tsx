"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface DrugChartData {
    facilityName: string;
    drugCount: number;
}

interface DrugInventoryChartProps {
    data: DrugChartData[];
}

export default function DrugInventoryChart({ data }: DrugInventoryChartProps) {
    return (
        <div className="h-[400px] w-full">
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
                                fill={`url(#colorGradient${index % 6})`}
                            />
                        ))}
                    </Bar>
                    <defs>
                        <linearGradient id="colorGradient0" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8} />
                            <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.8} />
                        </linearGradient>
                        <linearGradient id="colorGradient1" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
                            <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.8} />
                        </linearGradient>
                        <linearGradient id="colorGradient2" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.8} />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.8} />
                        </linearGradient>
                        <linearGradient id="colorGradient3" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.8} />
                            <stop offset="100%" stopColor="#a855f7" stopOpacity={0.8} />
                        </linearGradient>
                        <linearGradient id="colorGradient4" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.8} />
                            <stop offset="100%" stopColor="#ef4444" stopOpacity={0.8} />
                        </linearGradient>
                        <linearGradient id="colorGradient5" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.8} />
                            <stop offset="100%" stopColor="#f97316" stopOpacity={0.8} />
                        </linearGradient>
                    </defs>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
