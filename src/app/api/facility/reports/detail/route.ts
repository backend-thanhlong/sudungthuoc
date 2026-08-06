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
        if (!session || session.user.role !== "FACILITY") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
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

        if (!month) {
            return NextResponse.json({ message: "Missing month parameter" }, { status: 400 });
        }

        const where = {
            facilityId: session.user.id,
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
                        masterDrug: true,
                    },
                },
            },
            orderBy: {
                drugMap: {
                    tenThuocNoiBo: "asc",
                },
            },
            skip: (safePage - 1) * limit,
            take: limit,
        });

        const detailData = reports.map((report) => ({
            id: report.id,
            maNoiBo: report.drugMap?.maNoiBo || "",
            tenThuocNoiBo: report.drugMap?.tenThuocNoiBo || "",
            hoatChatNoiBo: report.drugMap?.hoatChatNoiBo || "",
            soDangKyNoiBo: report.drugMap?.soDangKyNoiBo || "",
            donViTinhNoiBo: report.drugMap?.donViTinhNoiBo || "",
            maChung: report.drugMap?.masterDrug?.maChung || "",
            maBhyt: report.drugMap?.masterDrug?.maBhyt || "",
            tenThuoc: report.drugMap?.masterDrug?.tenThuoc || "",
            hoatChat: report.drugMap?.masterDrug?.hoatChat || "",
            hamLuong: report.drugMap?.masterDrug?.hamLuong || "",
            dangBaoChe: report.drugMap?.masterDrug?.dangBaoChe || "",
            soDangKy: report.drugMap?.masterDrug?.soDangKy || "",
            donViTinh: report.drugMap?.masterDrug?.donViTinh || "",
            quyCach: report.drugMap?.masterDrug?.quyCach || "",
            duongDung: report.drugMap?.masterDrug?.duongDung || "",
            congTySanXuat: report.drugMap?.masterDrug?.congTySanXuat || "",
            nuocSanXuat: report.drugMap?.masterDrug?.nuocSanXuat || "",
            congTyDangKy: report.drugMap?.masterDrug?.congTyDangKy || "",
            nhomThuoc: report.drugMap?.masterDrug?.nhomThuoc || "",
            nhomTckt: report.drugMap?.nhomTckt || "",
            tonDau: Number(report.tonDau),
            nhap: Number(report.nhap),
            nhapHoanTra: Number(report.nhapHoanTra),
            xuat: Number(report.xuat),
            tonCuoi: Number(report.tonCuoi),
            giaVat: Number(report.giaVat),
            thanhTienTonCuoi: Number(report.thanhTienTonCuoi),
            soQdTrungThau: report.soQdTrungThau || "",
            tenCongTy: report.tenCongTy || "",
            ngayBatDauHd: report.ngayBatDauHd || "",
            ngayKetThucHd: report.ngayKetThucHd || "",
            bhyt: report.bhyt || "",
            dichVu: report.dichVu || "",
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
        console.error("Error fetching facility report detail:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
