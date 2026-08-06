import { NextResponse } from "next/server";
import { ACTIONS, ENTITY_TYPES, logActivity } from "@/lib/activity-log";
import { isRouteError, requireActiveSessionUser } from "@/lib/server-authz";
import {
    DEFAULT_MAINTENANCE_MESSAGE,
    getSystemMaintenanceState,
    saveSystemMaintenanceState,
} from "@/lib/system-maintenance";

function parseMaintenanceBody(body: unknown) {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return null;
    }

    const raw = body as { enabled?: unknown; message?: unknown };
    if (typeof raw.enabled !== "boolean") {
        return null;
    }

    const message = typeof raw.message === "string" && raw.message.trim()
        ? raw.message.trim()
        : DEFAULT_MAINTENANCE_MESSAGE;

    return {
        enabled: raw.enabled,
        message,
    };
}

export async function GET() {
    try {
        await requireActiveSessionUser("ADMIN");
        const maintenance = await getSystemMaintenanceState();

        return NextResponse.json({ maintenance });
    } catch (error) {
        if (isRouteError(error)) {
            return NextResponse.json({ message: error.message }, { status: error.status });
        }

        console.error("Error fetching system maintenance:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const sessionContext = await requireActiveSessionUser("ADMIN");
        const body = await request.json().catch(() => null);
        const parsed = parseMaintenanceBody(body);

        if (!parsed) {
            return NextResponse.json({ message: "Dữ liệu cấu hình bảo trì không hợp lệ" }, { status: 400 });
        }

        const maintenance = await saveSystemMaintenanceState(parsed, sessionContext.user.id);

        await logActivity({
            userId: sessionContext.user.id,
            action: parsed.enabled ? ACTIONS.SYSTEM_MAINTENANCE_ENABLED : ACTIONS.SYSTEM_MAINTENANCE_DISABLED,
            entityType: ENTITY_TYPES.SYSTEM_MAINTENANCE,
            details: {
                enabled: parsed.enabled,
                message: parsed.message,
            },
        });

        return NextResponse.json({ maintenance });
    } catch (error) {
        if (isRouteError(error)) {
            return NextResponse.json({ message: error.message }, { status: error.status });
        }

        console.error("Error updating system maintenance:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
