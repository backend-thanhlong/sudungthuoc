"use client";

import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    TABLE_COLUMNS,
    WRAPPABLE_COLUMN_CONFIG,
    type TableColumnId,
    type WrappableColumnId,
    isMasterDrugColumnVisible,
} from "@/components/master-drugs/master-drugs-config";

interface MasterDrugsViewOptionsProps {
    visibleColumns: Record<TableColumnId, boolean>;
    wrappedColumns: Record<WrappableColumnId, boolean>;
    onColumnVisibilityChange: (columnId: TableColumnId, checked: boolean) => void;
    onWrappedColumnChange: (columnId: WrappableColumnId, checked: boolean) => void;
    onShowAllColumns: () => void;
}

export default function MasterDrugsViewOptions({
    visibleColumns,
    wrappedColumns,
    onColumnVisibilityChange,
    onWrappedColumnChange,
    onShowAllColumns,
}: MasterDrugsViewOptionsProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className="bg-white">
                    <Settings2 className="w-4 h-4 mr-2" />
                    Hiển thị
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel>Cột hiển thị</DropdownMenuLabel>
                <DropdownMenuItem onSelect={onShowAllColumns}>
                    Hiện tất cả
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {TABLE_COLUMNS.map((column) => (
                    <DropdownMenuCheckboxItem
                        key={column.id}
                        checked={isMasterDrugColumnVisible(column.id, visibleColumns)}
                        disabled={column.required}
                        onCheckedChange={(checked) => onColumnVisibilityChange(column.id, Boolean(checked))}
                    >
                        {column.label}
                        {column.required ? " (luôn hiển thị)" : ""}
                    </DropdownMenuCheckboxItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Xuống dòng</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {WRAPPABLE_COLUMN_CONFIG.map((column) => (
                    <DropdownMenuCheckboxItem
                        key={column.id}
                        checked={wrappedColumns[column.id]}
                        onCheckedChange={(checked) => onWrappedColumnChange(column.id, Boolean(checked))}
                    >
                        {column.label}
                    </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
