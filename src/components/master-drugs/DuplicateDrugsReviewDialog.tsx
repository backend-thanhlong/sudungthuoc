"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, RefreshCw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface DuplicateRegistrationItem {
    id: string;
    maChung: string;
    tenThuoc: string;
    hoatChat: string | null;
    hamLuong: string | null;
    dangBaoChe: string | null;
    soDangKy: string | null;
    quyCach: string | null;
    donViTinh: string | null;
    isActive: boolean;
    referenceCount: number;
    canDelete: boolean;
    deleteBlockReason: string | null;
}

export interface DuplicateRegistrationGroup {
    soDangKy: string;
    count: number;
    activeCount: number;
    items: DuplicateRegistrationItem[];
}

export interface DuplicateRegistrationResponse {
    summary: {
        duplicateRegistrationCount: number;
        duplicateDrugCount: number;
    };
    groups: DuplicateRegistrationGroup[];
}

interface DuplicateDrugsReviewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    data: DuplicateRegistrationResponse | null;
    isRefreshing: boolean;
    onRefreshDuplicates: () => Promise<void> | void;
    onDeleted: () => Promise<void> | void;
}

const normalizeSearchValue = (value: string | null | undefined) =>
    (value || "").trim().toLowerCase();

const joinSearchValues = (values: Array<string | null | undefined>) =>
    values.map(normalizeSearchValue).join(" ");

function FieldText({ label, value }: { label: string; value: string | null | undefined }) {
    return (
        <div className="min-w-0">
            <dt className="text-[11px] font-medium uppercase text-slate-500">{label}</dt>
            <dd className="mt-0.5 truncate text-sm text-slate-900" title={value || "-"}>
                {value || "-"}
            </dd>
        </div>
    );
}

