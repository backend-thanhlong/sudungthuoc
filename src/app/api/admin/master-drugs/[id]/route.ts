import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

// PATCH update drug
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();

        const drug = await prisma.masterDrug.update({
            where: { id },
            data: body,
        });

        return NextResponse.json(drug);
    } catch (error) {
        console.error("Error updating drug:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

// DELETE drug
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        // Kiểm tra xem thuốc có đang được ánh xạ bởi cơ sở nào không
        const mappingCount = await prisma.facilityDrugMap.count({
            where: { masterDrugId: id },
        });

        if (mappingCount > 0) {
            return NextResponse.json(
                {
                    message: `Không thể xóa thuốc này vì đang được ánh xạ bởi ${mappingCount} cơ sở. Hãy gỡ ánh xạ trước khi xóa.`,
                },
                { status: 409 }
            );
        }

        await prisma.masterDrug.delete({ where: { id } });

        return NextResponse.json({ message: "Drug deleted" });
    } catch (error) {
        console.error("Error deleting drug:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
