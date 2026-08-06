export const CHART_COLOR_SETTING_KEY = "chartColorSettings";

const DEFAULT_PALETTE = {
    primaryBlue: "#1974D3",
    cyan: "#53CCEC",
    warm: "#FFCC98",
    softWarm: "#FFE6B6",
    pale: "#FFF7D9",
    ink: "#00001B",
} as const;

export const DEFAULT_CHART_PALETTE = [
    DEFAULT_PALETTE.primaryBlue,
    DEFAULT_PALETTE.cyan,
    DEFAULT_PALETTE.warm,
    DEFAULT_PALETTE.softWarm,
    DEFAULT_PALETTE.ink,
    DEFAULT_PALETTE.pale,
] as const;

export const DEFAULT_CHART_SEMANTIC_COLORS = {
    inventory: DEFAULT_PALETTE.primaryBlue,
    import: DEFAULT_PALETTE.cyan,
    export: DEFAULT_PALETTE.warm,
    value: DEFAULT_PALETTE.primaryBlue,
    bid: DEFAULT_PALETTE.primaryBlue,
    insurance: DEFAULT_PALETTE.primaryBlue,
    service: DEFAULT_PALETTE.softWarm,
    success: DEFAULT_PALETTE.cyan,
    warning: DEFAULT_PALETTE.warm,
    danger: DEFAULT_PALETTE.ink,
    neutral: DEFAULT_PALETTE.ink,
    muted: DEFAULT_PALETTE.pale,
    line: DEFAULT_PALETTE.ink,
    abcA: "#DC2626",
    abcB: "#F59E0B",
    abcC: "#10B981",
} as const;

export type ChartSemanticKey = keyof typeof DEFAULT_CHART_SEMANTIC_COLORS;
export type ChartArea = "dashboard" | "mua_sam" | "reports" | "inventory";

export interface ChartColorRegistryItem {
    id: string;
    label: string;
    area: ChartArea;
    description?: string;
    fixedKeys: Array<{
        key: string;
        label: string;
        semanticKey?: ChartSemanticKey;
    }>;
    supportsDynamicLabels: boolean;
}

export interface ChartColorSettings {
    version: 1;
    palette: string[];
    semantic: Record<ChartSemanticKey, string>;
    chartOverrides: Record<string, Record<string, string>>;
}

export interface ResolvedChartColorSource {
    source: "override" | "semantic" | "palette" | "fallback" | "default";
    color: string;
}

export interface ChartColorValidationResult {
    settings: ChartColorSettings;
    errors: string[];
}

