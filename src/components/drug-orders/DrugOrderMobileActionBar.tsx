"use client";

import type { ReactNode } from "react";
import { Loader2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type MobileActionVariant = "default" | "secondary" | "outline" | "destructive" | "ghost";

export interface DrugOrderMobileAction {
    id: string;
    label: string;
    icon?: ReactNode;
    loading?: boolean;
    disabled?: boolean;
    hidden?: boolean;
    variant?: MobileActionVariant;
    className?: string;
    onClick: () => void;
}

interface DrugOrderMobileActionBarProps {
    actions: DrugOrderMobileAction[];
    className?: string;
    helperText?: ReactNode;
    maxVisibleActions?: number;
}

export default function DrugOrderMobileActionBar({
    actions,
    className,
    helperText,
    maxVisibleActions = 2,
}: DrugOrderMobileActionBarProps) {
    const visibleActions = actions.filter((action) => !action.hidden);
    const primaryActions = visibleActions.slice(0, maxVisibleActions);
    const overflowActions = visibleActions.slice(maxVisibleActions);

    if (visibleActions.length === 0 && !helperText) {
        return null;
    }

    return (
        <div
            className={cn(
                "fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-3 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur xl:hidden",
                className
            )}
        >
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-2">
                {helperText ? (
                    <div className="text-xs text-slate-500">{helperText}</div>
                ) : null}
                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                    <div
                        className={cn(
                            "grid gap-2",
                            primaryActions.length === 1 ? "grid-cols-1" : "grid-cols-2"
                        )}
                    >
                        {primaryActions.map((action) => (
                            <Button
                                key={action.id}
                                type="button"
                                variant={action.variant || "default"}
                                onClick={action.onClick}
                                disabled={action.disabled || action.loading}
                                className={cn("min-w-0", action.className)}
                            >
                                {action.loading ? (
                                    <Loader2 className="size-4 animate-spin" />
                                ) : (
                                    action.icon
                                )}
                                <span className="truncate">{action.label}</span>
                            </Button>
                        ))}
                    </div>

                    {overflowActions.length > 0 ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button type="button" variant="outline" size="icon" aria-label="Thêm thao tác">
                                    <MoreHorizontal className="size-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                {overflowActions.map((action) => (
                                    <DropdownMenuItem
                                        key={action.id}
                                        disabled={action.disabled || action.loading}
                                        onClick={action.onClick}
                                        variant={action.variant === "destructive" ? "destructive" : "default"}
                                        className={action.className}
                                    >
                                        {action.loading ? (
                                            <Loader2 className="size-4 animate-spin" />
                                        ) : (
                                            action.icon
                                        )}
                                        <span>{action.label}</span>
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
