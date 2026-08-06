"use client";

import { useEffect, useMemo, useState } from "react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import {
    PACKAGE_STATUS_LABELS,
    type PackageStatusBreakdown,
    type PackageStatusBreakdownItem,
    type PackageStatusChartItem,
    type PackageStatusKey,
    type PackageStatusSummary,
} from "@/lib/mua-sam-package-status";
import ChartColorShortcut from "@/components/dashboard/ChartColorShortcut";
import { useChartColors } from "@/components/dashboard/ChartColorProvider";

function StatusTick({
    x = 0,
    y = 0,
    payload,
    color,
}: {
    x?: number;
    y?: number;
    payload?: { value?: string };
    color: string;
}) {
    const label = payload?.value || "";
    const lines = label === PACKAGE_STATUS_LABELS.daCoTbmtChuaCoKqlcnt
        ? ["Đã có TBMT", "chưa có KQLCNT"]
        : label === PACKAGE_STATUS_LABELS.khongYeuCauTbmt
            ? ["Không yêu cầu", "TBMT"]
        : [label];

    return (
        <g transform={`translate(${x},${y})`}>
            <text textAnchor="middle" fill={color} fontSize={11}>
                {lines.map((line, index) => (
                    <tspan key={`${line}-${index}`} x={0} dy={index === 0 ? 16 : 14}>
                        {line}
                    </tspan>
                ))}
            </text>
        </g>
    );
}