export const CHART_COLOR_REGISTRY: ChartColorRegistryItem[] = [
    {
        id: "dashboard.overview.inventoryValue",
        label: "Dashboard tổng quan - Giá trị tồn kho",
        area: "dashboard",
        fixedKeys: [
            { key: "inventory", label: "Tồn kho", semanticKey: "inventory" },
        ],
        supportsDynamicLabels: true,
    },
    {
        id: "dashboard.overview.insuranceService",
        label: "Dashboard tổng quan - BHYT/Dịch vụ",
        area: "dashboard",
        fixedKeys: [
            { key: "insurance", label: "BHYT", semanticKey: "insurance" },
            { key: "service", label: "Dịch vụ", semanticKey: "service" },
        ],
        supportsDynamicLabels: false,
    },
    {
        id: "dashboard.supply.coverageRisk",
        label: "Dashboard cung ứng - Cảnh báo tồn kho",
        area: "dashboard",
        fixedKeys: [
            { key: "danger", label: "Dưới 1 tháng", semanticKey: "danger" },
            { key: "warning", label: "1 đến dưới 2 tháng", semanticKey: "warning" },
            { key: "watch", label: "2 đến dưới 3 tháng", semanticKey: "service" },
            { key: "safe", label: "Từ 3 tháng", semanticKey: "success" },
        ],
        supportsDynamicLabels: false,
    },
    {
        id: "dashboard.tender.timeline",
        label: "Dashboard đấu thầu - Tiến độ",
        area: "dashboard",
        fixedKeys: [
            { key: "expired", label: "Đã hết hạn", semanticKey: "neutral" },
            { key: "expiring", label: "Sắp hết hạn", semanticKey: "warning" },
            { key: "active", label: "Còn hiệu lực", semanticKey: "success" },
        ],
        supportsDynamicLabels: true,
    },
    {
        id: "dashboard.analysis.usageDrugGroup",
        label: "Phân tích - Nhóm thuốc",
        area: "dashboard",
        fixedKeys: [],
        supportsDynamicLabels: true,
    },
    {
        id: "dashboard.analysis.usageTherapeuticGroup",
        label: "Phân tích - Nhóm điều trị",
        area: "dashboard",
        fixedKeys: [],
        supportsDynamicLabels: true,
    },
    {
        id: "dashboard.analysis.usageTopGroups",
        label: "Phân tích - Top nhóm sử dụng",
        area: "dashboard",
        fixedKeys: [],
        supportsDynamicLabels: true,
    },
    {
        id: "dashboard.analysis.attributes",
        label: "Phân tích - Thuộc tính quản lý",
        area: "dashboard",
        fixedKeys: [
            { key: "specialControl", label: "Kiểm soát đặc biệt", semanticKey: "warning" },
            { key: "prescription", label: "Kê đơn", semanticKey: "bid" },
            { key: "domestic", label: "Trong nước", semanticKey: "success" },
        ],
        supportsDynamicLabels: true,
    },
    {
        id: "dashboard.analysis.facilityComparison",
        label: "Phân tích - So sánh CSYT",
        area: "dashboard",
        fixedKeys: [],
        supportsDynamicLabels: true,
    },
    {
        id: "dashboard.analysis.pareto",
        label: "Phân tích - Pareto ABC",
        area: "dashboard",
        fixedKeys: [
            { key: "abcA", label: "ABC A", semanticKey: "abcA" },
            { key: "abcB", label: "ABC B", semanticKey: "abcB" },
            { key: "abcC", label: "ABC C", semanticKey: "abcC" },
            { key: "line", label: "Đường tích lũy", semanticKey: "line" },
        ],
        supportsDynamicLabels: false,
    },
    {
        id: "reportsAdvanced.importExport",
        label: "Báo cáo nâng cao - Nhập xuất tồn",
        area: "reports",
        fixedKeys: [
            { key: "inventory", label: "Tồn cuối", semanticKey: "inventory" },
            { key: "import", label: "Nhập", semanticKey: "import" },
            { key: "export", label: "Xuất", semanticKey: "export" },
            { key: "value", label: "Giá trị tồn kho", semanticKey: "value" },
        ],
        supportsDynamicLabels: false,
    },
    {
        id: "muaSam.packageStatus",
        label: "Mua sắm - Trạng thái gói thầu",
        area: "mua_sam",
        fixedKeys: [
            { key: "chuaCoTbmt", label: "Chưa có TBMT", semanticKey: "neutral" },
            { key: "daCoTbmtChuaCoKqlcnt", label: "Đã có TBMT chưa có KQLCNT", semanticKey: "warning" },
            { key: "khongYeuCauTbmt", label: "Không yêu cầu TBMT", semanticKey: "service" },
            { key: "daCoKqlcnt", label: "Đã có KQLCNT", semanticKey: "success" },
        ],
        supportsDynamicLabels: false,
    },
    {
        id: "muaSam.topFacilities",
        label: "Mua sắm - Top cơ sở",
        area: "mua_sam",
        fixedKeys: [],
        supportsDynamicLabels: true,
    },
    {
        id: "muaSam.procurementType",
        label: "Mua sắm - Hình thức/quy trình",
        area: "mua_sam",
        fixedKeys: [
            { key: "bid", label: "Đấu thầu", semanticKey: "bid" },
            { key: "service", label: "Tự quyết định", semanticKey: "service" },
            { key: "success", label: "Trúng thầu", semanticKey: "success" },
        ],
        supportsDynamicLabels: true,
    },
    {
        id: "inventory.drugQuantity",
        label: "Tra cứu tồn kho - Số lượng thuốc",
        area: "inventory",
        fixedKeys: [],
        supportsDynamicLabels: true,
    },
    {
        id: "inventory.inventoryValue",
        label: "Tra cứu tồn kho - Giá trị tồn kho",
        area: "inventory",
        fixedKeys: [],
        supportsDynamicLabels: true,
    },
] as const;

