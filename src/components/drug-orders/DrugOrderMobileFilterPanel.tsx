"use client";

import type { ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface DrugOrderMobileFilterPanelProps {
    title?: ReactNode;
    activeCount?: number;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: ReactNode;
    className?: string;
    triggerLabel?: string;
    footer?: ReactNode;
}

export default function DrugOrderMobileFilterPanel({
    title = "Bộ lọc",
    activeCount = 0,
    open,
    onOpenChange,
    children,
    className,
    triggerLabel = "Lọc",
    footer,
}: DrugOrderMobileFilterPanelProps) {
    return (
        <div className={className}>
            <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(!open)}
                className="w-full justify-between sm:w-auto"
            >
                <span className="inline-flex items-center gap-2">
                    <SlidersHorizontal className="size-4" />
                    {triggerLabel}
                </span>
                {activeCount > 0 ? (
                    <Badge variant="secondary" className="ml-2">
                        {activeCount}
                    </Badge>
                ) : null}
            </Button>

            {open ? (
                <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                        <h3 className="font-semibold text-slate-900">{title}</h3>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onOpenChange(false)}
                        >
                            Đóng
                        </Button>
                    </div>
                    <div className={cn("mt-4 grid gap-3")}>{children}</div>
                    {footer ? <div className="mt-4">{footer}</div> : null}
                </div>
            ) : null}
        </div>
    );
}
