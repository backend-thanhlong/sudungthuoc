import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity-log";
import {
    DEFAULT_PUBLIC_HOMEPAGE_BACKGROUND_COLOR,
    DEFAULT_PUBLIC_HOMEPAGE_FOOTER,
    DEFAULT_PUBLIC_HOMEPAGE_HEADER,
    DEFAULT_PUBLIC_HOMEPAGE_WATERMARK,
    getPublicHomepageSettings,
    normalizeHexColor,
    normalizePublicHomepageFooter,
    normalizePublicHomepageHeader,
    normalizePublicHomepageWatermark,
    savePublicHomepageSettings,
} from "@/lib/public-homepage-settings";
import { isRouteError, requireActiveSessionUser } from "@/lib/server-authz";

function parseBody(body: unknown) {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return null;
    }

    const raw = body as {
        backgroundColor?: unknown;
        watermark?: unknown;
        header?: unknown;
        footer?: unknown;
    };
    const backgroundColor = normalizeHexColor(raw.backgroundColor);
    if (!backgroundColor) {
        return null;
    }

    return {
        backgroundColor,
        watermark: normalizePublicHomepageWatermark(raw.watermark),
        header: normalizePublicHomepageHeader(raw.header),
        footer: normalizePublicHomepageFooter(raw.footer),
    };
}

export async function GET() {
    try {
        await requireActiveSessionUser("ADMIN");
        const settings = await getPublicHomepageSettings();

        return NextResponse.json({
            settings: {
                backgroundColor: settings.backgroundColor,
                watermark: settings.watermark,
                header: settings.header,
                footer: settings.footer,
            },
            defaults: {
                backgroundColor: DEFAULT_PUBLIC_HOMEPAGE_BACKGROUND_COLOR,
                watermark: DEFAULT_PUBLIC_HOMEPAGE_WATERMARK,
                header: DEFAULT_PUBLIC_HOMEPAGE_HEADER,
                footer: DEFAULT_PUBLIC_HOMEPAGE_FOOTER,
            },
            updatedAt: settings.updatedAt,
            updatedById: settings.updatedById,
        });
    } catch (error) {
        if (isRouteError(error)) {
            return NextResponse.json({ message: error.message }, { status: error.status });
        }

        console.error("Error fetching public homepage settings:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const sessionContext = await requireActiveSessionUser("ADMIN");
        const body = await request.json().catch(() => null);
        const parsedBody = parseBody(body);

        if (!parsedBody) {
            return NextResponse.json({ message: "Mã màu nền Trang chủ không hợp lệ" }, { status: 400 });
        }

        const settings = await savePublicHomepageSettings(
            parsedBody.backgroundColor,
            parsedBody.watermark,
            parsedBody.header,
            parsedBody.footer,
            sessionContext.user.id
        );

        await logActivity({
            userId: sessionContext.user.id,
            action: "PUBLIC_HOMEPAGE_SETTINGS_UPDATED",
            entityType: "system_setting",
            details: {
                backgroundColor: settings.backgroundColor,
                watermark: settings.watermark,
                header: settings.header,
                footer: settings.footer,
            },
        });

        return NextResponse.json({
            settings: {
                backgroundColor: settings.backgroundColor,
                watermark: settings.watermark,
                header: settings.header,
                footer: settings.footer,
            },
            defaults: {
                backgroundColor: DEFAULT_PUBLIC_HOMEPAGE_BACKGROUND_COLOR,
                watermark: DEFAULT_PUBLIC_HOMEPAGE_WATERMARK,
                header: DEFAULT_PUBLIC_HOMEPAGE_HEADER,
                footer: DEFAULT_PUBLIC_HOMEPAGE_FOOTER,
            },
            updatedAt: settings.updatedAt,
            updatedById: settings.updatedById,
        });
    } catch (error) {
        if (isRouteError(error)) {
            return NextResponse.json({ message: error.message }, { status: error.status });
        }

        console.error("Error updating public homepage settings:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
