import { NextResponse } from "next/server";
import { type Prisma } from "@/../prisma/generated/client";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const TAB_TO_QUY_TRINH = {
    quyTrinh1: 1,
    quyTrinh2: 2,
} as const;

const PLAN_INCLUDE = {
    facility: {
        select: {
            id: true,
            facilityName: true,
            facilityCode: true,
        },
    },
    goiThaus: {
        include: {
            phanLos: {
                orderBy: {
                    stt: "asc",
                },
            },
            ketQuaLCNTs: {
                select: {
                    id: true,
                    soQdPheDuyetKQLCNT: true,
                    ngayPheDuyetKQLCNT: true,
                },
                orderBy: [
                    {
                        ngayPheDuyetKQLCNT: "desc",
                    },
                    {
                        createdAt: "desc",
                    },
                ],
                take: 1,
            },
        },
        orderBy: {
            createdAt: "asc",
        },
    },
} satisfies Prisma.KeHoachLCNTInclude;

type ListTab = keyof typeof TAB_TO_QUY_TRINH;
type KeHoachWithRelations = Prisma.KeHoachLCNTGetPayload<{ include: typeof PLAN_INCLUDE }>;

function parsePage(value: string | null) {
    const parsed = Number.parseInt(value || "", 10);

    if (!Number.isFinite(parsed) || parsed < 1) {
        return DEFAULT_PAGE;
    }

    return parsed;
}

function parseLimit(value: string | null) {
    const parsed = Number.parseInt(value || "", 10);

    if (!Number.isFinite(parsed) || parsed < 1) {
        return DEFAULT_LIMIT;
    }

    return parsed;
}

function parseTab(value: string | null): ListTab {
    if (value === "quyTrinh2") {
        return "quyTrinh2";
    }

    return "quyTrinh1";
}

function buildContainsFilter(term: string) {
    return {
        contains: term,
        mode: "insensitive" as const,
    };
}

function buildWhere(tab: ListTab, searchTerm: string, facilityId: string) {
    const where: Prisma.KeHoachLCNTWhereInput = {
        quyTrinh: TAB_TO_QUY_TRINH[tab],
    };

    if (facilityId && facilityId !== "all") {
        where.facilityId = facilityId;
    }

    if (searchTerm) {
        where.OR = [
            { maKHLCNT: buildContainsFilter(searchTerm) },
            { tenKHLCNT: buildContainsFilter(searchTerm) },
            { facility: { facilityName: buildContainsFilter(searchTerm) } },
            { facility: { facilityCode: buildContainsFilter(searchTerm) } },
        ];
    }

    return where;
}

function serializeDate(value?: Date | null) {
    return value ? value.toISOString() : null;
}

function serializeDateOnly(value?: Date | null) {
    return value ? value.toISOString().split("T")[0] : "";
}