export default function DuplicateDrugsReviewDialog({
    open,
    onOpenChange,
    data,
    isRefreshing,
    onRefreshDuplicates,
    onDeleted,
}: DuplicateDrugsReviewDialogProps) {
    const [query, setQuery] = useState("");
    const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set());
    const [deleteTarget, setDeleteTarget] = useState<DuplicateRegistrationItem | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const groups = useMemo(() => data?.groups || [], [data?.groups]);
    const queryValue = normalizeSearchValue(query);

    const filteredGroups = useMemo(() => {
        if (!queryValue) {
            return groups;
        }

        return groups
            .map((group) => {
                const groupMatches = normalizeSearchValue(group.soDangKy).includes(queryValue);
                const items = group.items.filter((item) => {
                    const searchable = joinSearchValues([
                        group.soDangKy,
                        item.maChung,
                        item.tenThuoc,
                        item.hoatChat,
                        item.hamLuong,
                        item.dangBaoChe,
                        item.quyCach,
                        item.donViTinh,
                    ]);

                    return searchable.includes(queryValue);
                });

                return groupMatches ? group : { ...group, items };
            })
            .filter((group) => group.items.length > 0);
    }, [groups, queryValue]);

    useEffect(() => {
        if (!open) {
            setQuery("");
            setDeleteTarget(null);
            return;
        }

        if (groups.length > 0) {
            setOpenGroups(new Set([groups[0].soDangKy]));
        } else {
            setOpenGroups(new Set());
        }
    }, [groups, open]);

    const toggleGroup = (soDangKy: string) => {
        setOpenGroups((previous) => {
            const next = new Set(previous);
            if (next.has(soDangKy)) {
                next.delete(soDangKy);
            } else {
                next.add(soDangKy);
            }
            return next;
        });
    };

    const handleRefresh = async () => {
        await onRefreshDuplicates();
    };

    const handleDelete = async () => {
        if (!deleteTarget) {
            return;
        }

        setDeletingId(deleteTarget.id);
        try {
            const res = await fetch(`/api/admin/master-drugs/${deleteTarget.id}`, {
                method: "DELETE",
            });
            const result = await res.json().catch(() => ({}));

            if (!res.ok) {
                toast.error(result.message || "Không thể xóa thuốc này");
                return;
            }

            toast.success(`Đã xóa ${deleteTarget.maChung} - ${deleteTarget.tenThuoc}`);
            setDeleteTarget(null);
            await onDeleted();
        } catch (error) {
            console.error(error);
            toast.error("Đã xảy ra lỗi khi xóa thuốc");
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="flex max-h-[85vh] w-[90vw] max-w-[90vw] grid-rows-none flex-col gap-0 p-0 sm:max-w-[90vw]">
                    <DialogHeader className="border-b px-6 py-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="space-y-2">
                                <DialogTitle>Rà soát thuốc trùng</DialogTitle>
                                <DialogDescription>
                                    Xem từng nhóm số đăng ký trùng và xóa từng thuốc ngay trong modal.
                                </DialogDescription>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Badge variant="outline">
                                    {data?.summary.duplicateRegistrationCount || 0} số đăng ký trùng
                                </Badge>
                                <Badge variant="outline">
                                    {data?.summary.duplicateDrugCount || 0} dòng thuốc
                                </Badge>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="border-b px-6 py-3">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div className="relative w-full lg:max-w-md">
                                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                                <Input
                                    value={query}
                                    onChange={(event) => setQuery(event.target.value)}
                                    placeholder="Tìm số đăng ký, mã chung, tên thuốc..."
                                    className="pl-9"
                                />
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                            >
                                <RefreshCw className={cn("size-4", isRefreshing && "animate-spin")} />
                                Kiểm tra lại
                            </Button>
                        </div>
                    </div>

                    <TooltipProvider delayDuration={300}>
                        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
                            {filteredGroups.length > 0 ? (
                                <div className="space-y-3">
                                    {filteredGroups.map((group) => {
                                        const isOpen = openGroups.has(group.soDangKy);

                                        return (
                                            <section
                                                key={group.soDangKy}
                                                className="overflow-hidden rounded-lg border border-slate-200 bg-white"
                                            >
                                                <button
                                                    type="button"
                                                    className="flex w-full items-center justify-between gap-3 bg-slate-50 px-4 py-3 text-left hover:bg-slate-100"
                                                    onClick={() => toggleGroup(group.soDangKy)}
                                                >
                                                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                                                        {isOpen ? (
                                                            <ChevronDown className="size-4 text-slate-500" />
                                                        ) : (
                                                            <ChevronRight className="size-4 text-slate-500" />
                                                        )}
                                                        <span className="font-mono text-sm font-semibold text-slate-950">
                                                            {group.soDangKy}
                                                        </span>
                                                        <Badge variant="outline">{group.count} dòng</Badge>
                                                        <Badge variant="outline">{group.activeCount} đang dùng</Badge>
                                                    </div>
                                                </button>

                                                {isOpen && (
                                                    <div className="divide-y divide-slate-100">
                                                        {group.items.map((item) => {
                                                            const isDeleting = deletingId === item.id;
                                                            const deleteDisabled = Boolean(deletingId) || !item.canDelete;

                                                            return (
                                                                <div
                                                                    key={item.id}
                                                                    className="grid gap-3 px-4 py-3 xl:grid-cols-[1fr_auto] xl:items-center"
                                                                >
                                                                    <dl className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
                                                                        <FieldText label="Mã chung" value={item.maChung} />
                                                                        <FieldText label="Tên thuốc" value={item.tenThuoc} />
                                                                        <FieldText label="Hoạt chất" value={item.hoatChat} />
                                                                        <FieldText label="Hàm lượng" value={item.hamLuong} />
                                                                        <FieldText label="Dạng bào chế" value={item.dangBaoChe} />
                                                                        <FieldText label="Quy cách" value={item.quyCach} />
                                                                        <FieldText label="Đơn vị" value={item.donViTinh} />
                                                                    </dl>

                                                                    <div className="flex flex-wrap items-center justify-end gap-2">
                                                                        <Badge
                                                                            className={cn(
                                                                                "border-0",
                                                                                item.isActive
                                                                                    ? "bg-emerald-100 text-emerald-800"
                                                                                    : "bg-slate-100 text-slate-700",
                                                                            )}
                                                                        >
                                                                            {item.isActive ? "Đang dùng" : "Đã ẩn"}
                                                                        </Badge>
                                                                        {item.referenceCount > 0 && (
                                                                            <Tooltip>
                                                                                <TooltipTrigger asChild>
                                                                                    <Badge variant="outline" className="border-amber-300 text-amber-800">
                                                                                        Có liên kết
                                                                                    </Badge>
                                                                                </TooltipTrigger>
                                                                                <TooltipContent className="max-w-xs">
                                                                                    {item.deleteBlockReason || "Thuốc đang có dữ liệu liên quan"}
                                                                                </TooltipContent>
                                                                            </Tooltip>
                                                                        )}
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <span>
                                                                                    <Button
                                                                                        type="button"
                                                                                        variant="ghost"
                                                                                        size="icon-sm"
                                                                                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                                                                        onClick={() => setDeleteTarget(item)}
                                                                                        disabled={deleteDisabled}
                                                                                        aria-label={`Xóa thuốc ${item.tenThuoc}`}
                                                                                    >
                                                                                        <Trash2 className="size-4" />
                                                                                    </Button>
                                                                                </span>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent>
                                                                                {item.canDelete
                                                                                    ? "Xóa thuốc này"
                                                                                    : item.deleteBlockReason || "Không thể xóa vì có dữ liệu liên quan"}
                                                                            </TooltipContent>
                                                                        </Tooltip>
                                                                        {isDeleting && (
                                                                            <RefreshCw className="size-4 animate-spin text-slate-500" />
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </section>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="rounded-lg border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
                                    {queryValue
                                        ? "Không tìm thấy nhóm trùng phù hợp"
                                        : "Không còn nhóm số đăng ký trùng"}
                                </div>
                            )}
                        </div>
                    </TooltipProvider>

                    <DialogFooter className="border-t px-6 py-4">
                        <DialogClose asChild>
                            <Button type="button" variant="outline">
                                Đóng
                            </Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(nextOpen) => {
                if (!nextOpen && !deletingId) {
                    setDeleteTarget(null);
                }
            }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Xóa thuốc này khỏi danh mục dùng chung?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {deleteTarget
                                ? `${deleteTarget.maChung} - ${deleteTarget.tenThuoc} sẽ bị xóa khỏi danh mục dùng chung.`
                                : "Thuốc này sẽ bị xóa khỏi danh mục dùng chung."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={Boolean(deletingId)}>Hủy bỏ</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(event) => {
                                event.preventDefault();
                                handleDelete();
                            }}
                            disabled={Boolean(deletingId)}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {deletingId ? "Đang xóa..." : "Xóa thuốc"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
