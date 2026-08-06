"use client";

import { useEffect, useRef } from "react";
import { Pencil, Trash2 } from "lucide-react";
import TherapeuticGroupPicker, {
    type TherapeuticGroupOption,
} from "@/components/master-drugs/TherapeuticGroupPicker";
import { Button } from "@/components/ui/button";
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
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
    DOMESTIC_OPTIONS,
    DRUG_GROUP_OPTIONS,
    PRESCRIPTION_OPTIONS,
    TABLE_COLUMNS,
    type ColumnFilterKey,
    type ColumnFilters,
    type MasterDrug,
    type TableColumnId,
    type WrappableColumnId,
    isMasterDrugColumnVisible,
} from "@/components/master-drugs/master-drugs-config";

const SHARED_WIDE_TEXT_COLUMN_CLASS = "w-[220px] min-w-[220px] max-w-[220px]";

type DataTableTextCellProps = {
    value: string | null | undefined;
    wrapped?: boolean;
    cellClassName?: string;
    contentClassName?: string;
    codeStyle?: boolean;
};

function DataTableTextCell({
    value,
    wrapped = false,
    cellClassName,
    contentClassName,
    codeStyle = false,
}: DataTableTextCellProps) {
    const rawValue = typeof value === "string" ? value : "";
    const hasValue = rawValue.trim().length > 0;
    const displayValue = hasValue ? rawValue : "-";
    const contentClasses = cn(
        "block max-w-full",
        wrapped ? "whitespace-normal break-words" : "truncate",
        codeStyle && "rounded bg-gray-100 px-2 py-1 text-sm font-mono",
        contentClassName,
    );
    const content = codeStyle ? (
        <code className={contentClasses}>{displayValue}</code>
    ) : (
        <span className={contentClasses}>{displayValue}</span>
    );

    return (
        <TableCell className={cellClassName}>
            {hasValue ? (
                <Tooltip>
                    <TooltipTrigger asChild>{content}</TooltipTrigger>
                    <TooltipContent align="start" className="max-w-sm whitespace-pre-wrap break-words">
                        {rawValue}
                    </TooltipContent>
                </Tooltip>
            ) : content}
        </TableCell>
    );
}

interface MasterDrugsTableProps {
    drugs: MasterDrug[];
    isAdmin: boolean;
    page: number;
    limit: number;
    visibleColumns: Record<TableColumnId, boolean>;
    wrappedColumns: Record<WrappableColumnId, boolean>;
    columnFiltersDraft: ColumnFilters;
    selectedTherapeuticGroupFilter: TherapeuticGroupOption | null;
    therapeuticGroupFilterResetKey: number;
    hasActiveDataFilters: boolean;
    onColumnFilterChange: (field: ColumnFilterKey, value: string) => void;
    onTherapeuticGroupFilterChange: (value: TherapeuticGroupOption | null) => void;
    onApplyColumnFilters: () => void;
    onClearColumnFilters: () => void;
    onEdit: (drug: MasterDrug) => void;
    onDelete: (id: string) => void;
    onToggleDrugStatus: (drugId: string, currentStatus: boolean) => void;
    selectedIds: Set<string>;
    onToggleSelected: (id: string, checked: boolean) => void;
    onTogglePageSelected: (checked: boolean) => void;
}

