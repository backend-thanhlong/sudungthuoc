import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

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

// PATCH update user
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const data: Record<string, unknown> = {};

        const textFields = [
            "facilityName",
            "facilityCode",
            "autonomyGroup",
            "facilityType",
            "contactPerson",
            "phoneNumber",
            "address",
        ] as const;

        textFields.forEach((field) => {
            if (field in body) {
                data[field] = body[field] === "" ? null : body[field];
            }
        });

        if ("isActive" in body) {
            data.isActive = Boolean(body.isActive);
        }

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

        const user = await prisma.user.update({
            where: { id },
            data,
            select: {
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
                role: true,
                isActive: true,
            },
        });

        return NextResponse.json(user);
    } catch (error) {
        console.error("Error updating user:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

// DELETE user
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        await prisma.user.delete({ where: { id } });

        return NextResponse.json({ message: "User deleted" });
    } catch (error) {
        console.error("Error deleting user:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
