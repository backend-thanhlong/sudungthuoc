"use client";

import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type LineActionVariant = "default" | "secondary" | "outline" | "destructive" | "ghost";

export interface DrugOrderLineField {
    label: string;
    value: ReactNode;
    tone?: "default" | "muted" | "success" | "warning" | "danger";
}

export interface DrugOrderLineAction {
    id: string;
    label: string;
    icon?: ReactNode;
    loading?: boolean;
    disabled?: boolean;
    hidden?: boolean;
    variant?: LineActionVariant;
    onClick: () => void;
}

interface DrugOrderLineQuantityInput {
    label: string;
    value: string;
    disabled?: boolean;
    invalid?: boolean;
    min?: string;
    step?: string;
    placeholder?: string;
    onChange: (value: string) => void;
}

interface DrugOrderLineMobileCardProps {
    title: ReactNode;
    subtitle?: ReactNode;
    badges?: ReactNode;
    fields?: DrugOrderLineField[];
    quantityInput?: DrugOrderLineQuantityInput;
    suggestion?: ReactNode;
    validationMessage?: ReactNode;
    warning?: ReactNode;
    actions?: DrugOrderLineAction[];
    children?: ReactNode;
    className?: string;
    highlighted?: boolean;
}

const fieldToneClass: Record<NonNullable<DrugOrderLineField["tone"]>, string> = {
    default: "text-slate-900",
    muted: "text-slate-500",
    success: "text-emerald-700",
    warning: "text-amber-700",
    danger: "text-rose-700",
};

export default function DrugOrderLineMobileCard({
    title,
    subtitle,
    badges,
    fields = [],
    quantityInput,
    suggestion,
    validationMessage,
    warning,
    actions = [],
    children,
    className,
    highlighted = false,
}: DrugOrderLineMobileCardProps) {
    const visibleActions = actions.filter((action) => !action.hidden);

    return (
        <div
            className={cn(
                "rounded-xl border bg-white p-4 shadow-sm",
                highlighted ? "border-blue-300 bg-blue-50/60" : "border-slate-200",
                className
            )}
        >
            <div className="space-y-2">
                <div className="min-w-0">
                    <div className="break-words font-semibold text-slate-900">{title}</div>
                    {subtitle ? (
                        <div className="mt-1 break-words text-sm text-slate-500">{subtitle}</div>
                    ) : null}
                </div>
                {badges ? <div className="flex flex-wrap gap-2">{badges}</div> : null}
            </div>

            {fields.length > 0 ? (
                <div className="mt-4 grid grid-cols-2 gap-2">
                    {fields.map((field) => (
                        <div key={field.label} className="rounded-lg bg-slate-50 px-3 py-2">
                            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                                {field.label}
                            </div>
                            <div
                                className={cn(
                                    "mt-1 min-w-0 break-words text-sm font-semibold",
                                    fieldToneClass[field.tone || "default"]
                                )}
                            >
                                {field.value}
                            </div>
                        </div>
                    ))}
                </div>
            ) : null}

            {quantityInput ? (
                <div className="mt-4 space-y-2">
                    <Label>{quantityInput.label}</Label>
                    <Input
                        type="number"
                        value={quantityInput.value}
                        min={quantityInput.min || "0"}
                        step={quantityInput.step || "0.01"}
                        placeholder={quantityInput.placeholder}
                        disabled={quantityInput.disabled}
                        onChange={(event) => quantityInput.onChange(event.target.value)}
                        className={cn(
                            "text-right",
                            quantityInput.invalid &&
                                "border-amber-400 bg-amber-50 focus-visible:ring-amber-500"
                        )}
                    />
                </div>
            ) : null}

            {suggestion ? (
                <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900">
                    {suggestion}
                </div>
            ) : null}

            {validationMessage ? (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    {validationMessage}
                </div>
            ) : null}

            {warning ? (
                <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                    {warning}
                </div>
            ) : null}

            {children ? <div className="mt-4">{children}</div> : null}

            {visibleActions.length > 0 ? (
                <div className="mt-4 flex flex-wrap justify-end gap-2">
                    {visibleActions.map((action) => (
                        <Button
                            key={action.id}
                            type="button"
                            size="sm"
                            variant={action.variant || "outline"}
                            disabled={action.disabled || action.loading}
                            onClick={action.onClick}
                        >
                            {action.loading ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : (
                                action.icon
                            )}
                            {action.label}
                        </Button>
                    ))}
                </div>
            ) : null}
        </div>
    );
}
