
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

const DETAIL_SEARCH_FIELDS = [
    "all",
    "maNoiBo",
    "tenThuocNoiBo",
    "hoatChatNoiBo",
    "soDangKyNoiBo",
    "maChung",
    "maBhyt",
    "tenThuoc",
    "hoatChat",
    "soDangKy",
    "nhomTckt",
    "soQdTrungThau",
    "tenCongTy",
] as const;

type DetailSearchField = (typeof DETAIL_SEARCH_FIELDS)[number];

const buildContainsFilter = (term: string) => ({
    contains: term,
    mode: "insensitive" as const,
});

const getDetailSearchClause = (searchField: DetailSearchField, searchTerm: string) => {
    const fieldFilters = {
        maNoiBo: { drugMap: { maNoiBo: buildContainsFilter(searchTerm) } },
        tenThuocNoiBo: { drugMap: { tenThuocNoiBo: buildContainsFilter(searchTerm) } },
        hoatChatNoiBo: { drugMap: { hoatChatNoiBo: buildContainsFilter(searchTerm) } },
        soDangKyNoiBo: { drugMap: { soDangKyNoiBo: buildContainsFilter(searchTerm) } },
        maChung: { drugMap: { masterDrug: { maChung: buildContainsFilter(searchTerm) } } },
        maBhyt: { drugMap: { masterDrug: { maBhyt: buildContainsFilter(searchTerm) } } },
        tenThuoc: { drugMap: { masterDrug: { tenThuoc: buildContainsFilter(searchTerm) } } },
        hoatChat: { drugMap: { masterDrug: { hoatChat: buildContainsFilter(searchTerm) } } },
        soDangKy: { drugMap: { masterDrug: { soDangKy: buildContainsFilter(searchTerm) } } },
        nhomTckt: { drugMap: { nhomTckt: buildContainsFilter(searchTerm) } },
        soQdTrungThau: { soQdTrungThau: buildContainsFilter(searchTerm) },
        tenCongTy: { tenCongTy: buildContainsFilter(searchTerm) },
    } as const;

    if (searchField === "all") {
        return {
            OR: Object.values(fieldFilters),
        };
    }

    return fieldFilters[searchField];
};

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
        const rawSearchField = searchParams.get("searchField") || "all";
        const searchTerm = (searchParams.get("searchTerm") || "").trim();
        const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
        const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : 50;
        const searchField = DETAIL_SEARCH_FIELDS.includes(rawSearchField as DetailSearchField)
            ? rawSearchField as DetailSearchField
            : "all";

        if (!facilityId || !month) {
            return NextResponse.json({ message: "Missing required params" }, { status: 400 });
        }

        const where = {
            facilityId,
            reportMonth: month,
            ...(searchTerm ? getDetailSearchClause(searchField, searchTerm) : {}),
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
            nhomTckt: r.drugMap?.nhomTckt || '',
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
