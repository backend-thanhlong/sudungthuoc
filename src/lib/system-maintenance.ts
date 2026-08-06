import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";

export const SYSTEM_MAINTENANCE_SETTING_KEY = "system_maintenance";
export const DEFAULT_MAINTENANCE_MESSAGE = "Hệ thống đang bảo trì. Vui lòng mở lại sau";

interface SystemSettingRow {
    value: unknown;
    updatedAt: Date | string | null;
    updatedById: string | null;
}

export interface SystemMaintenanceState {
    enabled: boolean;
    message: string;
    updatedAt: string | null;
    updatedById: string | null;
}

function toIsoString(value: Date | string | null | undefined) {
    if (!value) return null;
    if (value instanceof Date) return value.toISOString();

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function isMissingTableError(error: unknown) {
    if (!error || typeof error !== "object") return false;

    const maybeError = error as {
        code?: string;
        meta?: { code?: string };
        message?: string;
    };

    return maybeError.code === "42P01"
        || maybeError.meta?.code === "42P01"
        || Boolean(maybeError.message?.includes("system_settings"));
}

function normalizeMaintenanceValue(value: unknown): Pick<SystemMaintenanceState, "enabled" | "message"> {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return {
            enabled: false,
            message: DEFAULT_MAINTENANCE_MESSAGE,
        };
    }

    const raw = value as { enabled?: unknown; message?: unknown };
    const message = typeof raw.message === "string" && raw.message.trim()
        ? raw.message.trim()
        : DEFAULT_MAINTENANCE_MESSAGE;

    return {
        enabled: raw.enabled === true,
        message,
    };
}

export async function getSystemMaintenanceState(): Promise<SystemMaintenanceState> {
    try {
        const rows = await prisma.$queryRaw<SystemSettingRow[]>`
            SELECT
                value,
                updated_at AS "updatedAt",
                updated_by_id AS "updatedById"
            FROM system_settings
            WHERE key = ${SYSTEM_MAINTENANCE_SETTING_KEY}
            LIMIT 1
        `;

        const row = rows[0];
        if (!row) {
            return {
                enabled: false,
                message: DEFAULT_MAINTENANCE_MESSAGE,
                updatedAt: null,
                updatedById: null,
            };
        }

        return {
            ...normalizeMaintenanceValue(row.value),
            updatedAt: toIsoString(row.updatedAt),
            updatedById: row.updatedById,
        };
    } catch (error) {
        if (isMissingTableError(error)) {
            return {
                enabled: false,
                message: DEFAULT_MAINTENANCE_MESSAGE,
                updatedAt: null,
                updatedById: null,
            };
        }

        throw error;
    }
}

export async function saveSystemMaintenanceState(
    input: Pick<SystemMaintenanceState, "enabled" | "message">,
    updatedById: string
) {
    const value = {
        enabled: Boolean(input.enabled),
        message: input.message.trim() || DEFAULT_MAINTENANCE_MESSAGE,
    };

    await prisma.$executeRaw`
        INSERT INTO system_settings (id, key, value, updated_by_id, created_at, updated_at)
        VALUES (
            ${randomUUID()},
            ${SYSTEM_MAINTENANCE_SETTING_KEY},
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
        ...value,
        updatedAt: new Date().toISOString(),
        updatedById,
    } satisfies SystemMaintenanceState;
}
