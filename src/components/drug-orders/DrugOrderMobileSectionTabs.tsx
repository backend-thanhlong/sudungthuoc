"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface DrugOrderMobileSectionTab {
    value: string;
    label: ReactNode;
    icon?: ReactNode;
    disabled?: boolean;
}

interface DrugOrderMobileSectionTabsProps {
    value: string;
    tabs: DrugOrderMobileSectionTab[];
    onValueChange: (value: string) => void;
    className?: string;
    sticky?: boolean;
}

export default function DrugOrderMobileSectionTabs({
    value,
    tabs,
    onValueChange,
    className,
    sticky = false,
}: DrugOrderMobileSectionTabsProps) {
    return (
        <div
            className={cn(
                "overflow-x-auto",
                sticky && "sticky top-16 z-20 bg-gray-50 py-2",
                className
            )}
        >
            <div className="inline-flex min-w-full gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
                {tabs.map((tab) => {
                    const active = tab.value === value;

                    return (
                        <Button
                            key={tab.value}
                            type="button"
                            variant={active ? "secondary" : "ghost"}
                            size="sm"
                            disabled={tab.disabled}
                            onClick={() => onValueChange(tab.value)}
                            className={cn(
                                "min-w-fit flex-1 rounded-md px-3",
                                active && "bg-blue-50 text-blue-700 hover:bg-blue-50"
                            )}
                        >
                            {tab.icon}
                            <span>{tab.label}</span>
                        </Button>
                    );
                })}
            </div>
        </div>
    );
}
