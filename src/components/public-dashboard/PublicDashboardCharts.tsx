"use client";

import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type {
    PublicDashboardGroupBreakdown,
    PublicDashboardTrendPoint,
    PublicDashboardValueBreakdown,
} from "@/lib/public-dashboard";

interface PublicDashboardChartsProps {
    groupValueBreakdown: PublicDashboardGroupBreakdown[];
    payerBreakdown: PublicDashboardValueBreakdown[];
    domesticBreakdown: PublicDashboardValueBreakdown[];
    trend: PublicDashboardTrendPoint[];
    formatCurrency: (value: number) => string;
    formatFullCurrency: (value: number) => string;
    formatNumber: (value: number) => string;
    formatPercent: (value: number) => string;
}

interface TooltipEntry {
    name?: string;
    value?: number | string;
    color?: string;
    payload?: Record<string, unknown>;
}

interface TooltipProps {
    active?: boolean;
    payload?: TooltipEntry[];
    label?: string;
}

const COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2", "#db2777", "#65a30d"];

const hasValue = (items: Array<{ value?: number; inventoryValue?: number; exportValue?: number }>) =>
    items.some((item) => (item.value || 0) > 0 || (item.inventoryValue || 0) > 0 || (item.exportValue || 0) > 0);

const EmptyChart = ({ message }: { message: string }) => (
    <div className="flex h-[280px] items-center justify-center rounded-md border border-dashed border-border bg-muted/30 px-4 text-center text-sm text-muted-foreground">
        {message}
    </div>
);

function CurrencyTooltip({ active, payload, label, formatFullCurrency }: TooltipProps & { formatFullCurrency: (value: number) => string }) {
    if (!active || !payload?.length) {
        return null;
    }

    return (
        <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-xl">
            {label && <p className="mb-1 font-medium text-foreground">{label}</p>}
            {payload.map((entry) => (
                <p key={`${entry.name}-${entry.color}`} className="text-muted-foreground">
                    <span className="mr-2 inline-block size-2 rounded-full" style={{ backgroundColor: entry.color }} />
                    {entry.name}: <span className="font-medium text-foreground">{formatFullCurrency(Number(entry.value || 0))}</span>
                </p>
            ))}
        </div>
    );
}

function PieTooltip({ active, payload, formatFullCurrency }: TooltipProps & { formatFullCurrency: (value: number) => string }) {
    const entry = payload?.[0];

    if (!active || !entry) {
        return null;
    }

    return (
        <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-xl">
            <p className="font-medium text-foreground">{entry.name}</p>
            <p className="text-muted-foreground">{formatFullCurrency(Number(entry.value || 0))}</p>
        </div>
    );
}

