"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Trash2, Plus, Bell, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ReportPeriod {
    id: string;
    month: string;
    isActive: boolean;
    deadline?: string | null;
    reminderSent?: boolean;
    createdAt: string;
}

function getDeadlineBadge(deadline?: string | null) {
    if (!deadline) return null;
    const dl = new Date(deadline);
    const now = new Date();
    const diffDays = Math.ceil((dl.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
        return <Badge className="bg-red-100 text-red-700 border-0 ml-2">Quá hạn</Badge>;
    }
    if (diffDays <= 3) {
        return <Badge className="bg-orange-100 text-orange-700 border-0 ml-2">Sắp hết hạn ({diffDays}d)</Badge>;
    }
    return <Badge className="bg-blue-100 text-blue-700 border-0 ml-2">{dl.toLocaleDateString("vi-VN")}</Badge>;
}

export default function ReportPeriodsPage() {
    const [periods, setPeriods] = useState<ReportPeriod[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newMonth, setNewMonth] = useState("");
    const [newDeadline, setNewDeadline] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [remindingId, setRemindingId] = useState<string | null>(null);

    const fetchPeriods = async () => {
        try {
            const res = await fetch("/api/admin/report-periods");
            if (res.ok) {
                const data = await res.json();
                setPeriods(data);
            }
        } catch {
            toast.error("Không thể tải danh sách kỳ báo cáo");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPeriods();
    }, []);

    const handleAddPeriod = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMonth) return;

        if (!/^\d{2}\/\d{4}$/.test(newMonth)) {
            toast.error("Định dạng tháng không hợp lệ (MM/YYYY)");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch("/api/admin/report-periods", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    month: newMonth,
                    deadline: newDeadline ? new Date(newDeadline).toISOString() : null,
                }),
            });

            if (res.ok) {
                toast.success("Thêm kỳ báo cáo thành công. Đã thông báo cho tất cả cơ sở.");
                setNewMonth("");
                setNewDeadline("");
                fetchPeriods();
            } else {
                const error = await res.json();
                toast.error(error.error || "Lỗi khi thêm kỳ báo cáo");
            }
        } catch {
            toast.error("Đã xảy ra lỗi");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeletePeriod = async (id: string, month: string) => {
        if (!confirm(`Bạn có chắc chắn muốn xóa kỳ báo cáo ${month}?`)) return;

        try {
            const res = await fetch(`/api/admin/report-periods?id=${id}`, {
                method: "DELETE",
            });

            if (res.ok) {
                toast.success("Xóa thành công");
                setPeriods(periods.filter(p => p.id !== id));
            } else {
                toast.error("Không thể xóa kỳ báo cáo");
            }
        } catch {
            toast.error("Đã xảy ra lỗi");
        }
    };

    const handleRemind = async (month: string, periodId: string) => {
        setRemindingId(periodId);
        try {
            const res = await fetch("/api/admin/report-periods/remind", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ month }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message);
                fetchPeriods(); // refresh to update reminderSent badge
            } else {
                toast.error(data.error || "Không thể gửi nhắc nhở");
            }
        } catch {
            toast.error("Lỗi kết nối");
        } finally {
            setRemindingId(null);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold text-gray-800">Quản lý Tháng báo cáo</h2>
                <p className="text-gray-500 mt-1">Thiết lập các tháng cho phép đơn vị nộp báo cáo</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Form thêm mới */}
                <Card className="border-0 shadow-lg md:col-span-1 h-fit">
                    <CardHeader>
                        <CardTitle className="text-lg">Thêm kỳ báo cáo mới</CardTitle>
                        <CardDescription>Nhập tháng/năm để mở đợt báo cáo. Hệ thống sẽ tự động thông báo đến tất cả cơ sở.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAddPeriod} className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-gray-700 mb-1 block">
                                    Tháng báo cáo (MM/YYYY)
                                </label>
                                <Input
                                    placeholder="VD: 01/2026"
                                    value={newMonth}
                                    onChange={(e) => setNewMonth(e.target.value)}
                                />
                                <p className="text-xs text-gray-400 mt-1">
                                    Định dạng: Tháng/Năm (2 chữ số tháng, 4 chữ số năm)
                                </p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700 mb-1 block flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5" />
                                    Hạn nộp (tùy chọn)
                                </label>
                                <Input
                                    type="date"
                                    value={newDeadline}
                                    onChange={(e) => setNewDeadline(e.target.value)}
                                />
                                <p className="text-xs text-gray-400 mt-1">
                                    Để trống nếu không giới hạn hạn nộp
                                </p>
                            </div>
                            <Button
                                type="submit"
                                className="w-full bg-blue-600 hover:bg-blue-700"
                                disabled={isSubmitting || !newMonth}
                            >
                                {isSubmitting ? (
                                    "Đang xử lý..."
                                ) : (
                                    <>
                                        <Plus className="w-4 h-4 mr-2" />
                                        Mở kỳ báo cáo & thông báo
                                    </>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Danh sách */}
                <Card className="border-0 shadow-lg md:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-lg">Danh sách kỳ báo cáo</CardTitle>
                        <CardDescription>Các tháng đã được tạo trên hệ thống</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="text-center py-8">Đang tải...</div>
                        ) : periods.length === 0 ? (
                            <div className="text-center py-8 text-gray-400">Chưa có kỳ báo cáo nào</div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Tháng</TableHead>
                                        <TableHead>Trạng thái</TableHead>
                                        <TableHead>Hạn nộp</TableHead>
                                        <TableHead>Ngày tạo</TableHead>
                                        <TableHead className="text-right">Thao tác</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {periods.map((period) => (
                                        <TableRow key={period.id}>
                                            <TableCell className="font-medium">{period.month}</TableCell>
                                            <TableCell>
                                                <Badge variant={period.isActive ? "default" : "secondary"} className={period.isActive ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-0" : ""}>
                                                    {period.isActive ? "Đang mở" : "Đã đóng"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {period.deadline ? (
                                                    <span className="flex items-center gap-1 text-sm">
                                                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                                                        {getDeadlineBadge(period.deadline)}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-gray-400">Không giới hạn</span>
                                                )}
                                            </TableCell>
                                            <TableCell>{new Date(period.createdAt).toLocaleDateString("vi-VN")}</TableCell>
                                            <TableCell className="text-right space-x-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                                    onClick={() => handleRemind(period.month, period.id)}
                                                    disabled={remindingId === period.id}
                                                    title={period.reminderSent ? "Đã gửi nhắc nhở trước đó" : "Gửi nhắc nhở đến cơ sở chưa nộp"}
                                                >
                                                    <Bell className={`w-4 h-4 mr-1 ${period.reminderSent ? "fill-blue-400" : ""}`} />
                                                    {remindingId === period.id ? "Đang gửi..." : "Nhắc nhở"}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                    onClick={() => handleDeletePeriod(period.id, period.month)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
