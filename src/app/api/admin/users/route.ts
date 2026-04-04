import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

// GET all facility users
export async function GET() {
    try {
        const session = await auth();
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const users = await prisma.user.findMany({
            where: { role: "FACILITY" },
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
                createdAt: true,
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(users);
    } catch (error) {
        console.error("Error fetching users:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

// POST create new facility user
export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const {
            username,
            password,
            facilityName,
            facilityCode,
            autonomyGroup,
            facilityType,
            contactPerson,
            phoneNumber,
            address
        } = body;

        if (!username || !password || !facilityName || !facilityCode) {
            return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
        }

        // Check if username already exists
        const existingUser = await prisma.user.findUnique({ where: { username } });
        if (existingUser) {
            return NextResponse.json({ message: "Tên đăng nhập đã tồn tại" }, { status: 400 });
        }

        // Check if facility code already exists
        const existingFacility = await prisma.user.findUnique({ where: { facilityCode } });
        if (existingFacility) {
            return NextResponse.json({ message: "Mã cơ sở đã tồn tại" }, { status: 400 });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                username,
                passwordHash,
                facilityName,
                facilityCode,
                autonomyGroup,
                facilityType,
                contactPerson,
                phoneNumber,
                address,
                role: "FACILITY",
            },
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
                createdAt: true,
            },
        });

        return NextResponse.json(user, { status: 201 });
    } catch (error) {
        console.error("Error creating user:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