function PresenceBadge({ count, label }: { count: number; label: string }) {
    const hasValue = count > 0;

    return (
        <span
            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${hasValue
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-slate-100 text-slate-600"
                }`}
        >
            {hasValue ? `Đã có (${count})` : label}
        </span>
    );
}

function getPlanLabel(item: Pick<PackageStatusBreakdownItem, "tenKHLCNT" | "maKHLCNT">) {
    return item.tenKHLCNT?.trim() || item.maKHLCNT?.trim() || "—";
}

interface PackageStatusChartCardProps {
    statusData: PackageStatusChartItem[];
    statusBreakdown: PackageStatusBreakdown;
    statusSummary: PackageStatusSummary;
    showFacilityColumn?: boolean;
}

export default function PackageStatusChartCard({
    statusData,
    statusBreakdown,
    statusSummary,
    showFacilityColumn = false,
}: PackageStatusChartCardProps) {
    const [selectedStatusKey, setSelectedStatusKey] = useState<PackageStatusKey | null>(null);
    const chartColors = useChartColors();
    const statusColors: Record<PackageStatusKey, string> = {
        chuaCoTbmt: chartColors.resolveColor({ chartId: "muaSam.packageStatus", key: "chuaCoTbmt", semanticKey: "neutral" }),
        daCoTbmtChuaCoKqlcnt: chartColors.resolveColor({ chartId: "muaSam.packageStatus", key: "daCoTbmtChuaCoKqlcnt", semanticKey: "warning" }),
        khongYeuCauTbmt: chartColors.resolveColor({ chartId: "muaSam.packageStatus", key: "khongYeuCauTbmt", semanticKey: "service" }),
        daCoKqlcnt: chartColors.resolveColor({ chartId: "muaSam.packageStatus", key: "daCoKqlcnt", semanticKey: "success" }),
    };
    const neutralColor = chartColors.resolveColor({ semanticKey: "neutral" });
    const mutedColor = chartColors.resolveColor({ semanticKey: "muted" });

    useEffect(() => {
        setSelectedStatusKey(null);
    }, [statusData, statusSummary.totalTrackedPackages]);

    const selectedItems = useMemo(
        () => (selectedStatusKey ? statusBreakdown[selectedStatusKey] : []),
        [selectedStatusKey, statusBreakdown]
    );

    const handleStatusSelect = (statusKey: PackageStatusKey) => {
        setSelectedStatusKey((current) => (current === statusKey ? null : statusKey));
    };

    return (
        <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-100">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h3 className="font-semibold text-gray-800 mb-1">Trạng thái gói thầu</h3>
                    <p className="text-xs text-gray-500">
                        Phân loại theo tiến độ nghiệp vụ thực tế của gói thầu quy trình 1
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <ChartColorShortcut chartId="muaSam.packageStatus" />
                    {selectedStatusKey && (
                        <button
                            type="button"
                            onClick={() => setSelectedStatusKey(null)}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
                        >
                            Bỏ chọn
                        </button>
                    )}
                </div>
            </div>

            <div className="h-[380px] mt-4">
                {statusSummary.totalTrackedPackages > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={statusData} margin={{ top: 10, right: 20, left: 10, bottom: 45 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="name" tick={<StatusTick color={neutralColor} />} interval={0} height={58} />
                            <YAxis tick={{ fontSize: 11, fill: neutralColor }} allowDecimals={false} />
                            <Tooltip
                                cursor={{ fill: "#f8fafc" }}
                                contentStyle={{ backgroundColor: "white", borderRadius: "10px", border: "1px solid #e2e8f0" }}
                                formatter={(value: number | undefined) => [value ?? 0, "Số gói thầu"]}
                            />
                            <Bar
                                dataKey="value"
                                radius={[6, 6, 0, 0]}
                                onClick={(_, index) => {
                                    const clickedItem = statusData[index];
                                    if (clickedItem) {
                                        handleStatusSelect(clickedItem.key);
                                    }
                                }}
                            >
                                {statusData.map((item) => (
                                    <Cell
                                        key={item.key}
                                        cursor="pointer"
                                        fill={selectedStatusKey && selectedStatusKey !== item.key ? mutedColor : statusColors[item.key]}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center text-sm text-slate-500">
                        Chưa có gói thầu quy trình 1 để thống kê
                    </div>
                )}
            </div>

            <p className="mt-3 text-xs text-slate-500">
                Bấm vào cột trên biểu đồ hoặc nút trạng thái bên dưới để xem danh sách gói thầu tương ứng.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
                {statusData.map((item) => {
                    const isSelected = selectedStatusKey === item.key;
                    return (
                        <button
                            key={item.key}
                            type="button"
                            onClick={() => handleStatusSelect(item.key)}
                            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${isSelected
                                ? "border-slate-900 bg-slate-900 text-white"
                                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                }`}
                        >
                            <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: isSelected ? "#ffffff" : statusColors[item.key] }}
                            />
                            <span>{item.name}</span>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${isSelected ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600"}`}>
                                {item.value}
                            </span>
                        </button>
                    );
                })}
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                {!selectedStatusKey ? (
                    <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-800">
                            Đang theo dõi {statusSummary.totalTrackedPackages} gói thầu thuộc quy trình 1
                        </p>
                        <p className="text-xs text-slate-500">
                            Dữ liệu dưới đây tách riêng gói chưa có TBMT và gói thuộc trường hợp không yêu cầu TBMT.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm font-semibold text-slate-800">
                                {PACKAGE_STATUS_LABELS[selectedStatusKey]}
                            </p>
                            <p className="text-xs text-slate-500">
                                {selectedItems.length} gói thầu trong trạng thái này
                            </p>
                        </div>

                        {selectedItems.length > 0 ? (
                            <div className="max-h-[340px] overflow-auto rounded-xl border border-slate-200 bg-white">
                                <table className={`w-full text-sm ${showFacilityColumn ? "min-w-[860px]" : "min-w-[720px]"}`}>
                                    <thead className="sticky top-0 bg-slate-100 text-slate-700">
                                        <tr>
                                            {showFacilityColumn && (
                                                <th className="px-4 py-3 text-left font-semibold">Cơ sở</th>
                                            )}
                                            <th className="px-4 py-3 text-left font-semibold">Tên gói thầu</th>
                                            <th className="px-4 py-3 text-left font-semibold">Kế hoạch</th>
                                            <th className="px-4 py-3 text-left font-semibold">TBMT</th>
                                            <th className="px-4 py-3 text-left font-semibold">KQLCNT</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedItems.map((item) => (
                                            <tr key={item.goiThauId} className="border-t border-slate-100 align-top">
                                                {showFacilityColumn && (
                                                    <td className="px-4 py-3 text-slate-700">
                                                        {item.facilityName?.trim() || "—"}
                                                    </td>
                                                )}
                                                <td className="px-4 py-3 font-medium text-slate-800">
                                                    {item.tenGoiThau}
                                                </td>
                                                <td className="px-4 py-3 text-slate-700">
                                                    {getPlanLabel(item)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <PresenceBadge count={item.tbmtCount} label="Chưa có" />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <PresenceBadge count={item.kqlcntCount} label="Chưa có" />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
                                Không có gói thầu ở trạng thái này
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
