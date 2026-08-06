import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

// GET - List all TBMT for current facility (filter quyTrinh=1)
export async function GET() {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const keHoachs = await prisma.keHoachLCNT.findMany({
            where: {
                facilityId: session.user.id,
                quyTrinh: 1 // Only Process 1
            },
            select: {
                id: true,
                maKHLCNT: true,
                tenKHLCNT: true,
                goiThaus: {
                    select: {
                        id: true,
                        tenGoiThau: true,
                        giaGoiThau: true,
                        soLuongPhanLo: true,
                        yeuCauTBMT: true,
                        thongBaoMoiThaus: true,
                    }
                }
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(keHoachs);
    } catch (error) {
        console.error("Error fetching TBMT data:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