export default function MasterDrugsTable({
    drugs,
    isAdmin,
    page,
    limit,
    visibleColumns,
    wrappedColumns,
    columnFiltersDraft,
    selectedTherapeuticGroupFilter,
    therapeuticGroupFilterResetKey,
    hasActiveDataFilters,
    onColumnFilterChange,
    onTherapeuticGroupFilterChange,
    onApplyColumnFilters,
    onClearColumnFilters,
    onEdit,
    onDelete,
    onToggleDrugStatus,
    selectedIds,
    onToggleSelected,
    onTogglePageSelected,
}: MasterDrugsTableProps) {
    const pageCheckboxRef = useRef<HTMLInputElement | null>(null);
    const isColumnVisible = (columnId: TableColumnId) =>
        isMasterDrugColumnVisible(columnId, visibleColumns);
    const visibleColumnCount = TABLE_COLUMNS.filter((column) => isColumnVisible(column.id)).length;
    const selectedVisibleCount = drugs.filter((drug) => selectedIds.has(drug.id)).length;
    const allVisibleSelected = drugs.length > 0 && selectedVisibleCount === drugs.length;
    const someVisibleSelected = selectedVisibleCount > 0 && selectedVisibleCount < drugs.length;

    useEffect(() => {
        if (pageCheckboxRef.current) {
            pageCheckboxRef.current.indeterminate = someVisibleSelected;
        }
    }, [someVisibleSelected]);

    return (
        <TooltipProvider delayDuration={500}>
            <Table>
                <TableHeader>
                    <TableRow className="bg-blue-600 hover:bg-blue-600">
                        {isAdmin && (
                            <TableHead className="w-[42px] text-center text-white font-bold">
                                <input
                                    ref={pageCheckboxRef}
                                    type="checkbox"
                                    checked={allVisibleSelected}
                                    onChange={(event) => onTogglePageSelected(event.target.checked)}
                                    aria-label="Chọn tất cả thuốc trên trang"
                                    className="h-4 w-4 rounded border-white/70 align-middle accent-cyan-600"
                                />
                            </TableHead>
                        )}
                        {isColumnVisible("stt") && (
                            <TableHead className="w-[50px] text-center text-white font-bold">STT</TableHead>
                        )}
                        {isColumnVisible("maAtc") && (
                            <TableHead className="text-white font-bold">Mã ATC</TableHead>
                        )}
                        {isColumnVisible("maBhyt") && (
                            <TableHead className="text-white font-bold">Mã BHYT</TableHead>
                        )}
                        {isColumnVisible("tenThuoc") && (
                            <TableHead className="text-white font-bold">Tên thuốc</TableHead>
                        )}
                        {isColumnVisible("hoatChat") && (
                            <TableHead
                                className={cn(
                                    "sticky left-0 z-20 bg-blue-600 text-white font-bold shadow-[4px_0_6px_-4px_rgba(15,23,42,0.28)]",
                                    SHARED_WIDE_TEXT_COLUMN_CLASS,
                                )}
                            >
                                Hoạt chất
                            </TableHead>
                        )}
                        {isColumnVisible("hamLuong") && (
                            <TableHead className={cn("text-white font-bold", SHARED_WIDE_TEXT_COLUMN_CLASS)}>
                                Hàm lượng
                            </TableHead>
                        )}
                        {isColumnVisible("soDangKy") && (
                            <TableHead className="text-white font-bold">Số đăng ký</TableHead>
                        )}
                        {isColumnVisible("dangBaoChe") && (
                            <TableHead className="text-white font-bold">Dạng bào chế</TableHead>
                        )}
                        {isColumnVisible("quyCach") && (
                            <TableHead className="text-white font-bold">Quy cách</TableHead>
                        )}
                        {isColumnVisible("duongDung") && (
                            <TableHead className="text-white font-bold">Đường dùng</TableHead>
                        )}
                        {isColumnVisible("donViTinh") && (
                            <TableHead className="text-white font-bold">Đơn vị tính</TableHead>
                        )}
                        {isColumnVisible("isTrongNuoc") && (
                            <TableHead className="text-white font-bold">Trong nước</TableHead>
                        )}
                        {isColumnVisible("isKeDon") && (
                            <TableHead className="text-white font-bold">Kê đơn</TableHead>
                        )}
                        {isColumnVisible("nhomThuoc") && (
                            <TableHead className="text-white font-bold">Nhóm thuốc</TableHead>
                        )}
                        {isColumnVisible("therapeuticGroup") && (
                            <TableHead className="text-white font-bold">Nhóm điều trị</TableHead>
                        )}
                        {isColumnVisible("isThuocHiem") && (
                            <TableHead className="text-white font-bold">Thuốc hiếm</TableHead>
                        )}
                        {isColumnVisible("actions") && (
                            <TableHead className="text-right text-white font-bold">Thao tác</TableHead>
                        )}
                    </TableRow>
                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                        {isAdmin && (
                            <TableHead className="w-[42px] bg-slate-50" />
                        )}
                        {isColumnVisible("stt") && (
                            <TableHead className="w-[50px] bg-slate-50" />
                        )}
                        {isColumnVisible("maAtc") && (
                            <TableHead className="bg-slate-50 py-2">
                                <Input
                                    value={columnFiltersDraft.maAtc}
                                    onChange={(event) => onColumnFilterChange("maAtc", event.target.value)}
                                    placeholder="Lọc..."
                                    className="h-8 bg-white text-xs"
                                />
                            </TableHead>
                        )}
                        {isColumnVisible("maBhyt") && (
                            <TableHead className="bg-slate-50 py-2">
                                <Input
                                    value={columnFiltersDraft.maBhyt}
                                    onChange={(event) => onColumnFilterChange("maBhyt", event.target.value)}
                                    placeholder="Lọc..."
                                    className="h-8 bg-white text-xs"
                                />
                            </TableHead>
                        )}
                        {isColumnVisible("tenThuoc") && (
                            <TableHead className="bg-slate-50 py-2">
                                <Input
                                    value={columnFiltersDraft.tenThuoc}
                                    onChange={(event) => onColumnFilterChange("tenThuoc", event.target.value)}
                                    placeholder="Lọc..."
                                    className="h-8 bg-white text-xs"
                                />
                            </TableHead>
                        )}
                        {isColumnVisible("hoatChat") && (
                            <TableHead
                                className={cn(
                                    "sticky left-0 z-20 bg-slate-50 py-2 shadow-[4px_0_6px_-4px_rgba(15,23,42,0.16)]",
                                    SHARED_WIDE_TEXT_COLUMN_CLASS,
                                )}
                            >
                                <Input
                                    value={columnFiltersDraft.hoatChat}
                                    onChange={(event) => onColumnFilterChange("hoatChat", event.target.value)}
                                    placeholder="Lọc..."
                                    className="h-8 bg-white text-xs"
                                />
                            </TableHead>
                        )}
                        {isColumnVisible("hamLuong") && (
                            <TableHead className={cn("bg-slate-50 py-2", SHARED_WIDE_TEXT_COLUMN_CLASS)}>
                                <Input
                                    value={columnFiltersDraft.hamLuong}
                                    onChange={(event) => onColumnFilterChange("hamLuong", event.target.value)}
                                    placeholder="Lọc..."
                                    className="h-8 bg-white text-xs"
                                />
                            </TableHead>
                        )}
                        {isColumnVisible("soDangKy") && (
                            <TableHead className="bg-slate-50 py-2">
                                <Input
                                    value={columnFiltersDraft.soDangKy}
                                    onChange={(event) => onColumnFilterChange("soDangKy", event.target.value)}
                                    placeholder="Lọc..."
                                    className="h-8 bg-white text-xs"
                                />
                            </TableHead>
                        )}
                        {isColumnVisible("dangBaoChe") && (
                            <TableHead className="bg-slate-50 py-2">
                                <Input
                                    value={columnFiltersDraft.dangBaoChe}
                                    onChange={(event) => onColumnFilterChange("dangBaoChe", event.target.value)}
                                    placeholder="Lọc..."
                                    className="h-8 bg-white text-xs"
                                />
                            </TableHead>
                        )}
                        {isColumnVisible("quyCach") && (
                            <TableHead className="bg-slate-50 py-2">
                                <Input
                                    value={columnFiltersDraft.quyCach}
                                    onChange={(event) => onColumnFilterChange("quyCach", event.target.value)}
                                    placeholder="Lọc..."
                                    className="h-8 bg-white text-xs"
                                />
                            </TableHead>
                        )}
                        {isColumnVisible("duongDung") && (
                            <TableHead className="bg-slate-50 py-2">
                                <Input
                                    value={columnFiltersDraft.duongDung}
                                    onChange={(event) => onColumnFilterChange("duongDung", event.target.value)}
                                    placeholder="Lọc..."
                                    className="h-8 bg-white text-xs"
                                />
                            </TableHead>
                        )}
                        {isColumnVisible("donViTinh") && (
                            <TableHead className="bg-slate-50 py-2">
                                <Input
                                    value={columnFiltersDraft.donViTinh}
                                    onChange={(event) => onColumnFilterChange("donViTinh", event.target.value)}
                                    placeholder="Lọc..."
                                    className="h-8 bg-white text-xs"
                                />
                            </TableHead>
                        )}
                        {isColumnVisible("isTrongNuoc") && (
                            <TableHead className="bg-slate-50 py-2">
                                <Select
                                    value={columnFiltersDraft.isTrongNuoc || "__all__"}
                                    onValueChange={(value) => onColumnFilterChange("isTrongNuoc", value === "__all__" ? "" : value)}
                                >
                                    <SelectTrigger className="h-8 bg-white text-xs">
                                        <SelectValue placeholder="Tất cả" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__all__">Tất cả</SelectItem>
                                        {DOMESTIC_OPTIONS.map((option) => (
                                            <SelectItem key={option} value={option}>
                                                {option}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </TableHead>
                        )}
                        {isColumnVisible("isKeDon") && (
                            <TableHead className="bg-slate-50 py-2">
                                <Select
                                    value={columnFiltersDraft.isKeDon || "__all__"}
                                    onValueChange={(value) => onColumnFilterChange("isKeDon", value === "__all__" ? "" : value)}
                                >
                                    <SelectTrigger className="h-8 bg-white text-xs">
                                        <SelectValue placeholder="Tất cả" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__all__">Tất cả</SelectItem>
                                        {PRESCRIPTION_OPTIONS.map((option) => (
                                            <SelectItem key={option} value={option}>
                                                {option}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </TableHead>
                        )}
                        {isColumnVisible("nhomThuoc") && (
                            <TableHead className="bg-slate-50 py-2">
                                <Select
                                    value={columnFiltersDraft.nhomThuoc || "__all__"}
                                    onValueChange={(value) => onColumnFilterChange("nhomThuoc", value === "__all__" ? "" : value)}
                                >
                                    <SelectTrigger className="h-8 bg-white text-xs">
                                        <SelectValue placeholder="Tất cả" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__all__">Tất cả</SelectItem>
                                        {DRUG_GROUP_OPTIONS.map((option) => (
                                            <SelectItem key={option} value={option}>
                                                {option}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </TableHead>
                        )}
                        {isColumnVisible("therapeuticGroup") && (
                            <TableHead className="bg-slate-50 py-2">
                                <TherapeuticGroupPicker
                                    key={`therapeutic-group-filter-${therapeuticGroupFilterResetKey}`}
                                    value={selectedTherapeuticGroupFilter}
                                    onChange={onTherapeuticGroupFilterChange}
                                    allowCreate={false}
                                    placeholder="Tìm và chọn"
                                    inputClassName="h-8 bg-white pr-16 text-xs"
                                />
                            </TableHead>
                        )}
                        {isColumnVisible("isThuocHiem") && (
                            <TableHead className="bg-slate-50 py-2">
                                <Select
                                    value={columnFiltersDraft.isThuocHiem || "__all__"}
                                    onValueChange={(value) => onColumnFilterChange("isThuocHiem", value === "__all__" ? "" : value)}
                                >
                                    <SelectTrigger className="h-8 bg-white text-xs">
                                        <SelectValue placeholder="Tất cả" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__all__">Tất cả</SelectItem>
                                        <SelectItem value="true">Có</SelectItem>
                                        <SelectItem value="false">Không</SelectItem>
                                    </SelectContent>
                                </Select>
                            </TableHead>
                        )}
                        {isColumnVisible("actions") && (
                            <TableHead className="bg-slate-50 py-2 text-right">
                                <div className="flex justify-end gap-2">
                                    <Button
                                        size="sm"
                                        className="h-8 bg-cyan-500 px-3 text-white hover:bg-cyan-600"
                                        onClick={onApplyColumnFilters}
                                    >
                                        Lọc
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 px-3"
                                        onClick={onClearColumnFilters}
                                    >
                                        Xóa lọc
                                    </Button>
                                </div>
                            </TableHead>
                        )}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {drugs.map((drug, index) => (
                        <TableRow key={drug.id} className="group">
                            {isAdmin && (
                                <TableCell className="text-center">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.has(drug.id)}
                                        onChange={(event) => onToggleSelected(drug.id, event.target.checked)}
                                        aria-label={`Chọn thuốc ${drug.tenThuoc}`}
                                        className="h-4 w-4 rounded border-gray-300 align-middle accent-cyan-600"
                                    />
                                </TableCell>
                            )}
                            {isColumnVisible("stt") && (
                                <TableCell className="text-center">{(page - 1) * limit + index + 1}</TableCell>
                            )}
                            {isColumnVisible("maAtc") && (
                                <DataTableTextCell
                                    value={drug.maAtc}
                                    contentClassName="max-w-[180px]"
                                    codeStyle
                                />
                            )}
                            {isColumnVisible("maBhyt") && (
                                <DataTableTextCell
                                    value={drug.maBhyt}
                                    contentClassName="max-w-[180px]"
                                    codeStyle
                                />
                            )}
                            {isColumnVisible("tenThuoc") && (
                                <DataTableTextCell
                                    value={drug.tenThuoc}
                                    wrapped={wrappedColumns.tenThuoc}
                                    contentClassName="max-w-xs font-medium"
                                />
                            )}
                            {isColumnVisible("hoatChat") && (
                                <DataTableTextCell
                                    value={drug.hoatChat}
                                    wrapped={wrappedColumns.hoatChat}
                                    cellClassName={cn(
                                        "sticky left-0 z-10 bg-white text-gray-600 shadow-[4px_0_6px_-4px_rgba(15,23,42,0.16)] group-hover:bg-muted/50",
                                        SHARED_WIDE_TEXT_COLUMN_CLASS,
                                    )}
                                    contentClassName="w-full"
                                />
                            )}
                            {isColumnVisible("hamLuong") && (
                                <DataTableTextCell
                                    value={drug.hamLuong}
                                    wrapped={wrappedColumns.hamLuong}
                                    cellClassName={SHARED_WIDE_TEXT_COLUMN_CLASS}
                                    contentClassName="w-full"
                                />
                            )}
                            {isColumnVisible("soDangKy") && (
                                <DataTableTextCell
                                    value={drug.soDangKy}
                                    wrapped={wrappedColumns.soDangKy}
                                    contentClassName="max-w-xs"
                                    codeStyle
                                />
                            )}
                            {isColumnVisible("dangBaoChe") && (
                                <DataTableTextCell
                                    value={drug.dangBaoChe}
                                    wrapped={wrappedColumns.dangBaoChe}
                                    contentClassName="max-w-xs"
                                />
                            )}
                            {isColumnVisible("quyCach") && (
                                <DataTableTextCell
                                    value={drug.quyCach}
                                    wrapped={wrappedColumns.quyCach}
                                    contentClassName="max-w-xs"
                                />
                            )}
                            {isColumnVisible("duongDung") && (
                                <DataTableTextCell
                                    value={drug.duongDung}
                                    wrapped={wrappedColumns.duongDung}
                                    contentClassName="max-w-[180px]"
                                />
                            )}
                            {isColumnVisible("donViTinh") && (
                                <DataTableTextCell
                                    value={drug.donViTinh}
                                    wrapped={wrappedColumns.donViTinh}
                                    contentClassName="max-w-[180px]"
                                />
                            )}
                            {isColumnVisible("isTrongNuoc") && (
                                <DataTableTextCell
                                    value={drug.isTrongNuoc}
                                    contentClassName="max-w-[120px]"
                                />
                            )}
                            {isColumnVisible("isKeDon") && (
                                <DataTableTextCell
                                    value={drug.isKeDon}
                                    contentClassName="max-w-[150px]"
                                />
                            )}
                            {isColumnVisible("nhomThuoc") && (
                                <DataTableTextCell value={drug.nhomThuoc} contentClassName="max-w-xs" />
                            )}
                            {isColumnVisible("therapeuticGroup") && (
                                <DataTableTextCell
                                    value={drug.therapeuticGroup?.name}
                                    contentClassName="max-w-xs"
                                />
                            )}
                            {isColumnVisible("isThuocHiem") && (
                                <DataTableTextCell
                                    value={drug.isThuocHiem ? "Có" : "Không"}
                                    contentClassName="max-w-[100px]"
                                />
                            )}
                            {isColumnVisible("actions") && (
                                <TableCell className="text-right whitespace-nowrap">
                                    {isAdmin && (
                                        <>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                onClick={() => onEdit(drug)}
                                                title="Sửa"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => onDelete(drug.id)}
                                                title="Xóa"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => onToggleDrugStatus(drug.id, drug.isActive)}
                                            >
                                                {drug.isActive ? "Ẩn" : "Hiện"}
                                            </Button>
                                        </>
                                    )}
                                </TableCell>
                            )}
                        </TableRow>
                    ))}
                    {drugs.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={visibleColumnCount + (isAdmin ? 1 : 0)} className="text-center text-gray-500 py-8">
                                {hasActiveDataFilters ? "Không tìm thấy thuốc phù hợp" : "Chưa có thuốc trong danh mục"}
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </TooltipProvider>
    );
}