export const DEFAULT_CHART_COLOR_SETTINGS: ChartColorSettings = {
    version: 1,
    palette: [...DEFAULT_CHART_PALETTE],
    semantic: { ...DEFAULT_CHART_SEMANTIC_COLORS },
    chartOverrides: {},
};

const SEMANTIC_KEYS = Object.keys(DEFAULT_CHART_SEMANTIC_COLORS) as ChartSemanticKey[];
const HEX_COLOR_PATTERN = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;
const MIN_PALETTE_SIZE = 3;
const MAX_PALETTE_SIZE = 12;
const MAX_DYNAMIC_OVERRIDES = 200;

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function normalizeHexColor(value: unknown): string | null {
    if (typeof value !== "string") {
        return null;
    }

    const trimmed = value.trim();
    const match = HEX_COLOR_PATTERN.exec(trimmed);
    if (!match) {
        return null;
    }

    const raw = match[1];
    const expanded = raw.length === 3
        ? raw.split("").map((char) => `${char}${char}`).join("")
        : raw;

    return `#${expanded.toUpperCase()}`;
}

export function normalizeDynamicChartKey(label: string) {
    const normalized = label
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    return normalized ? `dynamic:${normalized}` : "dynamic:item";
}

export function getChartColorRegistryItem(chartId: string | undefined) {
    if (!chartId) {
        return undefined;
    }

    return CHART_COLOR_REGISTRY.find((item) => item.id === chartId);
}

export function isChartOverrideKeyAllowed(chartId: string, key: string) {
    const chart = getChartColorRegistryItem(chartId);
    if (!chart) {
        return false;
    }

    if (chart.fixedKeys.some((item) => item.key === key)) {
        return true;
    }

    return chart.supportsDynamicLabels && key.startsWith("dynamic:");
}

export function getChartColorDefaults(): ChartColorSettings {
    return {
        version: 1,
        palette: [...DEFAULT_CHART_COLOR_SETTINGS.palette],
        semantic: { ...DEFAULT_CHART_COLOR_SETTINGS.semantic },
        chartOverrides: {},
    };
}

