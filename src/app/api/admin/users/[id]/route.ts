import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

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

        const user = await prisma.user.update({
            where: { id },
            data: body,
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
