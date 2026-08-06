"use client";

import { useTheme } from "next-themes";
import {
    DEFAULT_CHART_PALETTE,
    DEFAULT_CHART_SEMANTIC_COLORS,
} from "@/lib/chart-colors";

export interface DashboardChartTheme {
    axis: string;
    grid: string;
    tooltipBackground: string;
    tooltipBorder: string;
    tooltipText: string;
    mutedText: string;
    cardBackground: string;
}

export const DASHBOARD_PALETTE = {
    primaryBlue: "#1974D3",
    cyan: "#53CCEC",
    warm: "#FFCC98",
    softWarm: "#FFE6B6",
    pale: "#FFF7D9",
    ink: "#00001B",
} as const;

export const DASHBOARD_CHART_COLORS = [
    ...DEFAULT_CHART_PALETTE,
] as const;

export const DASHBOARD_CHART_GRADIENTS = [
    { from: DASHBOARD_PALETTE.cyan, to: DASHBOARD_PALETTE.primaryBlue },
    { from: DASHBOARD_PALETTE.pale, to: DASHBOARD_PALETTE.warm },
    { from: DASHBOARD_PALETTE.softWarm, to: DASHBOARD_PALETTE.warm },
    { from: DASHBOARD_PALETTE.primaryBlue, to: DASHBOARD_PALETTE.ink },
    { from: DASHBOARD_PALETTE.pale, to: DASHBOARD_PALETTE.cyan },
    { from: DASHBOARD_PALETTE.softWarm, to: DASHBOARD_PALETTE.primaryBlue },
] as const;

export const DASHBOARD_SEMANTIC_COLORS = {
    ...DEFAULT_CHART_SEMANTIC_COLORS,
} as const;

export function useDashboardChartTheme(): DashboardChartTheme {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === "dark";

    return {
        axis: isDark ? DASHBOARD_PALETTE.pale : DASHBOARD_PALETTE.ink,
        grid: isDark ? "rgba(255, 230, 182, 0.18)" : DASHBOARD_PALETTE.softWarm,
        tooltipBackground: isDark ? "#1e293b" : "#ffffff",
        tooltipBorder: isDark ? "rgba(255, 230, 182, 0.3)" : DASHBOARD_PALETTE.softWarm,
        tooltipText: isDark ? DASHBOARD_PALETTE.pale : DASHBOARD_PALETTE.ink,
        mutedText: isDark ? DASHBOARD_PALETTE.softWarm : DASHBOARD_PALETTE.ink,
        cardBackground: isDark ? "#0f172a" : "#ffffff",
    };
}