export default function PublicDashboardCharts({
    groupValueBreakdown,
    payerBreakdown,
    domesticBreakdown,
    trend,
    formatCurrency,
    formatFullCurrency,
    formatNumber,
    formatPercent,
}: PublicDashboardChartsProps) {
    return (
        <section className="grid gap-4 xl:grid-cols-2">
            <Card className="rounded-lg shadow-sm xl:col-span-2">
                <CardHeader>
                    <CardTitle>Cơ cấu giá trị theo nhóm thuốc</CardTitle>
                    <CardDescription>Top nhóm thuốc theo giá trị tồn cuối và giá trị xuất trong kỳ</CardDescription>
                </CardHeader>
                <CardContent>
                    {hasValue(groupValueBreakdown) ? (
                        <div className="h-[360px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={groupValueBreakdown} margin={{ top: 8, right: 16, left: 8, bottom: 64 }}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                                    <XAxis
                                        dataKey="name"
                                        angle={-28}
                                        textAnchor="end"
                                        interval={0}
                                        height={82}
                                        tick={{ fontSize: 12 }}
                                    />
                                    <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 12 }} width={78} />
                                    <Tooltip content={<CurrencyTooltip formatFullCurrency={formatFullCurrency} />} />
                                    <Legend />
                                    <Bar dataKey="inventoryValue" name="Tồn cuối" fill="#2563eb" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="exportValue" name="Xuất" fill="#16a34a" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <EmptyChart message="Chưa có dữ liệu nhóm thuốc cho kỳ này." />
                    )}
                </CardContent>
            </Card>

            <Card className="rounded-lg shadow-sm">
                <CardHeader>
                    <CardTitle>Cơ cấu nguồn chi trả</CardTitle>
                    <CardDescription>Tính theo giá trị xuất trong kỳ báo cáo</CardDescription>
                </CardHeader>
                <CardContent>
                    {hasValue(payerBreakdown) ? (
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={payerBreakdown}
                                        dataKey="value"
                                        nameKey="name"
                                        innerRadius={64}
                                        outerRadius={104}
                                        paddingAngle={2}
                                    >
                                        {payerBreakdown.map((entry, index) => (
                                            <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<PieTooltip formatFullCurrency={formatFullCurrency} />} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <EmptyChart message="Chưa có dữ liệu nguồn chi trả cho kỳ này." />
                    )}
                </CardContent>
            </Card>

            <Card className="rounded-lg shadow-sm">
                <CardHeader>
                    <CardTitle>Cơ cấu thuốc trong nước</CardTitle>
                    <CardDescription>Tỷ trọng giá trị xuất theo nguồn gốc thuốc</CardDescription>
                </CardHeader>
                <CardContent>
                    {hasValue(domesticBreakdown) ? (
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={domesticBreakdown}
                                        dataKey="value"
                                        nameKey="name"
                                        innerRadius={64}
                                        outerRadius={104}
                                        paddingAngle={2}
                                    >
                                        {domesticBreakdown.map((entry, index) => (
                                            <Cell key={entry.name} fill={index === 0 ? "#16a34a" : "#64748b"} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<PieTooltip formatFullCurrency={formatFullCurrency} />} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <EmptyChart message="Chưa có dữ liệu nguồn gốc thuốc cho kỳ này." />
                    )}
                </CardContent>
            </Card>

            <Card className="rounded-lg shadow-sm xl:col-span-2">
                <CardHeader>
                    <CardTitle>Xu hướng tổng hợp theo kỳ</CardTitle>
                    <CardDescription>Giá trị tồn, giá trị xuất và tỷ lệ nộp báo cáo qua các kỳ gần nhất</CardDescription>
                </CardHeader>
                <CardContent>
                    {trend.length > 0 ? (
                        <div className="h-[340px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={trend} margin={{ top: 8, right: 18, left: 8, bottom: 8 }}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                                    <XAxis dataKey="reportMonth" tick={{ fontSize: 12 }} />
                                    <YAxis yAxisId="money" tickFormatter={formatCurrency} tick={{ fontSize: 12 }} width={78} />
                                    <YAxis
                                        yAxisId="rate"
                                        orientation="right"
                                        tickFormatter={(value) => formatPercent(Number(value))}
                                        tick={{ fontSize: 12 }}
                                        width={62}
                                    />
                                    <Tooltip content={<CurrencyTooltip formatFullCurrency={formatFullCurrency} />} />
                                    <Legend />
                                    <Line
                                        yAxisId="money"
                                        type="monotone"
                                        dataKey="inventoryValue"
                                        name="Tồn cuối"
                                        stroke="#2563eb"
                                        strokeWidth={2}
                                        dot={{ r: 3 }}
                                    />
                                    <Line
                                        yAxisId="money"
                                        type="monotone"
                                        dataKey="exportValue"
                                        name="Xuất"
                                        stroke="#16a34a"
                                        strokeWidth={2}
                                        dot={{ r: 3 }}
                                    />
                                    <Line
                                        yAxisId="rate"
                                        type="monotone"
                                        dataKey="submissionRate"
                                        name="Tỷ lệ nộp"
                                        stroke="#f59e0b"
                                        strokeWidth={2}
                                        dot={{ r: 3 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <EmptyChart message="Chưa có dữ liệu xu hướng." />
                    )}
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        {trend.map((item) => (
                            <span key={item.reportMonth}>
                                {item.reportMonth}: {formatNumber(item.submittedFacilityCount)} cơ sở, {formatPercent(item.submissionRate)}
                            </span>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </section>
    );
}
