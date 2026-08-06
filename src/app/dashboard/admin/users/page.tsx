"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
    latitude: number | null;
    longitude: number | null;
    role: string;
    isActive: boolean;
    createdAt: string;
}

interface UsersSummary {
    totalFacilities: number;
    ministryHospitals: number;
    regionalMedicalCenters: number;
    privateHospitals: number;
    autonomyGroup2: number;
    autonomyGroup3: number;
}

const USER_SEARCH_FIELDS = [
    { value: "all", label: "Tất cả" },
    { value: "username", label: "Tên đăng nhập" },
    { value: "facilityName", label: "Tên cơ sở" },
    { value: "facilityCode", label: "Mã cơ sở" },
    { value: "facilityType", label: "Loại cơ sở" },
    { value: "autonomyGroup", label: "Nhóm tự chủ" },
    { value: "contactPerson", label: "Người liên hệ" },
    { value: "phoneNumber", label: "SĐT" },
    { value: "address", label: "Địa chỉ" },
] as const;

const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;

type UserSearchField = (typeof USER_SEARCH_FIELDS)[number]["value"];
type PaginationItem = number | "ellipsis";

interface UsersResponse {
    data: User[];
    metadata?: {
        total?: number;
        page?: number;
        limit?: number;
        totalPages?: number;
        summary?: UsersSummary;
    };
}

const EMPTY_USERS_SUMMARY: UsersSummary = {
    totalFacilities: 0,
    ministryHospitals: 0,
    regionalMedicalCenters: 0,
    privateHospitals: 0,
    autonomyGroup2: 0,
    autonomyGroup3: 0,
};

const USERS_SUMMARY_CARD_CONFIG: Array<{
    key: keyof UsersSummary;
    label: string;
    accentClassName: string;
    valueClassName: string;
}> = [
    {
        key: "totalFacilities",
        label: "Số lượng cơ sở",
        accentClassName: "bg-blue-500",
        valueClassName: "text-blue-700",
    },
    {
        key: "ministryHospitals",
        label: "Số lượng Bệnh viện trực thuộc Bộ/Ngành",
        accentClassName: "bg-cyan-500",
        valueClassName: "text-cyan-700",
    },
    {
        key: "regionalMedicalCenters",
        label: "Số lượng Trung tâm y tế khu vực trực thuộc",
        accentClassName: "bg-emerald-500",
        valueClassName: "text-emerald-700",
    },
    {
        key: "privateHospitals",
        label: "Số lượng Bệnh viện tư nhân",
        accentClassName: "bg-amber-500",
        valueClassName: "text-amber-700",
    },
    {
        key: "autonomyGroup2",
        label: "Số lượng cơ sở tự chủ Nhóm 2",
        accentClassName: "bg-violet-500",
        valueClassName: "text-violet-700",
    },
    {
        key: "autonomyGroup3",
        label: "Số lượng cơ sở tự chủ Nhóm 3",
        accentClassName: "bg-rose-500",
        valueClassName: "text-rose-700",
    },
];

