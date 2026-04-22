"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface TherapeuticGroupOption {
    id: string;
    name: string;
    isActive: boolean;
    drugCount?: number;
    updatedAt?: string;
}

interface TherapeuticGroupPickerProps {
    value: TherapeuticGroupOption | null;
    onChange: (value: TherapeuticGroupOption | null) => void;
    disabled?: boolean;
    allowCreate?: boolean;
    placeholder?: string;
    inputClassName?: string;
}

function normalizeName(value: string) {
    return value
        .trim()
        .replace(/\s+/g, " ")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

export default function TherapeuticGroupPicker({
    value,
    onChange,
    disabled = false,
    allowCreate = true,
    placeholder = "Tìm hoặc tạo nhóm điều trị",
    inputClassName,
}: TherapeuticGroupPickerProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [options, setOptions] = useState<TherapeuticGroupOption[]>([]);
    const [query, setQuery] = useState(value?.name ?? "");
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const deferredQuery = useDeferredValue(query);

    useEffect(() => {
        setQuery(value?.name ?? "");
    }, [value?.id, value?.name]);

    useEffect(() => {
        const handlePointerDown = (event: MouseEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handlePointerDown);
        return () => document.removeEventListener("mousedown", handlePointerDown);
    }, []);

    useEffect(() => {
        const fetchOptions = async () => {
            setIsLoading(true);
            try {
                const res = await fetch("/api/admin/therapeutic-groups?status=active&limit=200");
                if (!res.ok) {
                    throw new Error();
                }

                const result = await res.json();
                setOptions(result.data || []);
            } catch {
                toast.error("Không thể tải danh mục nhóm điều trị");
            } finally {
                setIsLoading(false);
            }
        };

        fetchOptions();
    }, []);

    const optionPool = useMemo(() => {
        if (!value || options.some((option) => option.id === value.id)) {
            return options;
        }

        return [value, ...options];
    }, [options, value]);

    const filteredOptions = useMemo(() => {
        const normalizedQuery = normalizeName(deferredQuery);
        if (!normalizedQuery) {
            return optionPool.slice(0, 50);
        }

        return optionPool.filter((option) => normalizeName(option.name).includes(normalizedQuery));
    }, [deferredQuery, optionPool]);

    const showCreateAction = Boolean(
        allowCreate
        && (
        deferredQuery.trim()
        && !optionPool.some((option) => normalizeName(option.name) === normalizeName(deferredQuery))
        )
    );

    const handleSelect = (option: TherapeuticGroupOption) => {
        onChange(option);
        setQuery(option.name);
        setIsOpen(false);
    };

    const handleCreate = async () => {
        const name = query.trim();
        if (!name) {
            return;
        }

        setIsCreating(true);
        try {
            const res = await fetch("/api/admin/therapeutic-groups", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name }),
            });

            const result = await res.json();
            if (!res.ok) {
                toast.error(result.message || "Không thể tạo nhóm điều trị");
                return;
            }

            const createdGroup = result.data as TherapeuticGroupOption;
            setOptions((prev) => {
                const withoutDuplicate = prev.filter((option) => option.id !== createdGroup.id);
                return [...withoutDuplicate, createdGroup].sort((left, right) => left.name.localeCompare(right.name, "vi"));
            });
            onChange(createdGroup);
            setQuery(createdGroup.name);
            setIsOpen(false);

            if (result.meta?.created) {
                toast.success("Đã tạo nhóm điều trị mới");
            } else if (result.meta?.reactivated) {
                toast.success("Đã kích hoạt lại nhóm điều trị");
            } else {
                toast.success("Đã chọn nhóm điều trị hiện có");
            }
        } catch {
            toast.error("Không thể tạo nhóm điều trị");
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div ref={containerRef} className="relative">
            <div className="relative">
                <Input
                    value={query}
                    disabled={disabled}
                    placeholder={placeholder}
                    className={inputClassName ?? "h-9 pr-20"}
                    onFocus={() => setIsOpen(true)}
                    onChange={(event) => {
                        const nextValue = event.target.value;
                        setQuery(nextValue);
                        setIsOpen(true);
                        if (value && nextValue !== value.name) {
                            onChange(null);
                        }
                    }}
                />
                <div className="absolute inset-y-0 right-2 flex items-center gap-1">
                    {value && !disabled ? (
                        <button
                            type="button"
                            onClick={() => {
                                onChange(null);
                                setQuery("");
                                setIsOpen(true);
                            }}
                            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                            aria-label="Xóa nhóm điều trị đã chọn"
                        >
                            <X className="size-4" />
                        </button>
                    ) : null}
                    <ChevronDown className="size-4 text-gray-400" />
                </div>
            </div>

            {value && !value.isActive ? (
                <p className="mt-1 text-xs text-amber-600">Nhóm hiện tại đang bị ẩn nhưng vẫn được giữ cho bản ghi này.</p>
            ) : null}

            {isOpen ? (
                <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
                    {isLoading ? (
                        <div className="flex items-center gap-2 px-3 py-3 text-sm text-gray-500">
                            <Loader2 className="size-4 animate-spin" />
                            Đang tải danh mục...
                        </div>
                    ) : (
                        <>
                            <div className="max-h-64 overflow-y-auto py-1">
                                {filteredOptions.length > 0 ? (
                                    filteredOptions.map((option) => (
                                        <button
                                            key={option.id}
                                            type="button"
                                            className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50"
                                            onClick={() => handleSelect(option)}
                                        >
                                            <span className="truncate">
                                                {option.name}
                                                {!option.isActive ? " (đang ẩn)" : ""}
                                            </span>
                                            {value?.id === option.id ? <Check className="size-4 text-emerald-600" /> : null}
                                        </button>
                                    ))
                                ) : (
                                    <div className="px-3 py-3 text-sm text-gray-500">Không tìm thấy nhóm điều trị phù hợp.</div>
                                )}
                            </div>

                            {showCreateAction ? (
                                <div className="border-t border-gray-100 p-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full justify-start"
                                        onClick={handleCreate}
                                        disabled={isCreating}
                                    >
                                        {isCreating ? (
                                            <Loader2 className="mr-2 size-4 animate-spin" />
                                        ) : (
                                            <Plus className="mr-2 size-4" />
                                        )}
                                        Tạo nhóm điều trị "{query.trim()}"
                                    </Button>
                                </div>
                            ) : null}
                        </>
                    )}
                </div>
            ) : null}
        </div>
    );
}
