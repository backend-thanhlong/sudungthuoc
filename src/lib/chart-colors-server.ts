import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import {
    CHART_COLOR_SETTING_KEY,
    DEFAULT_CHART_COLOR_SETTINGS,
    mergeChartColorSettings,
    type ChartColorSettings,
} from "@/lib/chart-colors";

interface SystemSettingRow {
    value: unknown;
    updatedAt: Date | string | null;
    updatedById: string | null;
}

export interface StoredChartColorSettings {
    settings: ChartColorSettings;
    updatedAt: string | null;
    updatedById: string | null;
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

export async function getStoredChartColorSettings(): Promise<StoredChartColorSettings> {
    try {
        const rows = await prisma.$queryRaw<SystemSettingRow[]>`
            SELECT
                value,
                updated_at AS "updatedAt",
                updated_by_id AS "updatedById"
            FROM system_settings
            WHERE key = ${CHART_COLOR_SETTING_KEY}
            LIMIT 1
        `;

        const row = rows[0];
        if (!row) {
            return {
                settings: DEFAULT_CHART_COLOR_SETTINGS,
                updatedAt: null,
                updatedById: null,
            };
        }

        return {
            settings: mergeChartColorSettings(row.value),
            updatedAt: toIsoString(row.updatedAt),
            updatedById: row.updatedById,
        };
    } catch (error) {
        if (isMissingTableError(error)) {
            return {
                settings: DEFAULT_CHART_COLOR_SETTINGS,
                updatedAt: null,
                updatedById: null,
            };
        }

        throw error;
    }
}

export async function saveStoredChartColorSettings(settings: ChartColorSettings, updatedById: string) {
    await prisma.$executeRaw`
        INSERT INTO system_settings (id, key, value, updated_by_id, created_at, updated_at)
        VALUES (
            ${randomUUID()},
            ${CHART_COLOR_SETTING_KEY},
            CAST(${JSON.stringify(settings)} AS jsonb),
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
}
