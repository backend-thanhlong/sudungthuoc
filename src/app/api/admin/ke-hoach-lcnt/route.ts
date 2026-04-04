import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

// GET - list ALL KHLCNT for admin (across all facilities)
export async function GET() {
    try {
        const session = await auth();
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const keHoachs = await prisma.keHoachLCNT.findMany({
            include: {
                facility: {
                    select: {
                        id: true,
                        facilityName: true,
                        facilityCode: true,
                    },
                },
                goiThaus: {
                    include: { phanLos: { orderBy: { stt: "asc" } } },
                    orderBy: { createdAt: "asc" },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(keHoachs);
    } catch (error: any) {
        console.error("Error fetching all KHLCNT:", error);
        return NextResponse.json(
            { message: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
