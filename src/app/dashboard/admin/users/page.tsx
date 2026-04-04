"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { MoreHorizontal, Pencil, Trash2, Key, Ban, CheckCircle, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const FACILITY_TYPES = [
    "Bệnh viện trực thuộc",
    "Trung tâm y tế khu vực trực thuộc",
    "Bệnh viện trực thuộc Bộ/Ngành",
    "Bệnh viện tư nhân",
    "Phòng khám tư nhân",
];

const AUTONOMY_GROUPS = [
    "Nhóm 1",
    "Nhóm 2",
    "Nhóm 3",
    "Nhóm 4",
    "Tư nhân",
];

interface User {
    id: string;
    username: string;
    facilityName: string | null;
    facilityCode: string | null;
    autonomyGroup: string | null;
    facilityType: string | null;
    contactPerson: string | null;
    phoneNumber: string | null;
    address: string | null;
    role: string;
    isActive: boolean;
    createdAt: string;
}

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Create Config
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [createForm, setCreateForm] = useState({
        username: "",
        password: "",
        facilityName: "",
        facilityCode: "",
        autonomyGroup: "",
        facilityType: "",
        contactPerson: "",
        phoneNumber: "",
        address: "",
    });

    // Edit Config
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [editForm, setEditForm] = useState({
        facilityName: "",
        facilityCode: "",
        autonomyGroup: "",
        facilityType: "",
        contactPerson: "",
        phoneNumber: "",
        address: "",
    });

    // Reset Password Config
    const [resetPwUser, setResetPwUser] = useState<User | null>(null);
    const [newPassword, setNewPassword] = useState("");

    // Delete Config
    const [deletingUser, setDeletingUser] = useState<User | null>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchUsers = async () => {
        try {
            const res = await fetch("/api/admin/users");
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch (error) {
            console.error("Error fetching users:", error);
            toast.error("Không thể tải danh sách người dùng");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await fetch("/api/admin/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(createForm),
            });

            if (res.ok) {
                toast.success("Tạo tài khoản thành công");
                setIsCreateOpen(false);
                setCreateForm({
                    username: "",
                    password: "",
                    facilityName: "",
                    facilityCode: "",
                    autonomyGroup: "",
                    facilityType: "",
                    contactPerson: "",
                    phoneNumber: "",
                    address: ""
                });
                fetchUsers();
            } else {
                const error = await res.json();
                toast.error(error.message || "Không thể tạo tài khoản");
            }
        } catch {
            toast.error("Đã xảy ra lỗi");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/admin/users/${editingUser.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editForm),
            });

            if (res.ok) {
                toast.success("Cập nhật thông tin thành công");
                setEditingUser(null);
                fetchUsers();
            } else {
                const error = await res.json();
                toast.error(error.message || "Không thể cập nhật");
            }
        } catch {
            toast.error("Đã xảy ra lỗi");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!resetPwUser) return;
        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/admin/users/${resetPwUser.id}/reset-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password: newPassword }),
            });

            if (res.ok) {
                toast.success("Đã đặt lại mật khẩu thành công");
                setResetPwUser(null);
                setNewPassword("");
            } else {
                const error = await res.json();
                toast.error(error.message || "Không thể đặt lại mật khẩu");
            }
        } catch {
            toast.error("Đã xảy ra lỗi");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!deletingUser) return;
        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/admin/users/${deletingUser.id}`, {
                method: "DELETE",
            });

            if (res.ok) {
                toast.success("Đã xóa tài khoản thành công");
                setDeletingUser(null);
                fetchUsers();
            } else {
                const error = await res.json();
                toast.error(error.message || "Không thể xóa tài khoản");
            }
        } catch {
            toast.error("Đã xảy ra lỗi");
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
        try {
            const res = await fetch(`/api/admin/users/${userId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: !currentStatus }),
            });

            if (res.ok) {
                toast.success(currentStatus ? "Đã vô hiệu hóa tài khoản" : "Đã kích hoạt tài khoản");
                fetchUsers();
            }
        } catch {
            toast.error("Đã xảy ra lỗi");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800">Quản lý Cơ sở</h2>
                    <p className="text-gray-500 mt-1">Quản lý tài khoản các cơ sở y tế</p>
                </div>

                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600">
                            <Plus className="w-5 h-5 mr-2" />
                            Thêm cơ sở
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Thêm cơ sở mới</DialogTitle>
                            <DialogDescription>Tạo tài khoản cho cơ sở y tế mới</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="username">Tên đăng nhập *</Label>
                                    <Input
                                        id="username"
                                        value={createForm.username}
                                        onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                                        placeholder="vd: bvdktinh"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password">Mật khẩu *</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        value={createForm.password}
                                        onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                                        placeholder="Nhập mật khẩu"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="facilityName">Tên cơ sở *</Label>
                                <Input
                                    id="facilityName"
                                    value={createForm.facilityName}
                                    onChange={(e) => setCreateForm({ ...createForm, facilityName: e.target.value })}
                                    placeholder="vd: Bệnh viện Đa khoa Tỉnh"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="facilityCode">Mã cơ sở *</Label>
                                <Input
                                    id="facilityCode"
                                    value={createForm.facilityCode}
                                    onChange={(e) => setCreateForm({ ...createForm, facilityCode: e.target.value })}
                                    placeholder="vd: BVDKT"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="facilityType">Loại cơ sở</Label>
                                    <Select
                                        value={createForm.facilityType}
                                        onValueChange={(value) => setCreateForm({ ...createForm, facilityType: value })}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Chọn loại cơ sở" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {FACILITY_TYPES.map((type) => (
                                                <SelectItem key={type} value={type}>
                                                    {type}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="autonomyGroup">Nhóm tự chủ</Label>
                                    <Select
                                        value={createForm.autonomyGroup}
                                        onValueChange={(value) => setCreateForm({ ...createForm, autonomyGroup: value })}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Chọn nhóm tự chủ" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {AUTONOMY_GROUPS.map((group) => (
                                                <SelectItem key={group} value={group}>
                                                    {group}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="contactPerson">Người liên hệ</Label>
                                    <Input
                                        id="contactPerson"
                                        value={createForm.contactPerson}
                                        onChange={(e) => setCreateForm({ ...createForm, contactPerson: e.target.value })}
                                        placeholder="Tên người liên hệ"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phoneNumber">Số điện thoại</Label>
                                    <Input
                                        id="phoneNumber"
                                        value={createForm.phoneNumber}
                                        onChange={(e) => setCreateForm({ ...createForm, phoneNumber: e.target.value })}
                                        placeholder="SĐT liên hệ"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="address">Địa chỉ</Label>
                                <Input
                                    id="address"
                                    value={createForm.address}
                                    onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                                    placeholder="Địa chỉ cơ sở"
                                />
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                                    Hủy
                                </Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? "Đang tạo..." : "Tạo tài khoản"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="border-0 shadow-lg">
                <CardHeader>
                    <CardTitle>Danh sách cơ sở</CardTitle>
                    <CardDescription>Tổng cộng {users.length} cơ sở y tế</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-blue-600 hover:bg-blue-600">
                                    <TableHead className="text-white font-bold">Tên đăng nhập</TableHead>
                                    <TableHead className="text-white font-bold">Tên cơ sở</TableHead>
                                    <TableHead className="text-white font-bold">Mã cơ sở</TableHead>
                                    <TableHead className="text-white font-bold">Loại cơ sở</TableHead>
                                    <TableHead className="text-white font-bold">Nhóm tự chủ</TableHead>
                                    <TableHead className="text-white font-bold">Người liên hệ</TableHead>
                                    <TableHead className="text-white font-bold">SĐT</TableHead>
                                    <TableHead className="text-white font-bold">Địa chỉ</TableHead>
                                    <TableHead className="text-white font-bold">Trạng thái</TableHead>
                                    <TableHead className="text-white font-bold">Ngày tạo</TableHead>
                                    <TableHead className="text-right text-white font-bold">Thao tác</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">{user.username}</TableCell>
                                        <TableCell>{user.facilityName || "-"}</TableCell>
                                        <TableCell>
                                            <code className="px-2 py-1 bg-gray-100 rounded text-sm">{user.facilityCode || "-"}</code>
                                        </TableCell>
                                        <TableCell>{user.facilityType || "-"}</TableCell>
                                        <TableCell>{user.autonomyGroup || "-"}</TableCell>
                                        <TableCell>{user.contactPerson || "-"}</TableCell>
                                        <TableCell>{user.phoneNumber || "-"}</TableCell>
                                        <TableCell>{user.address || "-"}</TableCell>
                                        <TableCell>
                                            <Badge variant={user.isActive ? "default" : "secondary"}>
                                                {user.isActive ? "Hoạt động" : "Vô hiệu"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{new Date(user.createdAt).toLocaleDateString("vi-VN")}</TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <span className="sr-only">Open menu</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Thao tác</DropdownMenuLabel>
                                                    <DropdownMenuItem
                                                        onClick={() => {
                                                            setEditingUser(user);
                                                            setEditForm({
                                                                facilityName: user.facilityName || "",
                                                                facilityCode: user.facilityCode || "",
                                                                autonomyGroup: user.autonomyGroup || "",
                                                                facilityType: user.facilityType || "",
                                                                contactPerson: user.contactPerson || "",
                                                                phoneNumber: user.phoneNumber || "",
                                                                address: user.address || "",
                                                            });
                                                        }}
                                                    >
                                                        <Pencil className="mr-2 h-4 w-4" />
                                                        Sửa thông tin
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => toggleUserStatus(user.id, user.isActive)}
                                                    >
                                                        {user.isActive ? (
                                                            <>
                                                                <Ban className="mr-2 h-4 w-4" />
                                                                Vô hiệu hóa
                                                            </>
                                                        ) : (
                                                            <>
                                                                <CheckCircle className="mr-2 h-4 w-4" />
                                                                Kích hoạt
                                                            </>
                                                        )}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => setResetPwUser(user)}>
                                                        <Key className="mr-2 h-4 w-4" />
                                                        Đặt lại mật khẩu
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="text-red-600 focus:text-red-600"
                                                        onClick={() => setDeletingUser(user)}
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Xóa tài khoản
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {users.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                                            Chưa có cơ sở nào được đăng ký
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Edit User Dialog */}
            <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Cập nhật thông tin</DialogTitle>
                        <DialogDescription>
                            Chỉnh sửa thông tin cho tài khoản {editingUser?.username}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleUpdate} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-facilityName">Tên cơ sở</Label>
                            <Input
                                id="edit-facilityName"
                                value={editForm.facilityName}
                                onChange={(e) => setEditForm({ ...editForm, facilityName: e.target.value })}
                                placeholder="Tên bệnh viện, trung tâm y tế..."
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-facilityCode">Mã cơ sở</Label>
                            <Input
                                id="edit-facilityCode"
                                value={editForm.facilityCode}
                                onChange={(e) => setEditForm({ ...editForm, facilityCode: e.target.value })}
                                placeholder="Mã định danh..."
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-facilityType">Loại cơ sở</Label>
                                <Select
                                    value={editForm.facilityType}
                                    onValueChange={(value) => setEditForm({ ...editForm, facilityType: value })}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Chọn loại cơ sở" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {FACILITY_TYPES.map((type) => (
                                            <SelectItem key={type} value={type}>
                                                {type}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-autonomyGroup">Nhóm tự chủ</Label>
                                <Select
                                    value={editForm.autonomyGroup}
                                    onValueChange={(value) => setEditForm({ ...editForm, autonomyGroup: value })}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Chọn nhóm tự chủ" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {AUTONOMY_GROUPS.map((group) => (
                                            <SelectItem key={group} value={group}>
                                                {group}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-contactPerson">Người liên hệ</Label>
                                <Input
                                    id="edit-contactPerson"
                                    value={editForm.contactPerson}
                                    onChange={(e) => setEditForm({ ...editForm, contactPerson: e.target.value })}
                                    placeholder="Tên người liên hệ"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-phoneNumber">Số điện thoại</Label>
                                <Input
                                    id="edit-phoneNumber"
                                    value={editForm.phoneNumber}
                                    onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                                    placeholder="SĐT liên hệ"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-address">Địa chỉ</Label>
                            <Input
                                id="edit-address"
                                value={editForm.address}
                                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                                placeholder="Địa chỉ cơ sở"
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>
                                Hủy
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Reset Password Dialog */}
            <Dialog open={!!resetPwUser} onOpenChange={(open) => !open && setResetPwUser(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Đặt lại mật khẩu</DialogTitle>
                        <DialogDescription>
                            Tạo mật khẩu mới cho tài khoản {resetPwUser?.username}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleResetPassword} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="new-password">Mật khẩu mới</Label>
                            <Input
                                id="new-password"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Nhập mật khẩu mới ít nhất 6 ký tự"
                                minLength={6}
                                required
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setResetPwUser(null)}>
                                Hủy
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? "Đang xử lý..." : "Đặt lại mật khẩu"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Alert Dialog */}
            <AlertDialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Bạn có chắc chắn muốn xóa?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Hành động này không thể hoàn tác. Tài khoản <strong>{deletingUser?.username}</strong> và toàn bộ dữ liệu liên quan sẽ bị xóa vĩnh viễn.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Hủy bỏ</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                            Xóa tài khoản
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div >
    );
}