export function validateChartColorSettings(
    value: unknown,
    options: { strict?: boolean } = {}
): ChartColorValidationResult {
    const strict = options.strict ?? false;
    const defaults = getChartColorDefaults();
    const errors: string[] = [];

    if (!isRecord(value)) {
        return {
            settings: defaults,
            errors: strict ? ["Payload không hợp lệ"] : [],
        };
    }

    if (value.version !== 1) {
        errors.push("version phải là 1");
    }

    let palette = defaults.palette;
    if (Array.isArray(value.palette)) {
        const normalizedPalette = value.palette
            .map((color) => normalizeHexColor(color))
            .filter((color): color is string => Boolean(color));

        if (normalizedPalette.length !== value.palette.length) {
            errors.push("palette chỉ được chứa mã màu hex hợp lệ");
        }

        if (normalizedPalette.length < MIN_PALETTE_SIZE || normalizedPalette.length > MAX_PALETTE_SIZE) {
            errors.push(`palette phải có từ ${MIN_PALETTE_SIZE} đến ${MAX_PALETTE_SIZE} màu`);
        } else {
            palette = normalizedPalette;
        }
    } else if (strict) {
        errors.push("palette phải là danh sách màu");
    }

    const semantic: Record<ChartSemanticKey, string> = { ...defaults.semantic };
    if (isRecord(value.semantic)) {
        for (const [key, rawColor] of Object.entries(value.semantic)) {
            if (!SEMANTIC_KEYS.includes(key as ChartSemanticKey)) {
                if (strict) {
                    errors.push(`semantic không hỗ trợ key: ${key}`);
                }
                continue;
            }

            const color = normalizeHexColor(rawColor);
            if (!color) {
                errors.push(`semantic.${key} phải là mã màu hex hợp lệ`);
                continue;
            }

            semantic[key as ChartSemanticKey] = color;
        }
    } else if (strict) {
        errors.push("semantic phải là object");
    }

    const chartOverrides: Record<string, Record<string, string>> = {};
    let dynamicOverrideCount = 0;
    if (isRecord(value.chartOverrides)) {
        for (const [chartId, rawOverrides] of Object.entries(value.chartOverrides)) {
            const chart = getChartColorRegistryItem(chartId);
            if (!chart) {
                if (strict) {
                    errors.push(`chartOverrides không hỗ trợ chartId: ${chartId}`);
                }
                continue;
            }

            if (!isRecord(rawOverrides)) {
                errors.push(`chartOverrides.${chartId} phải là object`);
                continue;
            }

            const normalizedOverrides: Record<string, string> = {};
            for (const [key, rawColor] of Object.entries(rawOverrides)) {
                if (!isChartOverrideKeyAllowed(chartId, key)) {
                    if (strict) {
                        errors.push(`chartOverrides.${chartId}.${key} không được hỗ trợ`);
                    }
                    continue;
                }

                if (key.startsWith("dynamic:")) {
                    dynamicOverrideCount += 1;
                }

                const color = normalizeHexColor(rawColor);
                if (!color) {
                    errors.push(`chartOverrides.${chartId}.${key} phải là mã màu hex hợp lệ`);
                    continue;
                }

                normalizedOverrides[key] = color;
            }

            if (Object.keys(normalizedOverrides).length > 0 || strict) {
                chartOverrides[chart.id] = normalizedOverrides;
            }
        }
    } else if (strict) {
        errors.push("chartOverrides phải là object");
    }

    if (dynamicOverrideCount > MAX_DYNAMIC_OVERRIDES) {
        errors.push(`Tối đa ${MAX_DYNAMIC_OVERRIDES} override động`);
    }

    return {
        settings: {
            version: 1,
            palette,
            semantic,
            chartOverrides,
        },
        errors,
    };
}

export function mergeChartColorSettings(value: unknown): ChartColorSettings {
    return validateChartColorSettings(value, { strict: false }).settings;
}

export function resolveChartColorSource(
    settings: ChartColorSettings | null | undefined,
    input: {
        chartId?: string;
        key?: string;
        semanticKey?: ChartSemanticKey;
        index?: number;
        fallback?: string;
    }
): ResolvedChartColorSource {
    const current = settings ?? DEFAULT_CHART_COLOR_SETTINGS;
    const normalizedFallback = normalizeHexColor(input.fallback);

    if (input.chartId && input.key) {
        const overrideColor = current.chartOverrides[input.chartId]?.[input.key];
        if (overrideColor) {
            return { source: "override", color: overrideColor };
        }
    }

    if (input.semanticKey && current.semantic[input.semanticKey]) {
        return { source: "semantic", color: current.semantic[input.semanticKey] };
    }

    if (typeof input.index === "number" && current.palette.length > 0) {
        const index = Math.abs(Math.trunc(input.index)) % current.palette.length;
        return { source: "palette", color: current.palette[index] };
    }

    if (normalizedFallback) {
        return { source: "fallback", color: normalizedFallback };
    }

    return { source: "default", color: DEFAULT_CHART_COLOR_SETTINGS.palette[0] };
}

export function resolveChartColor(
    settings: ChartColorSettings | null | undefined,
    input: {
        chartId?: string;
        key?: string;
        semanticKey?: ChartSemanticKey;
        index?: number;
        fallback?: string;
    }
) {
    return resolveChartColorSource(settings, input).color;
}

export function getChartGradientStops(settings: ChartColorSettings | null | undefined, index: number) {
    const from = resolveChartColor(settings, { index });
    const to = resolveChartColor(settings, { index: index + 1 });
    return { from, to };
}
