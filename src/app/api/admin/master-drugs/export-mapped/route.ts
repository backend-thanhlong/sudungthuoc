import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET() {
    try {
        const session = await auth();

        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        // Query the master drugs that have AT LEAST ONE mapping with status APPROVED or AUTO_MAPPED
        const mappedMasterDrugs = await prisma.masterDrug.findMany({
            where: {
                drugMaps: {
                    some: {
                        status: {
                            in: ["APPROVED", "AUTO_MAPPED"]
                        }
                    }
                }
            },
            orderBy: {
                tenThuoc: 'asc'
            }
        });

        // Map to Vietnamese format for Excel
        const exportData = mappedMasterDrugs.map(drug => ({
            "Mã chung": drug.maChung,
            "Mã BHYT": drug.maBhyt || "",
            "Tên thuốc": drug.tenThuoc,
            "Hoạt chất": drug.hoatChat || "",
            "Hàm lượng": drug.hamLuong || "",
            "Dạng bào chế": drug.dangBaoChe || "",
            "Số đăng ký": drug.soDangKy || "",
            "Quy cách": drug.quyCach || "",
            "Đơn vị tính": drug.donViTinh || "",
            "Tiêu chuẩn": drug.tieuChuan || "",
            "Tuổi thọ": drug.tuoiTho || "",
            "Đường dùng": drug.duongDung || "",
            "Nguồn gốc": drug.nguonGoc || "",
            "Công ty sản xuất": drug.congTySanXuat || "",
            "Nước sản xuất": drug.nuocSanXuat || "",
            "Địa chỉ sản xuất": drug.diaChiSanXuat || "",
            "Công ty đăng ký": drug.congTyDangKy || "",
            "Nước đăng ký": drug.nuocDangKy || "",
            "Địa chỉ đăng ký": drug.diaChiDangKy || "",
            "Nhóm thuốc": drug.nhomThuoc || "",
            "Thuốc kê đơn": drug.isKeDon || "",
            "Thuốc kiểm soát đặc biệt": drug.kiemSoatDacBiet || "",
            "Thuốc trong nước": drug.isTrongNuoc || "",
        }));

        return NextResponse.json({ data: exportData });
    } catch (error) {
        console.error("[EXPORT_MAPPED_DRUGS_ERROR]", error);
        return NextResponse.json(
            { message: "Đã xảy ra lỗi khi tạo dữ liệu xuất Excel" },
            { status: 500 }
        );
    }
}
