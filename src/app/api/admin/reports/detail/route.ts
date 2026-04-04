
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(request: Request) {
    try {
        const session = await auth();
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const facilityId = searchParams.get("facilityId");
        const month = searchParams.get("month");
        const pageParam = Number.parseInt(searchParams.get("page") || "1", 10);
        const limitParam = Number.parseInt(searchParams.get("limit") || "50", 10);
        const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
        const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : 50;

        if (!facilityId || !month) {
            return NextResponse.json({ message: "Missing required params" }, { status: 400 });
        }

        const where = {
            facilityId,
            reportMonth: month,
        };

        const total = await prisma.inventoryReport.count({ where });
        const totalPages = total > 0 ? Math.ceil(total / limit) : 1;
        const safePage = Math.min(page, totalPages);
        const reports = await prisma.inventoryReport.findMany({
            where,
            include: {
                drugMap: {
                    include: {
                        masterDrug: true
                    }
                }
            },
            orderBy: {
                drugMap: {
                    tenThuocNoiBo: "asc"
                }
            },
            skip: (safePage - 1) * limit,
            take: limit,
        });

        const detailData = reports.map(r => ({
            id: r.id,
            // Thông tin thuốc nội bộ (cơ sở)
            maNoiBo: r.drugMap?.maNoiBo || '',
            tenThuocNoiBo: r.drugMap?.tenThuocNoiBo || '',
            hoatChatNoiBo: r.drugMap?.hoatChatNoiBo || '',
            soDangKyNoiBo: r.drugMap?.soDangKyNoiBo || '',
            donViTinhNoiBo: r.drugMap?.donViTinhNoiBo || '',
            // Thông tin thuốc danh mục chung
            maChung: r.drugMap?.masterDrug?.maChung || '',
            maBhyt: r.drugMap?.masterDrug?.maBhyt || '',
            tenThuoc: r.drugMap?.masterDrug?.tenThuoc || '',
            hoatChat: r.drugMap?.masterDrug?.hoatChat || '',
            hamLuong: r.drugMap?.masterDrug?.hamLuong || '',
            dangBaoChe: r.drugMap?.masterDrug?.dangBaoChe || '',
            soDangKy: r.drugMap?.masterDrug?.soDangKy || '',
            donViTinh: r.drugMap?.masterDrug?.donViTinh || '',
            quyCach: r.drugMap?.masterDrug?.quyCach || '',
            duongDung: r.drugMap?.masterDrug?.duongDung || '',
            congTySanXuat: r.drugMap?.masterDrug?.congTySanXuat || '',
            nuocSanXuat: r.drugMap?.masterDrug?.nuocSanXuat || '',
            congTyDangKy: r.drugMap?.masterDrug?.congTyDangKy || '',
            nhomThuoc: r.drugMap?.masterDrug?.nhomThuoc || '',
            // Số liệu báo cáo
            tonDau: r.tonDau,
            nhap: r.nhap,
            xuat: r.xuat,
            tonCuoi: r.tonCuoi,
            giaVat: r.giaVat,
            thanhTienTonCuoi: r.thanhTienTonCuoi,
            // Thông tin hợp đồng
            soQdTrungThau: r.soQdTrungThau || '',
            tenCongTy: r.tenCongTy || '',
            ngayBatDauHd: r.ngayBatDauHd || '',
            ngayKetThucHd: r.ngayKetThucHd || '',
            bhyt: r.bhyt || '',
            dichVu: r.dichVu || '',
        }));

        return NextResponse.json({
            items: detailData,
            pagination: {
                page: safePage,
                limit,
                total,
                totalPages,
            },
        });

    } catch (error) {
        console.error("Error fetching report detail:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