function getPaginationItems(page: number, totalPages: number): PaginationItem[] {
    if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const pages: PaginationItem[] = [1];

    if (page > 3) {
        pages.push("ellipsis");
    }

    let start = Math.max(2, page - 1);
    let end = Math.min(totalPages - 1, page + 1);

    if (page < 3) {
        start = 2;
        end = 4;
    } else if (page > totalPages - 2) {
        start = totalPages - 3;
        end = totalPages - 1;
    }

    for (let currentPage = start; currentPage <= end; currentPage += 1) {
        pages.push(currentPage);
    }

    if (page < totalPages - 2) {
        pages.push("ellipsis");
    }

    pages.push(totalPages);

    return pages;
}

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [summary, setSummary] = useState<UsersSummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchField, setSearchField] = useState<UserSearchField>("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState<number>(PAGE_SIZE_OPTIONS[0]);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const latestRequestId = useRef(0);

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
        latitude: "",
        longitude: "",
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
        latitude: "",
        longitude: "",
    });

    // Reset Password Config
    const [resetPwUser, setResetPwUser] = useState<User | null>(null);
    const [newPassword, setNewPassword] = useState("");

    // Delete Config
    const [deletingUser, setDeletingUser] = useState<User | null>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchUsers = useCallback(async (options?: { signal?: AbortSignal; pageOverride?: number }) => {
        const currentPage = options?.pageOverride ?? page;
        const trimmedSearchTerm = searchTerm.trim();
        const params = new URLSearchParams({
            page: currentPage.toString(),
            limit: limit.toString(),
            searchField,
        });

        if (trimmedSearchTerm) {
            params.set("searchTerm", trimmedSearchTerm);
        }

        const requestId = ++latestRequestId.current;
        setIsLoading(true);

        try {
            const res = await fetch(`/api/admin/users?${params.toString()}`, {
                signal: options?.signal,
            });
            if (!res.ok) {
                throw new Error("Failed to fetch users");
            }

            const data: UsersResponse = await res.json();
            if (requestId !== latestRequestId.current || options?.signal?.aborted) {
                return;
            }

            const nextUsers = Array.isArray(data.data) ? data.data : [];
            const nextTotalRecords = data.metadata?.total ?? 0;
            const nextTotalPages = Math.max(1, data.metadata?.totalPages ?? 1);
            const nextSummary = data.metadata?.summary ?? EMPTY_USERS_SUMMARY;

            setTotalRecords(nextTotalRecords);
            setTotalPages(nextTotalPages);
            setSummary(nextSummary);

            if (currentPage > nextTotalPages) {
                setPage(nextTotalPages);
                return;
            }

            setUsers(nextUsers);
        } catch (error) {
            if (error instanceof Error && error.name === "AbortError") {
                return;
            }

            console.error("Error fetching users:", error);
            if (requestId === latestRequestId.current) {
                toast.error("Không thể tải danh sách người dùng");
            }
        } finally {
            if (requestId === latestRequestId.current) {
                setIsLoading(false);
            }
        }
    }, [limit, page, searchField, searchTerm]);

    useEffect(() => {
        const controller = new AbortController();
        void fetchUsers({ signal: controller.signal });

        return () => controller.abort();
    }, [fetchUsers]);

    const hasActiveSearch = searchTerm.trim().length > 0;
    const canResetSearch = hasActiveSearch || searchField !== "all";
    const paginationItems = getPaginationItems(page, totalPages);
    const showSummarySkeleton = isLoading && !summary;

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
                    address: "",
                    latitude: "",
                    longitude: "",
                });
                await fetchUsers();
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
                await fetchUsers();
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
                await fetchUsers();
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
                await fetchUsers();
            }
        } catch {
            toast.error("Đã xảy ra lỗi");
        }
    };

    const handleSearchFieldChange = (value: string) => {
        setSearchField(value as UserSearchField);
        setPage(1);
    };

    const handleSearchTermChange = (value: string) => {
        setSearchTerm(value);
        setPage(1);
    };

    const handlePageSizeChange = (value: string) => {
        setLimit(Number(value));
        setPage(1);
    };

    const handleResetSearch = () => {
        setSearchField("all");
        setSearchTerm("");
        setPage(1);
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
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="latitude">Vĩ độ</Label>
                                    <Input
                                        id="latitude"
                                        type="number"
                                        min="-90"
                                        max="90"
                                        step="any"
                                        value={createForm.latitude}
                                        onChange={(e) => setCreateForm({ ...createForm, latitude: e.target.value })}
                                        placeholder="vd: 10.04516"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="longitude">Kinh độ</Label>
                                    <Input
                                        id="longitude"
                                        type="number"
                                        min="-180"
                                        max="180"
                                        step="any"
                                        value={createForm.longitude}
                                        onChange={(e) => setCreateForm({ ...createForm, longitude: e.target.value })}
                                        placeholder="vd: 105.74685"
                                    />
                                </div>
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

            <div className="overflow-x-auto pb-1">
                <div className="flex min-w-max gap-4">
                    {USERS_SUMMARY_CARD_CONFIG.map((item) => (
                        <Card
                            key={item.key}
                            className="relative min-w-[220px] overflow-hidden border border-slate-200 shadow-sm"
                        >
                            <div className={`absolute inset-x-0 top-0 h-1 ${item.accentClassName}`} />
                            <CardContent className="p-5 pt-6">
                                <p className="text-sm font-medium leading-5 text-slate-500">
                                    {item.label}
                                </p>
                                {showSummarySkeleton ? (
                                    <div className="mt-4 space-y-2">
                                        <div className="h-8 w-20 animate-pulse rounded bg-slate-200" />
                                        <div className="h-3 w-28 animate-pulse rounded bg-slate-100" />
                                    </div>
                                ) : (
                                    <p className={`mt-4 text-3xl font-bold ${item.valueClassName}`}>
                                        {summary
                                            ? new Intl.NumberFormat("vi-VN").format(summary[item.key])
                                            : "—"}
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            <Card className="border-0 shadow-lg">
                <CardHeader>
                    <CardTitle>Danh sách cơ sở</CardTitle>
                    <CardDescription>
                        {`Hiển thị ${users.length} / ${totalRecords} cơ sở y tế`}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col gap-3 lg:flex-row">
                        <Select
                            value={searchField}
                            onValueChange={handleSearchFieldChange}
                        >
                            <SelectTrigger className="w-full bg-white lg:w-[220px]">
                                <SelectValue placeholder="Chọn trường tìm kiếm" />
                            </SelectTrigger>
                            <SelectContent>
                                {USER_SEARCH_FIELDS.map((field) => (
                                    <SelectItem key={field.value} value={field.value}>
                                        {field.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Input
                            value={searchTerm}
                            onChange={(e) => handleSearchTermChange(e.target.value)}
                            placeholder="Nhập từ khóa để tìm kiếm cơ sở..."
                            className="bg-white"
                        />

                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleResetSearch}
                            disabled={!canResetSearch}
                            className="lg:w-auto"
                        >
                            Xóa lọc
                        </Button>
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-blue-600 hover:bg-blue-600">
                                        <TableHead className="w-[60px] text-center text-white font-bold">STT</TableHead>
                                        <TableHead className="text-white font-bold">Tên đăng nhập</TableHead>
                                        <TableHead className="text-white font-bold">Tên cơ sở</TableHead>
                                        <TableHead className="text-white font-bold">Mã cơ sở</TableHead>
                                        <TableHead className="text-white font-bold">Loại cơ sở</TableHead>
                                        <TableHead className="text-white font-bold">Nhóm tự chủ</TableHead>
                                        <TableHead className="text-white font-bold">Người liên hệ</TableHead>
                                        <TableHead className="text-white font-bold">SĐT</TableHead>
                                        <TableHead className="text-white font-bold">Địa chỉ</TableHead>
                                        <TableHead className="text-white font-bold">Tọa độ</TableHead>
                                        <TableHead className="text-white font-bold">Trạng thái</TableHead>
                                        <TableHead className="text-white font-bold">Ngày tạo</TableHead>
                                        <TableHead className="text-right text-white font-bold">Thao tác</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.map((user, index) => (
                                        <TableRow key={user.id}>
                                            <TableCell className="text-center">{(page - 1) * limit + index + 1}</TableCell>
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
                                            <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                                                {user.latitude != null && user.longitude != null
                                                    ? `${user.latitude.toFixed(5)}, ${user.longitude.toFixed(5)}`
                                                    : "-"}
                                            </TableCell>
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
                                                                    latitude: user.latitude?.toString() || "",
                                                                    longitude: user.longitude?.toString() || "",
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
                                            <TableCell colSpan={12} className="text-center text-gray-500 py-8">
                                                {hasActiveSearch
                                                    ? "Không tìm thấy cơ sở phù hợp"
                                                    : "Chưa có cơ sở nào được đăng ký"}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>

                            <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <span>Hiển thị</span>
                                        <Select value={limit.toString()} onValueChange={handlePageSizeChange}>
                                            <SelectTrigger className="w-[120px] bg-white">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {PAGE_SIZE_OPTIONS.map((pageSize) => (
                                                    <SelectItem key={pageSize} value={pageSize.toString()}>
                                                        {pageSize} dòng
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        Trang {page} / {totalPages}
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage(1)}
                                        disabled={page === 1}
                                        title="Trang đầu"
                                    >
                                        Trang đầu
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                                        disabled={page === 1}
                                        title="Trang trước"
                                    >
                                        Trước
                                    </Button>

                                    {paginationItems.map((paginationItem, index) => (
                                        paginationItem === "ellipsis" ? (
                                            <Button
                                                key={`ellipsis-${index}`}
                                                variant="ghost"
                                                size="sm"
                                                disabled
                                                className="w-9 px-0"
                                            >
                                                ...
                                            </Button>
                                        ) : (
                                            <Button
                                                key={paginationItem}
                                                variant={page === paginationItem ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => setPage(paginationItem)}
                                                className={`w-9 px-0 ${page === paginationItem ? "bg-blue-600 hover:bg-blue-700" : ""}`}
                                            >
                                                {paginationItem}
                                            </Button>
                                        )
                                    ))}

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage((currentPage) => Math.min(totalPages, currentPage + 1))}
                                        disabled={page === totalPages}
                                        title="Trang sau"
                                    >
                                        Sau
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage(totalPages)}
                                        disabled={page === totalPages}
                                        title="Trang cuối"
                                    >
                                        Trang cuối
                                    </Button>
                                </div>
                            </div>
                        </div>
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
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-latitude">Vĩ độ</Label>
                                <Input
                                    id="edit-latitude"
                                    type="number"
                                    min="-90"
                                    max="90"
                                    step="any"
                                    value={editForm.latitude}
                                    onChange={(e) => setEditForm({ ...editForm, latitude: e.target.value })}
                                    placeholder="vd: 10.04516"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-longitude">Kinh độ</Label>
                                <Input
                                    id="edit-longitude"
                                    type="number"
                                    min="-180"
                                    max="180"
                                    step="any"
                                    value={editForm.longitude}
                                    onChange={(e) => setEditForm({ ...editForm, longitude: e.target.value })}
                                    placeholder="vd: 105.74685"
                                />
                            </div>
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
