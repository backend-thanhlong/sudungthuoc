"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface DrugOrderShipmentLineMetric {
    label: string;
    value: ReactNode;
}

export interface DrugOrderShipmentLine {
    id: string;
    title: ReactNode;
    subtitle?: ReactNode;
    metrics?: DrugOrderShipmentLineMetric[];
    reason?: ReactNode;
}

interface DrugOrderShipmentMobileCardProps {
    title: ReactNode;
    subtitle?: ReactNode;
    status?: ReactNode;
    note?: ReactNode;
    lines?: DrugOrderShipmentLine[];
    receipts?: ReactNode;
    footer?: ReactNode;
    className?: string;
}

export default function DrugOrderShipmentMobileCard({
    title,
    subtitle,
    status,
    note,
    lines = [],
    receipts,
    footer,
    className,
}: DrugOrderShipmentMobileCardProps) {
    return (
        <div className={cn("rounded-xl border border-slate-200 bg-white p-4 shadow-sm", className)}>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="font-semibold text-slate-900">{title}</div>
                    {subtitle ? <div className="mt-1 text-sm text-slate-500">{subtitle}</div> : null}
                </div>
                {status ? <div className="shrink-0">{status}</div> : null}
            </div>

            {note ? (
                <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    {note}
                </div>
            ) : null}

            {lines.length > 0 ? (
                <div className="mt-4 space-y-3">
                    {lines.map((line) => (
                        <div key={line.id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-3">
                            <div className="break-words font-medium text-slate-900">{line.title}</div>
                            {line.subtitle ? (
                                <div className="mt-1 break-words text-xs text-slate-500">{line.subtitle}</div>
                            ) : null}
                            {line.metrics && line.metrics.length > 0 ? (
                                <div className="mt-3 grid grid-cols-2 gap-2">
                                    {line.metrics.map((metric) => (
                                        <div key={metric.label}>
                                            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                                                {metric.label}
                                            </div>
                                            <div className="mt-1 break-words text-sm font-semibold text-slate-900">
                                                {metric.value}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : null}
                            {line.reason ? (
                                <div className="mt-3 text-sm text-slate-600">{line.reason}</div>
                            ) : null}
                        </div>
                    ))}
                </div>
            ) : null}

            {receipts ? <div className="mt-4">{receipts}</div> : null}
            {footer ? <div className="mt-4 text-sm text-slate-500">{footer}</div> : null}
        </div>
    );
}
