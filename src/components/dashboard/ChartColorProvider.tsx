"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import {
    DEFAULT_CHART_COLOR_SETTINGS,
    getChartGradientStops,
    mergeChartColorSettings,
    resolveChartColor,
    resolveChartColorSource,
    type ChartColorSettings,
    type ChartSemanticKey,
    type ResolvedChartColorSource,
} from "@/lib/chart-colors";

interface ChartColorContextValue {
    settings: ChartColorSettings;
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    resolveColor: (input: {
        chartId?: string;
        key?: string;
        semanticKey?: ChartSemanticKey;
        index?: number;
        fallback?: string;
    }) => string;
    resolveColorSource: (input: {
        chartId?: string;
        key?: string;
        semanticKey?: ChartSemanticKey;
        index?: number;
        fallback?: string;
    }) => ResolvedChartColorSource;
    getGradientStops: (index: number) => { from: string; to: string };
}

const ChartColorContext = createContext<ChartColorContextValue | null>(null);

export function ChartColorProvider({
    children,
    apiUrl = "/api/chart-colors",
}: {
    children: ReactNode;
    apiUrl?: string;
}) {
    const [settings, setSettings] = useState<ChartColorSettings>(DEFAULT_CHART_COLOR_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(apiUrl, { cache: "no-store" });
            const payload = await response.json().catch(() => null);

            if (!response.ok) {
                throw new Error(payload?.message || "Không thể tải bảng màu biểu đồ");
            }

            setSettings(mergeChartColorSettings(payload?.settings));
        } catch (err) {
            console.error("Failed to load chart colors:", err);
            setError(err instanceof Error ? err.message : "Không thể tải bảng màu biểu đồ");
            setSettings(DEFAULT_CHART_COLOR_SETTINGS);
        } finally {
            setLoading(false);
        }
    }, [apiUrl]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const value = useMemo<ChartColorContextValue>(() => ({
        settings,
        loading,
        error,
        refresh,
        resolveColor: (input) => resolveChartColor(settings, input),
        resolveColorSource: (input) => resolveChartColorSource(settings, input),
        getGradientStops: (index) => getChartGradientStops(settings, index),
    }), [error, loading, refresh, settings]);

    return (
        <ChartColorContext.Provider value={value}>
            {children}
        </ChartColorContext.Provider>
    );
}

export function useChartColors() {
    const context = useContext(ChartColorContext);
    if (!context) {
        return {
            settings: DEFAULT_CHART_COLOR_SETTINGS,
            loading: false,
            error: null,
            refresh: async () => undefined,
            resolveColor: (input: Parameters<typeof resolveChartColor>[1]) =>
                resolveChartColor(DEFAULT_CHART_COLOR_SETTINGS, input),
            resolveColorSource: (input: Parameters<typeof resolveChartColorSource>[1]) =>
                resolveChartColorSource(DEFAULT_CHART_COLOR_SETTINGS, input),
            getGradientStops: (index: number) => getChartGradientStops(DEFAULT_CHART_COLOR_SETTINGS, index),
        } satisfies ChartColorContextValue;
    }

    return context;
}
