import { NextResponse } from "next/server";
import type { Prisma } from "@/../prisma/generated/client";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

// GET all master drugs with pagination and search
export async function GET(request: Request) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const search = searchParams.get("search") || "";
        const searchField = searchParams.get("searchField") || "ALL";

        const skip = (page - 1) * limit;

        const where: Prisma.MasterDrugWhereInput = {};
        const searchableFields = ["tenThuoc", "soDangKy", "hoatChat", "maChung", "maBhyt"] as const;
        if (search) {
            if (searchField === "ALL") {
                // Search across all fields
                where.OR = [
                    { tenThuoc: { contains: search, mode: "insensitive" } },
                    { maChung: { contains: search, mode: "insensitive" } },
                    { hoatChat: { contains: search, mode: "insensitive" } },
                    { soDangKy: { contains: search, mode: "insensitive" } },
                    { maBhyt: { contains: search, mode: "insensitive" } },
                ];
            } else if (searchableFields.includes(searchField as (typeof searchableFields)[number])) {
                // Search in specific field
                const field = searchField as (typeof searchableFields)[number];
                where[field] = { contains: search, mode: "insensitive" };
            }
        }

        const [drugs, total] = await Promise.all([
            prisma.masterDrug.findMany({
                where,
                orderBy: { tenThuoc: "asc" },
                skip,
                take: limit,
            }),
            prisma.masterDrug.count({ where }),
        ]);

        return NextResponse.json({
            data: drugs,
            metadata: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Error fetching drugs:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

// POST create new master drug
export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { maChung, maBhyt, tenThuoc, hoatChat, hamLuong, soDangKy, quyCach, donViTinh } = body;

        if (!maChung || !tenThuoc) {
            return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
        }

        // Check if maChung already exists
        const existingDrug = await prisma.masterDrug.findUnique({ where: { maChung } });
        if (existingDrug) {
            return NextResponse.json({ message: "Mã chung đã tồn tại" }, { status: 400 });
        }

        const drug = await prisma.masterDrug.create({
            data: {
                maChung,
                maBhyt: maBhyt || null,
                tenThuoc,
                hoatChat: hoatChat || null,
                hamLuong: hamLuong || null,
                dangBaoChe: body.dangBaoChe || null,
                soDangKy: soDangKy || null,
                quyCach: quyCach || null,
                donViTinh: donViTinh || null,

                tieuChuan: body.tieuChuan || null,
                tuoiTho: body.tuoiTho || null,
                duongDung: body.duongDung || null,
                nguonGoc: body.nguonGoc || null,

                congTySanXuat: body.congTySanXuat || null,
                nuocSanXuat: body.nuocSanXuat || null,
                diaChiSanXuat: body.diaChiSanXuat || null,

                congTyDangKy: body.congTyDangKy || null,
                nuocDangKy: body.nuocDangKy || null,
                diaChiDangKy: body.diaChiDangKy || null,

                nhomThuoc: body.nhomThuoc || null,
                nhomDieuTri: body.nhomDieuTri || null,
                isKeDon: body.isKeDon || null,
                kiemSoatDacBiet: body.kiemSoatDacBiet || null,
                isTrongNuoc: body.isTrongNuoc || null,
            },
        });

        return NextResponse.json(drug, { status: 201 });
    } catch (error) {
        console.error("Error creating drug:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

// DELETE all master drugs
export async function DELETE() {
    try {
        const session = await auth();
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        // Optional: Add a query param or body to confirm strict intent if needed, 
        // but for now relying on the specific endpoint being called.
        // Actually this is the collection endpoint /api/admin/master-drugs

        await prisma.masterDrug.deleteMany({});

        return NextResponse.json({ message: "All master drugs deleted" });
    } catch (error) {
        console.error("Error deleting all drugs:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
