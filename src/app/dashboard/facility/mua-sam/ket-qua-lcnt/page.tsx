"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface KetQuaLCNTListItem {
    id: string;
    maKHLCNT: string;
    tenKHLCNT: string;
    goiThauId: string;
    tenGoiThau: string;
    tbmtId: string;
    maTBMT: string;
    ngayDangTaiTBMT: string;
}

export default function KetQuaLCNTPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<KetQuaLCNTListItem[]>([]);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/facility/ket-qua-lcnt");
            if (res.ok) {
                const result = await res.json();
                setData(result);
            } else {
                console.error("Failed to load data");
            }
        } catch (error) {
            console.error("Error loading data:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleReport = (tbmtId: string) => {
        router.push(`/dashboard/facility/mua-sam/ket-qua-lcnt/${tbmtId}`);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Đang tải dữ liệu...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">
                        Kết quả LCNT
                    </h2>
                    <p className="text-gray-500 mt-1">
                        Báo cáo kết quả lựa chọn nhà thầu theo Quy trình 1
                    </p>
                </div>
            </div>

            <Card className="border-0 shadow-lg">
                <CardContent className="p-0">
                    <div className="rounded-xl overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-blue-600 hover:bg-blue-600">
                                    <TableHead className="text-white font-bold">STT</TableHead>
                                    <TableHead className="text-white font-bold">Mã KHLCNT</TableHead>
                                    <TableHead className="text-white font-bold">Tên KHLCNT</TableHead>
                                    <TableHead className="text-white font-bold">Tên gói thầu</TableHead>
                                    <TableHead className="text-white font-bold">Mã TBMT</TableHead>
                                    <TableHead className="text-white font-bold">Ngày đăng tải TBMT</TableHead>
                                    <TableHead className="text-white font-bold">Thao tác</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-12 text-gray-400">
                                            <div className="flex flex-col items-center gap-3">
                                                <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                                <p>Chưa có kế hoạch LCNT nào có thông báo mời thầu.</p>
                                                <p className="text-sm">Vui lòng tạo KHLCNT và TBMT trước khi báo cáo kết quả.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    data.map((item, idx) => (
                                        <TableRow key={`${item.id}-${item.tbmtId}`} className="hover:bg-blue-50/50">
                                            <TableCell className="font-medium">{idx + 1}</TableCell>
                                            <TableCell>{item.maKHLCNT || "—"}</TableCell>
                                            <TableCell className="max-w-xs truncate">{item.tenKHLCNT || "—"}</TableCell>
                                            <TableCell className="max-w-xs truncate">{item.tenGoiThau || "—"}</TableCell>
                                            <TableCell>
                                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                                    {item.maTBMT}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-sm text-gray-500">
                                                {item.ngayDangTaiTBMT
                                                    ? new Date(item.ngayDangTaiTBMT).toLocaleDateString("vi-VN")
                                                    : "—"}
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleReport(item.tbmtId)}
                                                    className="text-blue-600 hover:text-blue-800 hover:bg-blue-100"
                                                >
                                                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                    Báo cáo
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
