import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

// GET /api/facility/ket-qua-lcnt
// List all Process 1 KHLCNT plans with TBMT information
export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        if (session.user.role !== "FACILITY") {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        const keHoachList = await prisma.keHoachLCNT.findMany({
            where: {
                facilityId: session.user.id,
                quyTrinh: 1, // Only Process 1 (Bidding Law)
            },
            include: {
                goiThaus: {
                    include: {
                        thongBaoMoiThaus: {
                            include: {
                                // Include existing results so frontend can determine if a TBMT already has results
                                ketQuaLCNTs: { select: { id: true } }
                            }
                        },
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        // Flatten to show each TBMT as a separate row
        const result = keHoachList.flatMap((kh) =>
            kh.goiThaus.flatMap((gt) =>
                gt.thongBaoMoiThaus.map((tbmt) => ({
                    id: kh.id,
                    maKHLCNT: kh.maKHLCNT,
                    tenKHLCNT: kh.tenKHLCNT,
                    goiThauId: gt.id,
                    tenGoiThau: gt.tenGoiThau,
                    tbmtId: tbmt.id,
                    maTBMT: tbmt.maTBMT,
                    ngayDangTaiTBMT: tbmt.ngayDangTai,
                }))
            )
        );

        return NextResponse.json(result);
    } catch (error) {
        console.error("Error fetching ket qua LCNT list:", error);
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        );
    }
}

// POST /api/facility/ket-qua-lcnt
// Create new LCNT results
export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        if (session.user.role !== "FACILITY") {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const {
            goiThauId,
            thongBaoMoiThauId,
            soQdPheDuyetKQLCNT,
            ngayPheDuyetKQLCNT,
            soMatHangMoiThau,
            soMatHangTrungThau,
            tongGiaTriTrungThau,
            ketQuaPhanLos,
        } = body;

        // Log received data for debugging
        console.log("Received LCNT result data:", {
            goiThauId,
            thongBaoMoiThauId,
            soQdPheDuyetKQLCNT,
            ngayPheDuyetKQLCNT,
            hasKetQuaPhanLos: Array.isArray(ketQuaPhanLos),
            ketQuaPhanLosCount: ketQuaPhanLos?.length || 0,
        });

        // Validate required fields
        const missingFields = [];
        if (!goiThauId) missingFields.push("goiThauId");
        if (!thongBaoMoiThauId) missingFields.push("thongBaoMoiThauId");
        if (!soQdPheDuyetKQLCNT) missingFields.push("soQdPheDuyetKQLCNT");
        if (!ngayPheDuyetKQLCNT) missingFields.push("ngayPheDuyetKQLCNT");

        if (missingFields.length > 0) {
            console.error("Missing required fields:", missingFields);
            return NextResponse.json(
                { message: `Missing required fields: ${missingFields.join(", ")}` },
                { status: 400 }
            );
        }

        // Helper to safely parse numbers - fallback to 0 for required non-nullable fields in create
        const safeInt = (val: any): number => { const n = parseInt(val); return isNaN(n) ? 0 : n; };
        const safeFloat = (val: any): number => { const n = parseFloat(val); return isNaN(n) ? 0 : n; };

        // Filter out lot results with missing phanLoGoiThauId
        const validKetQuaPhanLos = (ketQuaPhanLos || []).filter((kqpl: any) => kqpl.phanLoGoiThauId);

        // Create KetQuaLCNT with related KetQuaPhanLo
        const result = await prisma.ketQuaLCNT.create({
            data: {
                goiThauId,
                thongBaoMoiThauId,
                soQdPheDuyetKQLCNT,
                ngayPheDuyetKQLCNT: new Date(ngayPheDuyetKQLCNT),
                soMatHangMoiThau: safeInt(soMatHangMoiThau),
                soMatHangTrungThau: safeInt(soMatHangTrungThau),
                tongGiaTriTrungThau: safeFloat(tongGiaTriTrungThau),
                ketQuaPhanLos: {
                    create: validKetQuaPhanLos.map((kqpl: any) => ({
                        phanLoGoiThauId: kqpl.phanLoGoiThauId,
                        ketQua: kqpl.ketQua,
                        donGiaTrungThau: kqpl.donGiaTrungThau
                            ? parseFloat(kqpl.donGiaTrungThau)
                            : null,
                        nhaThauTrungThau: kqpl.nhaThauTrungThau || null,
                    })),
                },
            },
            include: {
                ketQuaPhanLos: true,
            },
        });

        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        console.error("Error creating ket qua LCNT:", error);
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        );
    }
}
