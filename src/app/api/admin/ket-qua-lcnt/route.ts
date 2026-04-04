import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

// GET /api/admin/ket-qua-lcnt
// List all LCNT results from all facilities
export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const facilityId = searchParams.get("facilityId");

        // Build where clause for facility filter
        const where: any = {};
        if (facilityId) {
            where.goiThau = {
                keHoach: {
                    facilityId: facilityId,
                },
            };
        }

        const ketQuaList = await prisma.ketQuaLCNT.findMany({
            where,
            include: {
                goiThau: {
                    include: {
                        keHoach: {
                            include: {
                                facility: {
                                    select: {
                                        id: true,
                                        facilityName: true,
                                        username: true,
                                    },
                                },
                            },
                        },
                    },
                },
                thongBaoMoiThau: true,
                ketQuaPhanLos: {
                    include: {
                        phanLoGoiThau: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        // Transform data
        const results = ketQuaList.map((kq) => ({
            id: kq.id,
            facilityId: kq.goiThau.keHoach.facilityId,
            facilityName: kq.goiThau.keHoach.facility.facilityName || kq.goiThau.keHoach.facility.username,
            maKHLCNT: kq.goiThau.keHoach.maKHLCNT,
            tenKHLCNT: kq.goiThau.keHoach.tenKHLCNT,
            tenGoiThau: kq.goiThau.tenGoiThau,
            giaGoiThau: kq.goiThau.giaGoiThau,
            maTBMT: kq.thongBaoMoiThau.maTBMT,
            ngayDangTaiTBMT: kq.thongBaoMoiThau.ngayDangTai,
            soQdPheDuyetKQLCNT: kq.soQdPheDuyetKQLCNT,
            ngayPheDuyetKQLCNT: kq.ngayPheDuyetKQLCNT,
            soMatHangMoiThau: kq.soMatHangMoiThau,
            soMatHangTrungThau: kq.soMatHangTrungThau,
            tongGiaTriTrungThau: kq.tongGiaTriTrungThau,
            soPhanLo: kq.ketQuaPhanLos.length,
            createdAt: kq.createdAt,
        }));

        // Summary statistics
        const summary = {
            totalResults: results.length,
            totalFacilities: new Set(results.map((r) => r.facilityId)).size,
            totalMatHangTrungThau: results.reduce((acc, r) => acc + r.soMatHangTrungThau, 0),
            tongGiaTriTrungThau: results.reduce((acc, r) => acc + Number(r.tongGiaTriTrungThau), 0),
        };

        return NextResponse.json({ results, summary });
    } catch (error) {
        console.error("Error fetching admin ket qua LCNT:", error);
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        );
    }
}
