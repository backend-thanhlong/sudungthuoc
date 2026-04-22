"use client";

import { useEffect, useState } from "react";
import { EyeOff, Pencil, RotateCcw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface TherapeuticGroupItem {
    id: string;
    name: string;
    isActive: boolean;
    drugCount: number;
    updatedAt: string;
}

export default function TherapeuticGroupsPage() {
    const [groups, setGroups] = useState<TherapeuticGroupItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [nameInput, setNameInput] = useState("");

    const fetchGroups = async (search = searchTerm, status = statusFilter) => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                status,
            });
            if (search.trim()) {
                params.set("search", search.trim());
            }

            const res = await fetch(`/api/admin/therapeutic-groups?${params.toString()}`);
            if (!res.ok) {
                throw new Error();
            }

            const result = await res.json();
            setGroups(result.data || []);
        } catch {
            toast.error("Không thể tải danh mục nhóm điều trị");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchGroups();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusFilter]);

    const resetForm = () => {
        setEditingId(null);
        setNameInput("");
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!nameInput.trim()) {
            toast.error("Tên nhóm điều trị không được để trống");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch(
                editingId ? `/api/admin/therapeutic-groups/${editingId}` : "/api/admin/therapeutic-groups",
                {
                    method: editingId ? "PATCH" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: nameInput }),
                }
            );

            const result = await res.json();
            if (!res.ok) {
                toast.error(result.message || "Không thể lưu nhóm điều trị");
                return;
            }

            if (editingId) {
                toast.success("Đã cập nhật nhóm điều trị");
            } else if (result.meta?.created) {
                toast.success("Đã tạo nhóm điều trị");
            } else if (result.meta?.reactivated) {
                toast.success("Đã kích hoạt lại nhóm điều trị đã có");
            } else {
                toast.success("Nhóm điều trị đã tồn tại, đã dùng lại giá trị này");
            }

            resetForm();
            fetchGroups();
        } catch {
            toast.error("Không thể lưu nhóm điều trị");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleActive = async (group: TherapeuticGroupItem) => {
        try {
            const res = await fetch(`/api/admin/therapeutic-groups/${group.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: !group.isActive }),
            });
            const result = await res.json();
            if (!res.ok) {
                toast.error(result.message || "Không thể cập nhật trạng thái");
                return;
            }

            toast.success(group.isActive ? "Đã ẩn nhóm điều trị" : "Đã kích hoạt lại nhóm điều trị");
            fetchGroups();
        } catch {
            toast.error("Không thể cập nhật trạng thái");
        }
    };

    const handleDelete = async (group: TherapeuticGroupItem) => {
        if (group.drugCount > 0) {
            toast.error("Nhóm điều trị này đang được thuốc sử dụng, hãy ẩn thay vì xóa");
            return;
        }

        if (!confirm(`Xóa nhóm điều trị "${group.name}"?`)) {
            return;
        }

        try {
            const res = await fetch(`/api/admin/therapeutic-groups/${group.id}`, {
                method: "DELETE",
            });
            const result = await res.json();
            if (!res.ok) {
                toast.error(result.message || "Không thể xóa nhóm điều trị");
                return;
            }

            toast.success("Đã xóa nhóm điều trị");
            fetchGroups();
        } catch {
            toast.error("Không thể xóa nhóm điều trị");
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold text-gray-800">Danh mục nhóm điều trị</h2>
                <p className="mt-1 text-gray-500">Quản lý danh mục chuẩn dùng cho trường Nhóm điều trị của danh mục thuốc.</p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <Card className="border-0 shadow-lg md:col-span-1 h-fit">
                    <CardHeader>
                        <CardTitle className="text-lg">{editingId ? "Cập nhật nhóm điều trị" : "Thêm nhóm điều trị"}</CardTitle>
                        <CardDescription>
                            {editingId
                                ? "Đổi tên hiển thị của nhóm điều trị đã có."
                                : "Tạo nhóm điều trị mới để dùng trong form thêm/sửa thuốc."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-gray-700">Tên nhóm điều trị</label>
                                <Input
                                    value={nameInput}
                                    onChange={(event) => setNameInput(event.target.value)}
                                    placeholder="Ví dụ: Giảm đau, hạ sốt"
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button type="submit" disabled={isSubmitting || !nameInput.trim()} className="flex-1">
                                    <Save className="mr-2 size-4" />
                                    {editingId ? "Lưu thay đổi" : "Thêm mới"}
                                </Button>
                                {editingId ? (
                                    <Button type="button" variant="outline" onClick={resetForm}>
                                        Hủy
                                    </Button>
                                ) : null}
                            </div>
                        </form>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-lg md:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-lg">Danh sách nhóm điều trị</CardTitle>
                        <CardDescription>Quản lý trạng thái và tên chuẩn của các nhóm điều trị trên toàn hệ thống.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col gap-3 sm:flex-row">
                            <Input
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                                placeholder="Tìm theo tên nhóm điều trị..."
                                className="flex-1"
                            />
                            <Button type="button" variant="outline" onClick={() => fetchGroups(searchTerm, statusFilter)}>
                                Tìm kiếm
                            </Button>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-full bg-white sm:w-[180px]">
                                    <SelectValue placeholder="Trạng thái" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tất cả</SelectItem>
                                    <SelectItem value="active">Đang hoạt động</SelectItem>
                                    <SelectItem value="inactive">Đang ẩn</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {isLoading ? (
                            <div className="py-8 text-center text-gray-500">Đang tải...</div>
                        ) : groups.length === 0 ? (
                            <div className="py-8 text-center text-gray-400">Chưa có nhóm điều trị nào phù hợp.</div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Tên nhóm điều trị</TableHead>
                                        <TableHead>Trạng thái</TableHead>
                                        <TableHead>Số thuốc dùng</TableHead>
                                        <TableHead>Cập nhật</TableHead>
                                        <TableHead className="text-right">Thao tác</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {groups.map((group) => (
                                        <TableRow key={group.id}>
                                            <TableCell className="font-medium">{group.name}</TableCell>
                                            <TableCell>
                                                <Badge className={group.isActive ? "bg-emerald-100 text-emerald-700 border-0" : "bg-gray-100 text-gray-700 border-0"}>
                                                    {group.isActive ? "Đang hoạt động" : "Đang ẩn"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{group.drugCount}</TableCell>
                                            <TableCell>{new Date(group.updatedAt).toLocaleDateString("vi-VN")}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                                                        onClick={() => {
                                                            setEditingId(group.id);
                                                            setNameInput(group.name);
                                                        }}
                                                        title="Sửa tên nhóm điều trị"
                                                    >
                                                        <Pencil className="size-4" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className={group.isActive ? "text-amber-600 hover:bg-amber-50 hover:text-amber-700" : "text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"}
                                                        onClick={() => handleToggleActive(group)}
                                                        title={group.isActive ? "Ẩn nhóm điều trị" : "Kích hoạt lại"}
                                                    >
                                                        {group.isActive ? <EyeOff className="size-4" /> : <RotateCcw className="size-4" />}
                                                    </Button>
                                                    {group.drugCount === 0 ? (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-red-500 hover:bg-red-50 hover:text-red-700"
                                                            onClick={() => handleDelete(group)}
                                                            title="Xóa nhóm điều trị"
                                                        >
                                                            <Trash2 className="size-4" />
                                                        </Button>
                                                    ) : null}
                                                </div>
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
