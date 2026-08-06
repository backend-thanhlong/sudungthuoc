import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity-log";
import {
    CHART_COLOR_REGISTRY,
    DEFAULT_CHART_COLOR_SETTINGS,
    validateChartColorSettings,
} from "@/lib/chart-colors";
import {
    getStoredChartColorSettings,
    saveStoredChartColorSettings,
} from "@/lib/chart-colors-server";
import { isRouteError, requireActiveSessionUser } from "@/lib/server-authz";

function badRequest(message: string, errors?: string[]) {
    return NextResponse.json({ message, errors }, { status: 400 });
}

export async function GET() {
    try {
        await requireActiveSessionUser("ADMIN");
        const stored = await getStoredChartColorSettings();

        return NextResponse.json({
            settings: stored.settings,
            defaults: DEFAULT_CHART_COLOR_SETTINGS,
            registry: CHART_COLOR_REGISTRY,
            updatedAt: stored.updatedAt,
            updatedById: stored.updatedById,
        });
    } catch (error) {
        if (isRouteError(error)) {
            return NextResponse.json({ message: error.message }, { status: error.status });
        }

        console.error("Error fetching admin chart colors:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const sessionContext = await requireActiveSessionUser("ADMIN");
        const body = await request.json().catch(() => null);
        const result = validateChartColorSettings(body?.settings ?? body, { strict: true });

        if (result.errors.length > 0) {
            return badRequest("Cấu hình màu biểu đồ không hợp lệ", result.errors);
        }

        await saveStoredChartColorSettings(result.settings, sessionContext.user.id);

        await logActivity({
            userId: sessionContext.user.id,
            action: "CHART_COLOR_SETTINGS_UPDATED",
            entityType: "chart_color_settings",
            details: {
                paletteCount: result.settings.palette.length,
                semanticKeys: Object.keys(result.settings.semantic),
                chartOverrideIds: Object.keys(result.settings.chartOverrides),
            },
        });

        return NextResponse.json({
            settings: result.settings,
            defaults: DEFAULT_CHART_COLOR_SETTINGS,
            registry: CHART_COLOR_REGISTRY,
            updatedAt: new Date().toISOString(),
            updatedById: sessionContext.user.id,
        });
    } catch (error) {
        if (isRouteError(error)) {
            return NextResponse.json({ message: error.message }, { status: error.status });
        }

        console.error("Error updating chart colors:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
