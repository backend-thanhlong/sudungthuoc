"use client";

import { useTheme } from "next-themes";

export interface DashboardChartTheme {
    axis: string;
    grid: string;
    tooltipBackground: string;
    tooltipBorder: string;
    tooltipText: string;
    mutedText: string;
    cardBackground: string;
}

export function useDashboardChartTheme(): DashboardChartTheme {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === "dark";

    return {
        axis: isDark ? "#cbd5e1" : "#64748b",
        grid: isDark ? "rgba(148, 163, 184, 0.18)" : "#e2e8f0",
        tooltipBackground: isDark ? "#1e293b" : "#ffffff",
        tooltipBorder: isDark ? "rgba(148, 163, 184, 0.28)" : "#e2e8f0",
        tooltipText: isDark ? "#f8fafc" : "#0f172a",
        mutedText: isDark ? "#94a3b8" : "#64748b",
        cardBackground: isDark ? "#0f172a" : "#ffffff",
    };
}
