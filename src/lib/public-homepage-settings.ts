import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";

export const PUBLIC_HOMEPAGE_BACKGROUND_SETTING_KEY = "public_homepage_background_color";
export const DEFAULT_PUBLIC_HOMEPAGE_BACKGROUND_COLOR = "#FFCC33";
export const PUBLIC_HOMEPAGE_WATERMARK_POSITIONS = ["center", "bottom-right", "bottom-left"] as const;

export type PublicHomepageWatermarkPosition = (typeof PUBLIC_HOMEPAGE_WATERMARK_POSITIONS)[number];

export interface PublicHomepageWatermarkSettings {
    enabled: boolean;
    opacity: number;
    size: number;
    position: PublicHomepageWatermarkPosition;
}

export const DEFAULT_PUBLIC_HOMEPAGE_WATERMARK: PublicHomepageWatermarkSettings = {
    enabled: true,
    opacity: 0.06,
    size: 460,
    position: "center",
};

export interface PublicHomepageHeaderSettings {
    backgroundColor: string;
    textColor: string;
    subTextColor: string;
    title: string;
    subtitle: string;
    logoEnabled: boolean;
}

export interface PublicHomepageFooterSettings {
    backgroundColor: string;
    textColor: string;
    title: string;
    address: string;
}

export const DEFAULT_PUBLIC_HOMEPAGE_HEADER: PublicHomepageHeaderSettings = {
    backgroundColor: "#1D4ED8",
    textColor: "#FFFFFF",
    subTextColor: "#DBEAFE",
    title: "DASHBOARD THỐNG KÊ SỬ DỤNG THUỐC",
    subtitle: "PHÒNG NGHIỆP VỤ DƯỢC-SỞ Y TẾ TP CẦN THƠ",
    logoEnabled: true,
};

export const DEFAULT_PUBLIC_HOMEPAGE_FOOTER: PublicHomepageFooterSettings = {
    backgroundColor: "#FFFFFF",
    textColor: "#334155",
    title: "PHÒNG NGHIỆP VỤ DƯỢC - SỞ Y TẾ THÀNH PHỐ CẦN THƠ",
    address: "Địa chỉ: 71 Lý Tự Trọng, Phường Ninh Kiều, Thành phố Cần Thơ",
};

interface SystemSettingRow {
    value: unknown;
    updatedAt: Date | string | null;
    updatedById: string | null;
}

export interface PublicHomepageSettings {
    backgroundColor: string;
    watermark: PublicHomepageWatermarkSettings;
    header: PublicHomepageHeaderSettings;
    footer: PublicHomepageFooterSettings;
    updatedAt: string | null;
    updatedById: string | null;
}

export function normalizeHexColor(value: unknown) {
    if (typeof value !== "string") {
        return null;
    }

    const color = value.trim();
    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
        return null;
    }

    return color.toUpperCase();
}

function toIsoString(value: Date | string | null | undefined) {
    if (!value) {
        return null;
    }

    if (value instanceof Date) {
        return value.toISOString();
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function isMissingTableError(error: unknown) {
    if (!error || typeof error !== "object") {
        return false;
    }

    const maybeError = error as {
        code?: string;
        meta?: { code?: string };
        message?: string;
    };

    return maybeError.code === "42P01"
        || maybeError.meta?.code === "42P01"
        || Boolean(maybeError.message?.includes("system_settings"));
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
    const numberValue = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(numberValue)) {
        return fallback;
    }

    return Math.min(max, Math.max(min, numberValue));
}

export function normalizeWatermarkPosition(value: unknown): PublicHomepageWatermarkPosition {
    return PUBLIC_HOMEPAGE_WATERMARK_POSITIONS.includes(value as PublicHomepageWatermarkPosition)
        ? value as PublicHomepageWatermarkPosition
        : DEFAULT_PUBLIC_HOMEPAGE_WATERMARK.position;
}

export function normalizePublicHomepageWatermark(value: unknown): PublicHomepageWatermarkSettings {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return DEFAULT_PUBLIC_HOMEPAGE_WATERMARK;
    }

    const raw = value as {
        enabled?: unknown;
        opacity?: unknown;
        size?: unknown;
        position?: unknown;
    };

    return {
        enabled: raw.enabled === true,
        opacity: clampNumber(raw.opacity, 0.02, 0.2, DEFAULT_PUBLIC_HOMEPAGE_WATERMARK.opacity),
        size: Math.round(clampNumber(raw.size, 160, 800, DEFAULT_PUBLIC_HOMEPAGE_WATERMARK.size)),
        position: normalizeWatermarkPosition(raw.position),
    };
}

function normalizeDisplayText(value: unknown, fallback: string) {
    if (typeof value !== "string") {
        return fallback;
    }

    const text = value.trim();
    return text || fallback;
}

export function normalizePublicHomepageHeader(value: unknown): PublicHomepageHeaderSettings {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return DEFAULT_PUBLIC_HOMEPAGE_HEADER;
    }

    const raw = value as {
        backgroundColor?: unknown;
        textColor?: unknown;
        subTextColor?: unknown;
        title?: unknown;
        subtitle?: unknown;
        logoEnabled?: unknown;
    };

    return {
        backgroundColor: normalizeHexColor(raw.backgroundColor) ?? DEFAULT_PUBLIC_HOMEPAGE_HEADER.backgroundColor,
        textColor: normalizeHexColor(raw.textColor) ?? DEFAULT_PUBLIC_HOMEPAGE_HEADER.textColor,
        subTextColor: normalizeHexColor(raw.subTextColor) ?? DEFAULT_PUBLIC_HOMEPAGE_HEADER.subTextColor,
        title: normalizeDisplayText(raw.title, DEFAULT_PUBLIC_HOMEPAGE_HEADER.title),
        subtitle: normalizeDisplayText(raw.subtitle, DEFAULT_PUBLIC_HOMEPAGE_HEADER.subtitle),
        logoEnabled: raw.logoEnabled !== false,
    };
}

