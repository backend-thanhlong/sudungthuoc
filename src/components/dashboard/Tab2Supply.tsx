"use client";

import { useState, useEffect } from "react";
import {
    ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ZAxis, Cell, ReferenceLine,
} from "recharts";

interface Tab2Props {
    reportMonth: string;
    facilityId: string;
    apiPrefix?: string;
}

const formatCompact = (value: number) =>
    new Intl.NumberFormat('vi-VN', { notation: "compact", compactDisplay: "short" }).format(value);

export default function Tab2Supply({ reportMonth, facilityId, apiPrefix = "/api/admin/dashboard" }: Tab2Props) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedHoatChat, setSelectedHoatChat] = useState<string>("");
    const [transferData, setTransferData] = useState<any>(null);
    const [transferLoading, setTransferLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                if (reportMonth && reportMonth !== "all") params.set("reportMonth", reportMonth);
                if (facilityId) params.set("facilityId", facilityId);
                const res = await fetch(`${apiPrefix}/supply?${params}`);
                const json = await res.json();
                setData(json);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [reportMonth, facilityId]);

    const fetchTransfer = async (hoatChat: string) => {
        if (!hoatChat) return;
        setTransferLoading(true);
        try {
            const params = new URLSearchParams();
            if (reportMonth && reportMonth !== "all") params.set("reportMonth", reportMonth);
            if (facilityId) params.set("facilityId", facilityId);
            params.set("hoatChat", hoatChat);
            const res = await fetch(`${apiPrefix}/supply?${params}`);
            const json = await res.json();
            setTransferData(json.transferData);
        } catch (e) {
            console.error(e);
        } finally {
            setTransferLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                    <p className="text-sm text-gray-500">Đang tải dữ liệu...</p>
                </div>
            </div>
        );
    }

    if (!data) return <p className="text-center text-red-500 py-8">Không thể tải dữ liệu</p>;

    const filteredHoatChatList = data.hoatChatList?.filter((h: string) =>
        h.toLowerCase().includes(searchTerm.toLowerCase())
    )?.slice(0, 30) || [];

    return (
        <div className="space-y-6">
            {/* Stockout Risk Table */}
            <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-100">
                <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-red-100 text-red-600 text-lg">⚠</span>
                    <h3 className="font-semibold text-gray-800">Cảnh báo đứt gãy (Stockout Risk)</h3>
                </div>
                <p className="text-xs text-gray-500 mb-4 ml-9">Thuốc có nhu cầu cao nhưng tồn cuối = 0</p>
                <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0">
                            <tr className="bg-gradient-to-r from-red-600 to-rose-600 text-white">
                                <th className="text-left p-3 font-semibold rounded-tl-lg">STT</th>
                                <th className="text-left p-3 font-semibold">Cơ sở</th>
                                <th className="text-left p-3 font-semibold">Tên thuốc</th>
                                <th className="text-left p-3 font-semibold">Hoạt chất</th>
                                <th className="text-right p-3 font-semibold rounded-tr-lg">SL Xuất trong kỳ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.stockoutRisk?.map((item: any, i: number) => (
                                <tr key={i} className="border-b border-gray-50 hover:bg-red-50/50 transition-colors">
                                    <td className="p-3 text-gray-500">{i + 1}</td>
                                    <td className="p-3 text-gray-700">{item.facility}</td>
                                    <td className="p-3 font-medium text-gray-800">{item.drugName}</td>
                                    <td className="p-3 text-gray-600">{item.hoatChat}</td>
                                    <td className="p-3 text-right font-mono text-red-600 font-semibold">{item.xuat.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {(!data.stockoutRisk || data.stockoutRisk.length === 0) && (
                        <p className="text-center text-gray-400 py-8">Không có thuốc hết hàng trong kỳ này</p>
                    )}
                </div>
            </div>

            {/* Scatter Plot */}
            <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-100">
                <h3 className="font-semibold text-gray-800 mb-1">Ma trận Tồn/Xuất</h3>
                <p className="text-xs text-gray-500 mb-4">Phát hiện thuốc tồn kho chết hoặc nguy cơ thiếu hàng</p>
                <div className="grid grid-cols-2 text-xs text-gray-400 mb-2">
                    <div className="text-left">← <span className="text-amber-500 font-medium">Tồn kho chết</span> (Tồn cao, Xuất thấp)</div>
                    <div className="text-right"><span className="text-red-500 font-medium">Nguy cơ thiếu</span> (Tồn thấp, Xuất cao) →</div>
                </div>
                <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis
                                type="number"
                                dataKey="xuat"
                                name="Xuất trong kỳ"
                                tick={{ fontSize: 11, fill: "#64748b" }}
                                tickFormatter={formatCompact}
                                label={{ value: "Xuất trong kỳ", position: "bottom", offset: 0, style: { fontSize: 12, fill: "#94a3b8" } }}
                            />
                            <YAxis
                                type="number"
                                dataKey="tonCuoi"
                                name="Tồn cuối"
                                tick={{ fontSize: 11, fill: "#64748b" }}
                                tickFormatter={formatCompact}
                                label={{ value: "Tồn cuối", angle: -90, position: "insideLeft", style: { fontSize: 12, fill: "#94a3b8" } }}
                            />
                            <ZAxis range={[30, 60]} />
                            <Tooltip
                                cursor={{ strokeDasharray: "3 3" }}
                                contentStyle={{ backgroundColor: "white", borderRadius: "10px", border: "1px solid #e2e8f0", boxShadow: "0 10px 25px -5px rgb(0 0 0 / 0.1)" }}
                                content={({ payload }) => {
                                    if (!payload || payload.length === 0) return null;
                                    const d = payload[0].payload;
                                    return (
                                        <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-xl text-sm">
                                            <p className="font-semibold text-gray-800">{d.drugName}</p>
                                            <p className="text-gray-500">{d.facility}</p>
                                            <p className="text-blue-600">Xuất: {d.xuat.toLocaleString()}</p>
                                            <p className="text-emerald-600">Tồn: {d.tonCuoi.toLocaleString()}</p>
                                        </div>
                                    );
                                }}
                            />
                            <Scatter data={data.scatterData} fill="#6366f1" fillOpacity={0.6} />
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Transfer Suggestion */}
            <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-100">
                <h3 className="font-semibold text-gray-800 mb-1">Gợi ý điều chuyển thuốc</h3>
                <p className="text-xs text-gray-500 mb-4">Chọn hoạt chất để xem CSYT thừa / thiếu</p>
                <div className="flex gap-3 mb-4">
                    <div className="flex-1 max-w-md relative">
                        <input
                            type="text"
                            placeholder="Tìm hoạt chất..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                        />
                        {searchTerm && filteredHoatChatList.length > 0 && (
                            <div className="absolute z-10 top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-xl mt-1 max-h-48 overflow-y-auto">
                                {filteredHoatChatList.map((h: string, i: number) => (
                                    <button
                                        key={i}
                                        className="w-full text-left px-4 py-2 text-sm hover:bg-indigo-50 transition-colors"
                                        onClick={() => {
                                            setSelectedHoatChat(h);
                                            setSearchTerm(h);
                                            fetchTransfer(h);
                                        }}
                                    >
                                        {h}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => {
                            if (selectedHoatChat) fetchTransfer(selectedHoatChat);
                        }}
                        disabled={!selectedHoatChat || transferLoading}
                        className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {transferLoading ? "Đang tải..." : "Phân tích"}
                    </button>
                </div>

                {transferData && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Surplus */}
                        <div className="border border-emerald-200 rounded-lg overflow-hidden">
                            <div className="bg-emerald-50 px-4 py-2 border-b border-emerald-200">
                                <h4 className="font-semibold text-emerald-800 text-sm flex items-center gap-2">
                                    <span className="text-emerald-500">▲</span> CSYT đang THỪA
                                    <span className="text-xs font-normal text-emerald-600">(Tồn &gt; 3 tháng)</span>
                                </h4>
                            </div>
                            <div className="max-h-60 overflow-y-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="bg-emerald-50/50">
                                            <th className="text-left p-2">Cơ sở</th>
                                            <th className="text-right p-2">Tồn cuối</th>
                                            <th className="text-right p-2">Xuất/kỳ</th>
                                            <th className="text-right p-2">Tháng tồn</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {transferData.surplus?.map((s: any, i: number) => (
                                            <tr key={i} className="border-t border-gray-50">
                                                <td className="p-2">{s.facility}</td>
                                                <td className="p-2 text-right font-mono">{s.tonCuoi.toLocaleString()}</td>
                                                <td className="p-2 text-right font-mono">{s.xuat.toLocaleString()}</td>
                                                <td className="p-2 text-right font-mono text-emerald-600 font-semibold">{s.monthsOfStock}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {(!transferData.surplus || transferData.surplus.length === 0) && (
                                    <p className="text-center text-gray-400 py-4 text-xs">Không có CSYT thừa</p>
                                )}
                            </div>
                        </div>

                        {/* Shortage */}
                        <div className="border border-red-200 rounded-lg overflow-hidden">
                            <div className="bg-red-50 px-4 py-2 border-b border-red-200">
                                <h4 className="font-semibold text-red-800 text-sm flex items-center gap-2">
                                    <span className="text-red-500">▼</span> CSYT đang THIẾU
                                    <span className="text-xs font-normal text-red-600">(Tồn = 0)</span>
                                </h4>
                            </div>
                            <div className="max-h-60 overflow-y-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="bg-red-50/50">
                                            <th className="text-left p-2">Cơ sở</th>
                                            <th className="text-right p-2">Tồn cuối</th>
                                            <th className="text-right p-2">Xuất/kỳ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {transferData.shortage?.map((s: any, i: number) => (
                                            <tr key={i} className="border-t border-gray-50">
                                                <td className="p-2">{s.facility}</td>
                                                <td className="p-2 text-right font-mono text-red-600">0</td>
                                                <td className="p-2 text-right font-mono">{s.xuat.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {(!transferData.shortage || transferData.shortage.length === 0) && (
                                    <p className="text-center text-gray-400 py-4 text-xs">Không có CSYT thiếu</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
