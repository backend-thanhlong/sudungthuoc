import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

// GET - List all TBMT from all facilities (admin only)
export async function GET() {
    try {
        const session = await auth();
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const tbmtRecords = await prisma.thongBaoMoiThau.findMany({
            select: {
                id: true,
                maTBMT: true,
                ngayDangTai: true,
                soQdPheDuyetHSMT: true,
                ngayPheDuyetHSMT: true,
                ngayDongThau: true,
                createdAt: true,
                goiThau: {
                    select: {
                        id: true,
                        tenGoiThau: true,
                        giaGoiThau: true,
                        soLuongPhanLo: true,
                        keHoach: {
                            select: {
                                id: true,
                                maKHLCNT: true,
                                tenKHLCNT: true,
                                facility: {
                                    select: {
                                        id: true,
                                        facilityName: true,
                                        facilityCode: true,
                                    }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(tbmtRecords);
    } catch (error) {
        console.error("Error fetching TBMT data:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
