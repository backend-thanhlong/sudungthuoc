import { NextResponse } from "next/server";
import type { Prisma } from "@/../prisma/generated/client";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { RouteError } from "@/lib/server-authz";

const MASTER_DRUG_OPTIONAL_STRING_FIELDS = [
    "maBhyt",
    "hoatChat",
    "hamLuong",
    "dangBaoChe",
    "soDangKy",
    "quyCach",
    "donViTinh",
    "tieuChuan",
    "tuoiTho",
    "duongDung",
    "nguonGoc",
    "congTySanXuat",
    "nuocSanXuat",
    "diaChiSanXuat",
    "congTyDangKy",
    "nuocDangKy",
    "diaChiDangKy",
    "nhomThuoc",
    "isKeDon",
    "kiemSoatDacBiet",
    "isTrongNuoc",
] as const;

async function resolveTherapeuticGroupId(value: unknown) {
    if (typeof value !== "string" || !value.trim()) {
        return null;
    }

    const therapeuticGroup = await prisma.therapeuticGroup.findUnique({
        where: { id: value },
        select: { id: true },
    });

    if (!therapeuticGroup) {
        throw new RouteError(400, "Nhóm điều trị không hợp lệ");
    }

    return therapeuticGroup.id;
}

async function buildMasterDrugUpdateData(body: Record<string, unknown>) {
    const data: Prisma.MasterDrugUpdateInput = {};

    if ("maChung" in body) {
        const maChung = typeof body.maChung === "string" ? body.maChung.trim() : "";
        if (!maChung) {
            throw new RouteError(400, "Mã chung không được để trống");
        }
        data.maChung = maChung;
    }

    if ("tenThuoc" in body) {
        const tenThuoc = typeof body.tenThuoc === "string" ? body.tenThuoc.trim() : "";
        if (!tenThuoc) {
            throw new RouteError(400, "Tên thuốc không được để trống");
        }
        data.tenThuoc = tenThuoc;
    }

    for (const field of MASTER_DRUG_OPTIONAL_STRING_FIELDS) {
        if (!(field in body)) {
            continue;
        }

        const rawValue = body[field];
        data[field] = typeof rawValue === "string" && rawValue.trim() ? rawValue.trim() : null;
    }

    if ("therapeuticGroupId" in body) {
        const therapeuticGroupId = await resolveTherapeuticGroupId(body.therapeuticGroupId);
        data.therapeuticGroup = therapeuticGroupId
            ? { connect: { id: therapeuticGroupId } }
            : { disconnect: true };
    }

    if ("isActive" in body) {
        if (typeof body.isActive !== "boolean") {
            throw new RouteError(400, "Trạng thái hoạt động không hợp lệ");
        }
        data.isActive = body.isActive;
    }

    if (Object.keys(data).length === 0) {
        throw new RouteError(400, "Không có thay đổi hợp lệ");
    }

    return data;
}

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
        const data = await buildMasterDrugUpdateData(body);

        const drug = await prisma.masterDrug.update({
            where: { id },
            data,
        });

        return NextResponse.json(drug);
    } catch (error) {
        if (error instanceof RouteError) {
            return NextResponse.json({ message: error.message }, { status: error.status });
        }

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
