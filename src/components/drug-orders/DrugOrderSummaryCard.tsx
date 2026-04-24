"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface DrugOrderSummaryMetric {
    label: string;
    value: ReactNode;
    tone?: "default" | "muted" | "success" | "warning" | "danger";
}

interface DrugOrderSummaryCardProps {
    title: ReactNode;
    subtitle?: ReactNode;
    description?: ReactNode;
    status?: ReactNode;
    metrics?: DrugOrderSummaryMetric[];
    warnings?: ReactNode[];
    footer?: ReactNode;
    active?: boolean;
    className?: string;
    onClick?: () => void;
}

const metricToneClass: Record<NonNullable<DrugOrderSummaryMetric["tone"]>, string> = {
    default: "text-slate-900",
    muted: "text-slate-500",
    success: "text-emerald-700",
    warning: "text-amber-700",
    danger: "text-rose-700",
};

export default function DrugOrderSummaryCard({
    title,
    subtitle,
    description,
    status,
    metrics = [],
    warnings = [],
    footer,
    active = false,
    className,
    onClick,
}: DrugOrderSummaryCardProps) {
    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (!onClick) {
            return;
        }

        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onClick();
        }
    };

    return (
        <div
            role={onClick ? "button" : undefined}
            tabIndex={onClick ? 0 : undefined}
            onClick={onClick}
            onKeyDown={handleKeyDown}
            className={cn(
                "rounded-xl border bg-white p-4 text-left shadow-sm transition",
                active
                    ? "border-blue-500 bg-blue-50/70 ring-1 ring-blue-100"
                    : "border-slate-200",
                onClick && "cursor-pointer hover:border-slate-300 hover:shadow",
                className
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="truncate font-semibold text-slate-900">{title}</div>
                    {subtitle ? (
                        <div className="mt-1 line-clamp-2 text-sm text-slate-600">{subtitle}</div>
                    ) : null}
                    {description ? (
                        <div className="mt-2 text-sm text-slate-500">{description}</div>
                    ) : null}
                </div>
                {status ? <div className="shrink-0">{status}</div> : null}
            </div>

            {metrics.length > 0 ? (
                <div className="mt-4 grid grid-cols-2 gap-2">
                    {metrics.map((metric) => (
                        <div key={metric.label} className="rounded-lg bg-slate-50 px-3 py-2">
                            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                                {metric.label}
                            </div>
                            <div
                                className={cn(
                                    "mt-1 min-w-0 break-words text-sm font-semibold",
                                    metricToneClass[metric.tone || "default"]
                                )}
                            >
                                {metric.value}
                            </div>
                        </div>
                    ))}
                </div>
            ) : null}

            {warnings.length > 0 ? (
                <div className="mt-3 space-y-2">
                    {warnings.map((warning, index) => (
                        <div
                            key={index}
                            className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
                        >
                            {warning}
                        </div>
                    ))}
                </div>
            ) : null}

            {footer ? <div className="mt-3 text-sm text-slate-500">{footer}</div> : null}
        </div>
    );
}
