
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

        if (!facilityId || !month) {
            return NextResponse.json({ message: "Missing required params" }, { status: 400 });
        }

        const reports = await prisma.inventoryReport.findMany({
            where: {
                facilityId: facilityId,
                reportMonth: month
            },
            include: {
                drugMap: {
                    include: {
                        masterDrug: true
                    }
                }
            },
            orderBy: {
                drugMap: {
                    tenThuocNoiBo: 'asc'
                }
            }
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

        return NextResponse.json(detailData);

    } catch (error) {
        console.error("Error fetching report detail:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