function parseJsonArray(value?: string | null) {
    if (!value) {
        return [];
    }

    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function serializePlan(plan: KeHoachWithRelations) {
    return {
        id: plan.id,
        quyTrinh: plan.quyTrinh,
        maKHLCNT: plan.maKHLCNT || "",
        tenKHLCNT: plan.tenKHLCNT || "",
        soQuyetDinh: plan.soQuyetDinh || "",
        ngayPheDuyet: serializeDateOnly(plan.ngayPheDuyet),
        soLuongGoiThau: plan.soLuongGoiThau,
        trangThai: plan.trangThai || "Chưa đăng tải",
        createdAt: plan.createdAt.toISOString(),
        loaiMuaSamTuQuyet: plan.loaiMuaSamTuQuyet || "",
        thoiGianBatDauMuaSam: serializeDateOnly(plan.thoiGianBatDauMuaSam),
        thoiGianBatDauThucHienHopDong: serializeDateOnly(plan.thoiGianBatDauThucHienHopDong),
        thoiGianThucHienHopDong: plan.thoiGianThucHienHopDong || "",
        thoiGianKetThucHopDong: serializeDateOnly(plan.thoiGianKetThucHopDong),
        facility: {
            id: plan.facility.id,
            facilityName: plan.facility.facilityName || "—",
            facilityCode: plan.facility.facilityCode || "—",
        },
        goiThaus: plan.goiThaus.map((goiThau) => {
            const ketQuaLCNT = goiThau.ketQuaLCNTs[0] || null;

            return {
                id: goiThau.id,
                tenGoiThau: goiThau.tenGoiThau || "",
                giaGoiThau: goiThau.giaGoiThau ? Number(goiThau.giaGoiThau) : null,
                linhVuc: parseJsonArray(goiThau.linhVuc),
                hinhThucLCNT: goiThau.hinhThucLCNT || "",
                phuongThucLCNT: goiThau.phuongThucLCNT || "",
                loaiHopDong: parseJsonArray(goiThau.loaiHopDong),
                phanLoaiGoiThau: goiThau.phanLoaiGoiThau || "",
                chiTietNguonVon: goiThau.chiTietNguonVon || "",
                soLuongPhanLo: goiThau.soLuongPhanLo,
                thoiGianToChuc: goiThau.thoiGianToChuc || "",
                thoiGianBatDau: goiThau.thoiGianBatDau || "",
                thoiGianThucHien: goiThau.thoiGianThucHien || "",
                trangThai: goiThau.trangThai || "",
                maThongBao: goiThau.maThongBao || "",
                ketQuaLCNT: ketQuaLCNT
                    ? {
                        id: ketQuaLCNT.id,
                        soQdPheDuyetKQLCNT: ketQuaLCNT.soQdPheDuyetKQLCNT,
                        ngayPheDuyetKQLCNT: serializeDateOnly(ketQuaLCNT.ngayPheDuyetKQLCNT),
                    }
                    : null,
                phanLos: goiThau.phanLos.map((phanLo) => ({
                    stt: phanLo.stt,
                    tenPhanLo: phanLo.tenPhanLo || "",
                    donViTinh: phanLo.donViTinh || "",
                    soLuong: phanLo.soLuong ? Number(phanLo.soLuong) : null,
                    donGia: phanLo.donGia ? Number(phanLo.donGia) : null,
                    thanhTien: phanLo.thanhTien ? Number(phanLo.thanhTien) : null,
                    thoiGianThucHien: phanLo.thoiGianThucHien || "",
                    donViTinhThoiGian: phanLo.donViTinhThoiGian || "",
                })),
            };
        }),
    };
}

function buildFacilityPlanGroups(plans: KeHoachWithRelations[], orderedFacilityIds: string[]) {
    const groups = new Map<
        string,
        {
            facilityId: string;
            facilityName: string;
            facilityCode: string;
            plans: ReturnType<typeof serializePlan>[];
            planCount: number;
            totalPackages: number;
            publishedCount: number;
            latestCreatedAt: string | null;
            purchaseTypes: string[];
            latestPurchaseStartAt: string | null;
        }
    >();

    plans.forEach((plan) => {
        const facilityId = plan.facilityId;
        const existing = groups.get(facilityId);
        const createdAt = serializeDate(plan.createdAt);
        const purchaseStartAt = serializeDate(plan.thoiGianBatDauMuaSam);

        if (existing) {
            existing.plans.push(serializePlan(plan));
            existing.planCount += 1;
            existing.totalPackages += plan.goiThaus.length;
            existing.publishedCount += plan.trangThai === "Đã đăng tải" ? 1 : 0;

            if (plan.loaiMuaSamTuQuyet && !existing.purchaseTypes.includes(plan.loaiMuaSamTuQuyet)) {
                existing.purchaseTypes.push(plan.loaiMuaSamTuQuyet);
            }

            if (createdAt && (!existing.latestCreatedAt || createdAt > existing.latestCreatedAt)) {
                existing.latestCreatedAt = createdAt;
            }

            if (purchaseStartAt && (!existing.latestPurchaseStartAt || purchaseStartAt > existing.latestPurchaseStartAt)) {
                existing.latestPurchaseStartAt = purchaseStartAt;
            }

            return;
        }

        groups.set(facilityId, {
            facilityId,
            facilityName: plan.facility.facilityName || "—",
            facilityCode: plan.facility.facilityCode || "—",
            plans: [serializePlan(plan)],
            planCount: 1,
            totalPackages: plan.goiThaus.length,
            publishedCount: plan.trangThai === "Đã đăng tải" ? 1 : 0,
            latestCreatedAt: createdAt,
            purchaseTypes: plan.loaiMuaSamTuQuyet ? [plan.loaiMuaSamTuQuyet] : [],
            latestPurchaseStartAt: purchaseStartAt,
        });
    });

    return orderedFacilityIds
        .map((facilityId) => groups.get(facilityId))
        .filter((group): group is NonNullable<typeof group> => Boolean(group));
}

export async function GET(request: Request) {
    try {
        const session = await auth();
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const tab = parseTab(searchParams.get("tab"));
        const page = parsePage(searchParams.get("page"));
        const limit = parseLimit(searchParams.get("limit"));
        const searchTerm = searchParams.get("searchTerm")?.trim() || "";
        const facilityId = searchParams.get("facilityId") || "all";
        const where = buildWhere(tab, searchTerm, facilityId);

        const [
            matchingFacilities,
            plansSummaryCount,
            publishedPlans,
            totalGoiThaus,
            totalFacilities,
            facilityOptions,
        ] = await Promise.all([
            prisma.keHoachLCNT.groupBy({
                by: ["facilityId"],
                where,
                _max: {
                    createdAt: true,
                },
                orderBy: {
                    _max: {
                        createdAt: "desc",
                    },
                },
            }),
            prisma.keHoachLCNT.count(),
            prisma.keHoachLCNT.count({
                where: {
                    trangThai: "Đã đăng tải",
                },
            }),
            prisma.goiThau.count(),
            prisma.user.count({
                where: {
                    role: "FACILITY",
                    keHoachLCNTs: {
                        some: {},
                    },
                },
            }),
            prisma.user.findMany({
                where: {
                    role: "FACILITY",
                    keHoachLCNTs: {
                        some: {},
                    },
                },
                select: {
                    id: true,
                    facilityName: true,
                    facilityCode: true,
                },
            }),
        ]);

        const total = matchingFacilities.length;
        const totalPages = Math.max(1, Math.ceil(total / limit));
        const safePage = Math.min(page, totalPages);
        const startIndex = (safePage - 1) * limit;
        const pageFacilityIds = matchingFacilities
            .slice(startIndex, startIndex + limit)
            .map((group) => group.facilityId);

        const pagePlans = pageFacilityIds.length === 0
            ? []
            : await prisma.keHoachLCNT.findMany({
                where: {
                    ...where,
                    facilityId: {
                        in: pageFacilityIds,
                    },
                },
                include: PLAN_INCLUDE,
                orderBy: {
                    createdAt: "desc",
                },
            });

        const facilities = facilityOptions
            .map((facility) => ({
                id: facility.id,
                facilityName: facility.facilityName || "—",
                facilityCode: facility.facilityCode || "—",
            }))
            .sort((a, b) => a.facilityName.localeCompare(b.facilityName, "vi"));

        return NextResponse.json({
            data: buildFacilityPlanGroups(pagePlans, pageFacilityIds),
            metadata: {
                page: safePage,
                limit,
                total,
                totalPages,
                summary: {
                    totalPlans: plansSummaryCount,
                    totalFacilities,
                    totalGoiThaus,
                    publishedPlans,
                },
                facilities,
            },
        });
    } catch (error: any) {
        console.error("Error fetching all KHLCNT:", error);
        return NextResponse.json(
            { message: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
