import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

// GET /api/facility/ket-qua-lcnt/[tbmtId]
// Get existing LCNT results for a specific TBMT
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ tbmtId: string }> }
) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        if (session.user.role !== "FACILITY") {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        const { tbmtId } = await params;

        // Find LCNT results by TBMT ID
        const ketQuaLCNT = await prisma.ketQuaLCNT.findFirst({
            where: {
                thongBaoMoiThauId: tbmtId,
            },
            include: {
                ketQuaPhanLos: {
                    include: {
                        phanLoGoiThau: true,
                    },
                },
                thongBaoMoiThau: true,
                goiThau: {
                    include: {
                        phanLos: true,
                    },
                },
            },
        });

        // If no results exist yet, fetch TBMT to get goiThauId
        if (!ketQuaLCNT) {
            const tbmt = await prisma.thongBaoMoiThau.findUnique({
                where: { id: tbmtId },
                include: {
                    goiThau: true,
                },
            });

            if (!tbmt) {
                return NextResponse.json(
                    { message: "TBMT not found" },
                    { status: 404 }
                );
            }

            // Return just the TBMT and goiThau info
            return NextResponse.json({
                goiThauId: tbmt.goiThauId,
                thongBaoMoiThau: tbmt,
                goiThau: tbmt.goiThau,
            });
        }

        return NextResponse.json(ketQuaLCNT);
    } catch (error) {
        console.error("Error fetching ket qua LCNT detail:", error);
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        );
    }
}

// PATCH /api/facility/ket-qua-lcnt/[tbmtId]
// Update existing LCNT results
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ tbmtId: string }> }
) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        if (session.user.role !== "FACILITY") {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        const { tbmtId } = await params;
        const body = await req.json();
        const {
            soQdPheDuyetKQLCNT,
            ngayPheDuyetKQLCNT,
            soMatHangMoiThau,
            soMatHangTrungThau,
            tongGiaTriTrungThau,
            ketQuaPhanLos,
        } = body;

        // Find existing LCNT result
        const existing = await prisma.ketQuaLCNT.findFirst({
            where: {
                thongBaoMoiThauId: tbmtId,
            },
        });

        if (!existing) {
            return NextResponse.json(
                { message: "LCNT result not found" },
                { status: 404 }
            );
        }

        // Helper to safely parse numbers - returns undefined (not null) for PATCH so Prisma skips non-nullable fields
        const safeInt = (val: any): number | undefined => { const n = parseInt(val); return isNaN(n) ? undefined : n; };
        const safeFloat = (val: any): number | undefined => { const n = parseFloat(val); return isNaN(n) ? undefined : n; };

        // Filter out lot results with missing phanLoGoiThauId
        const validKetQuaPhanLos = (ketQuaPhanLos || []).filter((kqpl: any) => kqpl.phanLoGoiThauId);

        // Update in a transaction
        const result = await prisma.$transaction(async (tx) => {
            // Delete existing lot results
            await tx.ketQuaPhanLo.deleteMany({
                where: {
                    ketQuaLCNTId: existing.id,
                },
            });

            // Update main result and create new lot results
            return await tx.ketQuaLCNT.update({
                where: {
                    id: existing.id,
                },
                data: {
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
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error("Error updating ket qua LCNT:", error);
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        );
    }
}
