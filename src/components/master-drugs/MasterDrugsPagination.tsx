"use client";

import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { PAGE_SIZE_OPTIONS } from "@/components/master-drugs/master-drugs-config";

type PaginationItem = number | "...";

const getPaginationItems = (page: number, totalPages: number): PaginationItem[] => {
    if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const pages: PaginationItem[] = [1];

    if (page > 3) {
        pages.push("...");
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
        pages.push("...");
    }

    pages.push(totalPages);
    return pages;
};

interface MasterDrugsPaginationProps {
    page: number;
    totalPages: number;
    limit: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (value: string) => void;
}

export default function MasterDrugsPagination({
    page,
    totalPages,
    limit,
    onPageChange,
    onPageSizeChange,
}: MasterDrugsPaginationProps) {
    const paginationItems = getPaginationItems(page, totalPages);

    return (
        <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>Hiển thị</span>
                    <Select value={limit.toString()} onValueChange={onPageSizeChange}>
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
            <div className="flex gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(1)}
                    disabled={page === 1}
                    title="Trang đầu"
                >
                    Trang đầu
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(Math.max(1, page - 1))}
                    disabled={page === 1}
                    title="Trang trước"
                >
                    Trước
                </Button>

                {paginationItems.map((item, index) => (
                    item === "..." ? (
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
                            key={item}
                            variant={page === item ? "default" : "outline"}
                            size="sm"
                            onClick={() => onPageChange(item)}
                            className={`w-9 px-0 ${page === item ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
                        >
                            {item}
                        </Button>
                    )
                ))}

                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    title="Trang sau"
                >
                    Sau
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(totalPages)}
                    disabled={page === totalPages}
                    title="Trang cuối"
                >
                    Trang cuối
                </Button>
            </div>
        </div>
    );
}
