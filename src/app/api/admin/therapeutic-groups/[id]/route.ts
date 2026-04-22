import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
    renameTherapeuticGroup,
    serializeTherapeuticGroup,
    THERAPEUTIC_GROUP_SELECT,
} from "@/lib/therapeutic-groups";
import {
    isRouteError,
    RouteError,
    requireActiveSessionUser,
} from "@/lib/server-authz";

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await requireActiveSessionUser("ADMIN");

        const { id } = await params;
        const body = await request.json();
        const hasName = typeof body.name === "string";
        const hasIsActive = typeof body.isActive === "boolean";

        if (!hasName && !hasIsActive) {
            throw new RouteError(400, "Không có thay đổi hợp lệ");
        }

        const existing = await prisma.therapeuticGroup.findUnique({
            where: { id },
            select: { id: true },
        });
        if (!existing) {
            throw new RouteError(404, "Nhóm điều trị không tồn tại");
        }

        let updated;

        if (hasName) {
            await renameTherapeuticGroup(id, body.name);
        }

        if (hasIsActive) {
            updated = await prisma.therapeuticGroup.update({
                where: { id },
                data: { isActive: body.isActive },
                select: THERAPEUTIC_GROUP_SELECT,
            });
        } else {
            updated = await prisma.therapeuticGroup.findUnique({
                where: { id },
                select: THERAPEUTIC_GROUP_SELECT,
            });
        }

        if (!updated) {
            throw new RouteError(404, "Nhóm điều trị không tồn tại");
        }

        return NextResponse.json({
            data: serializeTherapeuticGroup(updated),
        });
    } catch (error) {
        if (isRouteError(error)) {
            return NextResponse.json({ message: error.message }, { status: error.status });
        }

        console.error("Error updating therapeutic group:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await requireActiveSessionUser("ADMIN");

        const { id } = await params;
        const group = await prisma.therapeuticGroup.findUnique({
            where: { id },
            select: {
                id: true,
                _count: {
                    select: {
                        masterDrugs: true,
                    },
                },
            },
        });

        if (!group) {
            throw new RouteError(404, "Nhóm điều trị không tồn tại");
        }

        if (group._count.masterDrugs > 0) {
            throw new RouteError(409, "Không thể xóa nhóm điều trị đang được thuốc sử dụng");
        }

        await prisma.therapeuticGroup.delete({
            where: { id },
        });

        return NextResponse.json({ message: "Deleted" });
    } catch (error) {
        if (isRouteError(error)) {
            return NextResponse.json({ message: error.message }, { status: error.status });
        }

        console.error("Error deleting therapeutic group:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
