import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(request: Request) {
    try {
        const session = await auth();
        if (!session || session.user.role !== "FACILITY") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const month = searchParams.get("month");

        if (!month) {
            return NextResponse.json({ message: "Missing month parameter" }, { status: 400 });
        }

        const items = await prisma.inventoryReport.findMany({
            where: {
                facilityId: session.user.id,
                reportMonth: month,
            },
            include: {
                drugMap: {
                    include: {
                        masterDrug: true,
                    },
                },
            },
            orderBy: {
                drugMap: { tenThuocNoiBo: "asc" },
            },
        });

        const result = items.map((item, index) => ({
            id: item.id,
            stt: index + 1,
            maNoiBo: item.drugMap.maNoiBo,
            maThuoc: item.drugMap.masterDrug?.maChung || item.drugMap.maNoiBo,
            drugName: item.drugMap.masterDrug?.tenThuoc || item.drugMap.tenThuocNoiBo,
            hoatChat: item.drugMap.masterDrug?.hoatChat || item.drugMap.hoatChatNoiBo,
            donViTinh: item.drugMap.masterDrug?.donViTinh || item.drugMap.donViTinhNoiBo,
            tonDau: Number(item.tonDau),
            nhap: Number(item.nhap),
            xuat: Number(item.xuat),
            tonCuoi: Number(item.tonCuoi),
            giaVat: Number(item.giaVat),
            thanhTienTonCuoi: Number(item.thanhTienTonCuoi),
            soQdTrungThau: item.soQdTrungThau,
            tenCongTy: item.tenCongTy,
            ngayBatDauHd: item.ngayBatDauHd,
            ngayKetThucHd: item.ngayKetThucHd,
            bhyt: item.bhyt,
            dichVu: item.dichVu,
            status: item.status,
        }));

        return NextResponse.json(result);
    } catch (error) {
        console.error("Error fetching facility report detail:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