export function normalizePublicHomepageFooter(value: unknown): PublicHomepageFooterSettings {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return DEFAULT_PUBLIC_HOMEPAGE_FOOTER;
    }

    const raw = value as {
        backgroundColor?: unknown;
        textColor?: unknown;
        title?: unknown;
        address?: unknown;
    };

    return {
        backgroundColor: normalizeHexColor(raw.backgroundColor) ?? DEFAULT_PUBLIC_HOMEPAGE_FOOTER.backgroundColor,
        textColor: normalizeHexColor(raw.textColor) ?? DEFAULT_PUBLIC_HOMEPAGE_FOOTER.textColor,
        title: normalizeDisplayText(raw.title, DEFAULT_PUBLIC_HOMEPAGE_FOOTER.title),
        address: normalizeDisplayText(raw.address, DEFAULT_PUBLIC_HOMEPAGE_FOOTER.address),
    };
}

function normalizeSettingsValue(value: unknown) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return {
            backgroundColor: DEFAULT_PUBLIC_HOMEPAGE_BACKGROUND_COLOR,
            watermark: DEFAULT_PUBLIC_HOMEPAGE_WATERMARK,
            header: DEFAULT_PUBLIC_HOMEPAGE_HEADER,
            footer: DEFAULT_PUBLIC_HOMEPAGE_FOOTER,
        };
    }

    const raw = value as {
        backgroundColor?: unknown;
        watermark?: unknown;
        header?: unknown;
        footer?: unknown;
    };
    return {
        backgroundColor: normalizeHexColor(raw.backgroundColor) ?? DEFAULT_PUBLIC_HOMEPAGE_BACKGROUND_COLOR,
        watermark: normalizePublicHomepageWatermark(raw.watermark),
        header: normalizePublicHomepageHeader(raw.header),
        footer: normalizePublicHomepageFooter(raw.footer),
    };
}

export async function getPublicHomepageSettings(): Promise<PublicHomepageSettings> {
    try {
        const rows = await prisma.$queryRaw<SystemSettingRow[]>`
            SELECT
                value,
                updated_at AS "updatedAt",
                updated_by_id AS "updatedById"
            FROM system_settings
            WHERE key = ${PUBLIC_HOMEPAGE_BACKGROUND_SETTING_KEY}
            LIMIT 1
        `;

        const row = rows[0];
        if (!row) {
            return {
                backgroundColor: DEFAULT_PUBLIC_HOMEPAGE_BACKGROUND_COLOR,
                watermark: DEFAULT_PUBLIC_HOMEPAGE_WATERMARK,
                header: DEFAULT_PUBLIC_HOMEPAGE_HEADER,
                footer: DEFAULT_PUBLIC_HOMEPAGE_FOOTER,
                updatedAt: null,
                updatedById: null,
            };
        }

        const settings = normalizeSettingsValue(row.value);
        return {
            backgroundColor: settings.backgroundColor,
            watermark: settings.watermark,
            header: settings.header,
            footer: settings.footer,
            updatedAt: toIsoString(row.updatedAt),
            updatedById: row.updatedById,
        };
    } catch (error) {
        if (isMissingTableError(error)) {
            return {
                backgroundColor: DEFAULT_PUBLIC_HOMEPAGE_BACKGROUND_COLOR,
                watermark: DEFAULT_PUBLIC_HOMEPAGE_WATERMARK,
                header: DEFAULT_PUBLIC_HOMEPAGE_HEADER,
                footer: DEFAULT_PUBLIC_HOMEPAGE_FOOTER,
                updatedAt: null,
                updatedById: null,
            };
        }

        throw error;
    }
}

export async function savePublicHomepageSettings(
    backgroundColor: string,
    watermark: PublicHomepageWatermarkSettings,
    header: PublicHomepageHeaderSettings,
    footer: PublicHomepageFooterSettings,
    updatedById: string
) {
    const normalizedColor = normalizeHexColor(backgroundColor);
    if (!normalizedColor) {
        throw new Error("Invalid public homepage background color");
    }

    const normalizedWatermark = normalizePublicHomepageWatermark(watermark);
    const normalizedHeader = normalizePublicHomepageHeader(header);
    const normalizedFooter = normalizePublicHomepageFooter(footer);
    const value = {
        backgroundColor: normalizedColor,
        watermark: normalizedWatermark,
        header: normalizedHeader,
        footer: normalizedFooter,
    };

    await prisma.$executeRaw`
        INSERT INTO system_settings (id, key, value, updated_by_id, created_at, updated_at)
        VALUES (
            ${randomUUID()},
            ${PUBLIC_HOMEPAGE_BACKGROUND_SETTING_KEY},
            CAST(${JSON.stringify(value)} AS jsonb),
            ${updatedById},
            NOW(),
            NOW()
        )
        ON CONFLICT (key) DO UPDATE
        SET
            value = EXCLUDED.value,
            updated_by_id = EXCLUDED.updated_by_id,
            updated_at = NOW()
    `;

    return {
        backgroundColor: normalizedColor,
        watermark: normalizedWatermark,
        header: normalizedHeader,
        footer: normalizedFooter,
        updatedAt: new Date().toISOString(),
        updatedById,
    } satisfies PublicHomepageSettings;
}
