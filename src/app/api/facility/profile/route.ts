import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isRouteError, requireActiveSessionUser } from "@/lib/server-authz";

const FACILITY_PROFILE_SELECT = {
    id: true,
    username: true,
    facilityName: true,
    facilityCode: true,
    autonomyGroup: true,
    facilityType: true,
    contactPerson: true,
    phoneNumber: true,
    address: true,
    latitude: true,
    longitude: true,
} as const;

const TEXT_FIELDS = [
    "facilityName",
    "autonomyGroup",
    "facilityType",
    "contactPerson",
    "phoneNumber",
    "address",
] as const;

function parseCoordinate(value: unknown, min: number, max: number, label: string) {
    if (value === null || value === undefined || value === "") {
        return { value: null as number | null };
    }

    const parsed = typeof value === "number"
        ? value
        : Number(String(value).trim().replace(",", "."));

    if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
        return { value: null, error: `${label} không hợp lệ` };
    }

    return { value: parsed };
}

function normalizeNullableText(value: unknown) {
    if (value === null || value === undefined) {
        return null;
    }

    const normalized = String(value).trim();
    return normalized === "" ? null : normalized;
}

export async function GET() {
    try {
        const { user } = await requireActiveSessionUser("FACILITY");
        const profile = await prisma.user.findUnique({
            where: { id: user.id },
            select: FACILITY_PROFILE_SELECT,
        });

        if (!profile) {
            return NextResponse.json({ message: "Không tìm thấy cơ sở" }, { status: 404 });
        }

        return NextResponse.json(profile);
    } catch (error) {
        if (isRouteError(error)) {
            return NextResponse.json({ message: error.message }, { status: error.status });
        }

        console.error("Error fetching facility profile:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const { user } = await requireActiveSessionUser("FACILITY");
        const parsedBody = await request.json().catch(() => ({}));
        const body = (parsedBody && typeof parsedBody === "object" ? parsedBody : {}) as Record<string, unknown>;
        const data: Record<string, unknown> = {};

        TEXT_FIELDS.forEach((field) => {
            if (field in body) {
                data[field] = normalizeNullableText(body[field]);
            }
        });

        if ("latitude" in body) {
            const parsedLatitude = parseCoordinate(body.latitude, -90, 90, "Vĩ độ");
            if (parsedLatitude.error) {
                return NextResponse.json({ message: parsedLatitude.error }, { status: 400 });
            }
            data.latitude = parsedLatitude.value;
        }

        if ("longitude" in body) {
            const parsedLongitude = parseCoordinate(body.longitude, -180, 180, "Kinh độ");
            if (parsedLongitude.error) {
                return NextResponse.json({ message: parsedLongitude.error }, { status: 400 });
            }
            data.longitude = parsedLongitude.value;
        }

        const profile = await prisma.user.update({
            where: { id: user.id },
            data,
            select: FACILITY_PROFILE_SELECT,
        });

        return NextResponse.json(profile);
    } catch (error) {
        if (isRouteError(error)) {
            return NextResponse.json({ message: error.message }, { status: error.status });
        }

        console.error("Error updating facility profile:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
