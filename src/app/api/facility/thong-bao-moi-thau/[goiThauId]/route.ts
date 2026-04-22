import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
    getFacilityOwnedGoiThau,
    isRouteError,
    requireActiveSessionUser,
} from "@/lib/server-authz";

const handleRouteError = (error: unknown, context: string) => {
    if (isRouteError(error)) {
        return NextResponse.json({ message: error.message }, { status: error.status });
    }

    console.error(context, error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
};

// GET - Get TBMT for a specific goi thau
export async function GET(
    request: Request,
    { params }: { params: Promise<{ goiThauId: string }> }
) {
    try {
        void request;
        const { user } = await requireActiveSessionUser("FACILITY");

        const { goiThauId } = await params;
        await getFacilityOwnedGoiThau(goiThauId, user.id);

        const tbmt = await prisma.thongBaoMoiThau.findFirst({
            where: { goiThauId },
        });

        return NextResponse.json(tbmt);
    } catch (error: unknown) {
        return handleRouteError(error, "Error fetching TBMT:");
    }
}

// POST - Create new TBMT
export async function POST(
    request: Request,
    { params }: { params: Promise<{ goiThauId: string }> }
) {
    try {
        const { user } = await requireActiveSessionUser("FACILITY");

        const { goiThauId } = await params;
        const body = await request.json();
        await getFacilityOwnedGoiThau(goiThauId, user.id);

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
    } catch (error: unknown) {
        return handleRouteError(error, "Error creating TBMT:");
    }
}

// PATCH - Update existing TBMT
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ goiThauId: string }> }
) {
    try {
        const { user } = await requireActiveSessionUser("FACILITY");

        const { goiThauId } = await params;
        const body = await request.json();
        await getFacilityOwnedGoiThau(goiThauId, user.id);

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
    } catch (error: unknown) {
        return handleRouteError(error, "Error updating TBMT:");
    }
}
