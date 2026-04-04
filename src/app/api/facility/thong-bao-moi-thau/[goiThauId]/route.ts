import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

// GET - Get TBMT for a specific goi thau
export async function GET(
    request: Request,
    { params }: { params: Promise<{ goiThauId: string }> }
) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { goiThauId } = await params;

        const tbmt = await prisma.thongBaoMoiThau.findFirst({
            where: { goiThauId },
        });

        return NextResponse.json(tbmt);
    } catch (error) {
        console.error("Error fetching TBMT:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

// POST - Create new TBMT
export async function POST(
    request: Request,
    { params }: { params: Promise<{ goiThauId: string }> }
) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { goiThauId } = await params;
        const body = await request.json();

        const tbmt = await prisma.thongBaoMoiThau.create({
            data: {
                goiThauId,
                maTBMT: body.maTBMT,
                ngayDangTai: new Date(body.ngayDangTai),
                soQdPheDuyetHSMT: body.soQdPheDuyetHSMT,
                ngayPheDuyetHSMT: new Date(body.ngayPheDuyetHSMT),
                ngayDongThau: new Date(body.ngayDongThau),
            },
        });

        return NextResponse.json(tbmt, { status: 201 });
    } catch (error: any) {
        console.error("Error creating TBMT:", error);
        return NextResponse.json(
            { message: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}

// PATCH - Update existing TBMT
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ goiThauId: string }> }
) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { goiThauId } = await params;
        const body = await request.json();

        // Find the existing TBMT
        const existing = await prisma.thongBaoMoiThau.findFirst({
            where: { goiThauId },
        });

        if (!existing) {
            return NextResponse.json({ message: "TBMT not found" }, { status: 404 });
        }

        const tbmt = await prisma.thongBaoMoiThau.update({
            where: { id: existing.id },
            data: {
                maTBMT: body.maTBMT,
                ngayDangTai: new Date(body.ngayDangTai),
                soQdPheDuyetHSMT: body.soQdPheDuyetHSMT,
                ngayPheDuyetHSMT: new Date(body.ngayPheDuyetHSMT),
                ngayDongThau: new Date(body.ngayDongThau),
            },
        });

        return NextResponse.json(tbmt);
    } catch (error: any) {
        console.error("Error updating TBMT:", error);
        return NextResponse.json(
            { message: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
