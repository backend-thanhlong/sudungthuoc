"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const THEME_OPTIONS = [
    { value: "light", label: "Sáng", icon: Sun },
    { value: "dark", label: "Tối", icon: Moon },
    { value: "system", label: "Hệ thống", icon: Monitor },
] as const;

export default function ThemeToggle() {
    const { setTheme, theme, resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const currentTheme = mounted ? theme || "system" : "system";
    const CurrentIcon = mounted && resolvedTheme === "dark" ? Moon : mounted && resolvedTheme === "light" ? Sun : Monitor;
    const currentLabel = THEME_OPTIONS.find((option) => option.value === currentTheme)?.label || "Hệ thống";

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Chế độ giao diện: ${currentLabel}`}
                    className="text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                    <CurrentIcon className="size-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
                {THEME_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    const active = currentTheme === option.value;

                    return (
                        <DropdownMenuItem
                            key={option.value}
                            onClick={() => setTheme(option.value)}
                            className="cursor-pointer"
                        >
                            <Icon className="mr-2 size-4" />
                            <span className="flex-1">{option.label}</span>
                            {active && <span className="text-xs text-muted-foreground">Đang dùng</span>}
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
