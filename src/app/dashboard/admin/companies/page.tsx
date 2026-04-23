"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MoreHorizontal, Pencil, KeyRound, Ban, CheckCircle, Plus, Search } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface CompanyUser {
    id: string;
    username: string;
    isActive: boolean;
    createdAt: string;
}

interface Company {
    id: string;
    code: string;
    name: string;
    contactPerson: string | null;
    phoneNumber: string | null;
    email: string | null;
    address: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    companyUser: CompanyUser | null;
}

interface CompaniesResponse {
    data?: Company[];
}

const EMPTY_CREATE_FORM = {
    code: "",
    name: "",
    username: "",
    password: "",
    contactPerson: "",
    phoneNumber: "",
    email: "",
    address: "",
};

const EMPTY_EDIT_FORM = {
    code: "",
    name: "",
    username: "",
    contactPerson: "",
    phoneNumber: "",
    email: "",
    address: "",
};

function formatDate(value: string) {
    return new Date(value).toLocaleDateString("vi-VN");
}

export default function CompaniesPage() {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const latestRequestId = useRef(0);

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM);

    const [editingCompany, setEditingCompany] = useState<Company | null>(null);
    const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM);

    const [resetPwCompany, setResetPwCompany] = useState<Company | null>(null);
    const [newPassword, setNewPassword] = useState("");

    const fetchCompanies = useCallback(async () => {
        const params = new URLSearchParams();
        const trimmedSearchTerm = searchTerm.trim();
        if (trimmedSearchTerm) {
            params.set("searchTerm", trimmedSearchTerm);
        }

        const requestId = ++latestRequestId.current;
        setIsLoading(true);

        try {
            const res = await fetch(`/api/admin/companies?${params.toString()}`);
            if (!res.ok) {
                throw new Error("Failed to fetch companies");
            }

            const data: CompaniesResponse = await res.json();
            if (requestId !== latestRequestId.current) {
                return;
            }

            setCompanies(Array.isArray(data.data) ? data.data : []);
        } catch (error) {
            console.error("Error fetching companies:", error);
            if (requestId === latestRequestId.current) {
                toast.error("Không thể tải danh sách công ty");
            }
        } finally {
            if (requestId === latestRequestId.current) {
                setIsLoading(false);
            }
        }
    }, [searchTerm]);

    useEffect(() => {
        void fetchCompanies();
    }, [fetchCompanies]);

    const activeCompanies = companies.filter((company) => company.isActive).length;

    const handleCreate = async (event: React.FormEvent) => {
        event.preventDefault();
        setIsSubmitting(true);

        try {
            const res = await fetch("/api/admin/companies", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(createForm),
            });

            const payload = await res.json();

            if (!res.ok) {
                toast.error(payload.message || "Không thể tạo công ty");
                return;
            }

            toast.success("Đã tạo công ty và tài khoản đăng nhập");
            setIsCreateOpen(false);
            setCreateForm(EMPTY_CREATE_FORM);
            await fetchCompanies();
        } catch (error) {
            console.error("Error creating company:", error);
            toast.error("Đã xảy ra lỗi");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdate = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!editingCompany) {
            return;
        }

        setIsSubmitting(true);

        try {
            const res = await fetch(`/api/admin/companies/${editingCompany.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...editForm,
                    isActive: editingCompany.isActive,
                }),
            });

            const payload = await res.json();

            if (!res.ok) {
                toast.error(payload.message || "Không thể cập nhật công ty");
                return;
            }

            toast.success("Đã cập nhật thông tin công ty");
            setEditingCompany(null);
            setEditForm(EMPTY_EDIT_FORM);
            await fetchCompanies();
        } catch (error) {
            console.error("Error updating company:", error);
            toast.error("Đã xảy ra lỗi");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResetPassword = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!resetPwCompany) {
            return;
        }

        setIsSubmitting(true);

        try {
            const res = await fetch(`/api/admin/companies/${resetPwCompany.id}/reset-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password: newPassword }),
            });

            const payload = await res.json();

            if (!res.ok) {
                toast.error(payload.message || "Không thể đặt lại mật khẩu");
                return;
            }

            toast.success("Đã đặt lại mật khẩu công ty");
            setResetPwCompany(null);
            setNewPassword("");
        } catch (error) {
            console.error("Error resetting company password:", error);
            toast.error("Đã xảy ra lỗi");
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleCompanyStatus = async (company: Company) => {
        if (!company.companyUser) {
            toast.error("Không tìm thấy tài khoản công ty");
            return;
        }

        try {
            const res = await fetch(`/api/admin/companies/${company.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    code: company.code,
                    name: company.name,
                    username: company.companyUser.username,
                    contactPerson: company.contactPerson,
                    phoneNumber: company.phoneNumber,
                    email: company.email,
                    address: company.address,
                    isActive: !company.isActive,
                }),
            });

            const payload = await res.json();

            if (!res.ok) {
                toast.error(payload.message || "Không thể cập nhật trạng thái công ty");
                return;
            }

            toast.success(company.isActive ? "Đã vô hiệu hóa công ty" : "Đã kích hoạt công ty");
            await fetchCompanies();
        } catch (error) {
            console.error("Error toggling company status:", error);
            toast.error("Đã xảy ra lỗi");
        }
    };

    const openEditDialog = (company: Company) => {
        setEditingCompany(company);
        setEditForm({
            code: company.code,
            name: company.name,
            username: company.companyUser?.username || "",
            contactPerson: company.contactPerson || "",
            phoneNumber: company.phoneNumber || "",
            email: company.email || "",
            address: company.address || "",
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800">Quản lý Companies</h2>
                    <p className="mt-1 text-gray-500">Tạo và quản lý tài khoản công ty chỉ dùng cho module Dự trù đặt hàng.</p>
                </div>

                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700">
                            <Plus className="mr-2 h-5 w-5" />
                            Thêm company
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Thêm company mới</DialogTitle>
                            <DialogDescription>Tạo công ty và một tài khoản đăng nhập cho công ty đó.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="code">Mã công ty *</Label>
                                    <Input
                                        id="code"
                                        value={createForm.code}
                                        onChange={(event) => setCreateForm((prev) => ({ ...prev, code: event.target.value }))}
                                        placeholder="vd: CTYDUOC01"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="name">Tên công ty *</Label>
                                    <Input
                                        id="name"
                                        value={createForm.name}
                                        onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))}
                                        placeholder="Tên công ty"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="username">Tên đăng nhập *</Label>
                                    <Input
                                        id="username"
                                        value={createForm.username}
                                        onChange={(event) => setCreateForm((prev) => ({ ...prev, username: event.target.value }))}
                                        placeholder="Tên đăng nhập company"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password">Mật khẩu *</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        value={createForm.password}
                                        onChange={(event) => setCreateForm((prev) => ({ ...prev, password: event.target.value }))}
                                        placeholder="Ít nhất 6 ký tự"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="contactPerson">Người liên hệ</Label>
                                    <Input
                                        id="contactPerson"
                                        value={createForm.contactPerson}
                                        onChange={(event) => setCreateForm((prev) => ({ ...prev, contactPerson: event.target.value }))}
                                        placeholder="Người liên hệ"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phoneNumber">Số điện thoại</Label>
                                    <Input
                                        id="phoneNumber"
                                        value={createForm.phoneNumber}
                                        onChange={(event) => setCreateForm((prev) => ({ ...prev, phoneNumber: event.target.value }))}
                                        placeholder="SĐT công ty"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={createForm.email}
                                        onChange={(event) => setCreateForm((prev) => ({ ...prev, email: event.target.value }))}
                                        placeholder="Email liên hệ"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="address">Địa chỉ</Label>
                                    <Input
                                        id="address"
                                        value={createForm.address}
                                        onChange={(event) => setCreateForm((prev) => ({ ...prev, address: event.target.value }))}
                                        placeholder="Địa chỉ công ty"
                                    />
                                </div>
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                                    Hủy
                                </Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? "Đang tạo..." : "Tạo company"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-gray-500">Tổng số company</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-blue-700">{companies.length}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-gray-500">Đang hoạt động</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-emerald-700">{activeCompanies}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-gray-500">Đã vô hiệu hóa</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-amber-700">{companies.length - activeCompanies}</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="pb-4">
                    <CardTitle>Danh sách company</CardTitle>
                    <CardDescription>Mỗi company hiện được gắn với một tài khoản đăng nhập riêng cho khu vực `/dashboard/company`.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="relative max-w-md">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <Input
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Tìm theo mã, tên, username, liên hệ..."
                            className="pl-9"
                        />
                    </div>

                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Mã company</TableHead>
                                    <TableHead>Tên công ty</TableHead>
                                    <TableHead>Tài khoản</TableHead>
                                    <TableHead>Liên hệ</TableHead>
                                    <TableHead>Trạng thái</TableHead>
                                    <TableHead>Ngày tạo</TableHead>
                                    <TableHead className="w-[60px]">Thao tác</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="py-10 text-center text-gray-500">
                                            Đang tải dữ liệu...
                                        </TableCell>
                                    </TableRow>
                                ) : companies.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="py-10 text-center text-gray-500">
                                            Không có company nào
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    companies.map((company) => (
                                        <TableRow key={company.id}>
                                            <TableCell className="font-medium">{company.code}</TableCell>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium text-gray-900">{company.name}</p>
                                                    <p className="text-xs text-gray-500">{company.email || "Chưa có email"}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium text-gray-900">{company.companyUser?.username || "—"}</p>
                                                    <p className="text-xs text-gray-500">Chỉ dùng cho khu vực company</p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div>
                                                    <p>{company.contactPerson || "—"}</p>
                                                    <p className="text-xs text-gray-500">{company.phoneNumber || "Chưa có SĐT"}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={company.isActive ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : "bg-amber-100 text-amber-700 hover:bg-amber-100"}>
                                                    {company.isActive ? "Đang hoạt động" : "Đã vô hiệu hóa"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{formatDate(company.createdAt)}</TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Hành động</DropdownMenuLabel>
                                                        <DropdownMenuItem onClick={() => openEditDialog(company)}>
                                                            <Pencil className="mr-2 h-4 w-4" />
                                                            Chỉnh sửa
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => setResetPwCompany(company)}>
                                                            <KeyRound className="mr-2 h-4 w-4" />
                                                            Đặt lại mật khẩu
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => toggleCompanyStatus(company)}>
                                                            {company.isActive ? (
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
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={Boolean(editingCompany)} onOpenChange={(open) => {
                if (!open) {
                    setEditingCompany(null);
                    setEditForm(EMPTY_EDIT_FORM);
                }
            }}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Chỉnh sửa company</DialogTitle>
                        <DialogDescription>Cập nhật thông tin công ty và tài khoản đăng nhập đi kèm.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleUpdate} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-code">Mã công ty *</Label>
                                <Input
                                    id="edit-code"
                                    value={editForm.code}
                                    onChange={(event) => setEditForm((prev) => ({ ...prev, code: event.target.value }))}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-name">Tên công ty *</Label>
                                <Input
                                    id="edit-name"
                                    value={editForm.name}
                                    onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))}
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-username">Tên đăng nhập *</Label>
                                <Input
                                    id="edit-username"
                                    value={editForm.username}
                                    onChange={(event) => setEditForm((prev) => ({ ...prev, username: event.target.value }))}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-email">Email</Label>
                                <Input
                                    id="edit-email"
                                    type="email"
                                    value={editForm.email}
                                    onChange={(event) => setEditForm((prev) => ({ ...prev, email: event.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-contact-person">Người liên hệ</Label>
                                <Input
                                    id="edit-contact-person"
                                    value={editForm.contactPerson}
                                    onChange={(event) => setEditForm((prev) => ({ ...prev, contactPerson: event.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-phone-number">Số điện thoại</Label>
                                <Input
                                    id="edit-phone-number"
                                    value={editForm.phoneNumber}
                                    onChange={(event) => setEditForm((prev) => ({ ...prev, phoneNumber: event.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-address">Địa chỉ</Label>
                            <Input
                                id="edit-address"
                                value={editForm.address}
                                onChange={(event) => setEditForm((prev) => ({ ...prev, address: event.target.value }))}
                            />
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setEditingCompany(null);
                                    setEditForm(EMPTY_EDIT_FORM);
                                }}
                            >
                                Hủy
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={Boolean(resetPwCompany)} onOpenChange={(open) => {
                if (!open) {
                    setResetPwCompany(null);
                    setNewPassword("");
                }
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Đặt lại mật khẩu company</DialogTitle>
                        <DialogDescription>
                            Đặt lại mật khẩu cho tài khoản {resetPwCompany?.companyUser?.username || "company"}.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleResetPassword} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="new-password">Mật khẩu mới</Label>
                            <Input
                                id="new-password"
                                type="password"
                                value={newPassword}
                                onChange={(event) => setNewPassword(event.target.value)}
                                placeholder="Ít nhất 6 ký tự"
                                required
                            />
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setResetPwCompany(null);
                                    setNewPassword("");
                                }}
                            >
                                Hủy
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? "Đang cập nhật..." : "Đặt lại mật khẩu"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
