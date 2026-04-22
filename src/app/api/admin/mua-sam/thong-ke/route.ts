import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { buildPackageStatusData } from "@/lib/mua-sam-package-status";

// GET - Statistics for admin (all facilities)
export async function GET() {
    try {
        const session = await auth();
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        // Parallel queries for performance
        const [
            keHoachCount,
            goiThaus,
            tbmtCount,
            ketQuaLCNTs,
            keHoachs,
        ] = await Promise.all([
            prisma.keHoachLCNT.count(),
            prisma.goiThau.findMany({
                select: {
                    id: true,
                    tenGoiThau: true,
                    giaGoiThau: true,
                    hinhThucLCNT: true,
                    createdAt: true,
                    keHoach: {
                        select: {
                            id: true,
                            tenKHLCNT: true,
                            maKHLCNT: true,
                            quyTrinh: true,
                            facility: {
                                select: { id: true, facilityName: true },
                            },
                        },
                    },
                    _count: {
                        select: {
                            thongBaoMoiThaus: true,
                            ketQuaLCNTs: true,
                        },
                    },
                },
            }),
            prisma.thongBaoMoiThau.count(),
            prisma.ketQuaLCNT.findMany({
                select: {
                    soMatHangMoiThau: true,
                    soMatHangTrungThau: true,
                    tongGiaTriTrungThau: true,
                    ngayPheDuyetKQLCNT: true,
                    goiThau: {
                        select: {
                            keHoach: {
                                select: {
                                    facility: {
                                        select: { id: true, facilityName: true },
                                    },
                                },
                            },
                        },
                    },
                },
            }),
            prisma.keHoachLCNT.findMany({
                select: {
                    id: true,
                    quyTrinh: true,
                    createdAt: true,
                },
            }),
        ]);

        // KPIs
        const totalGoiThau = goiThaus.length;
        const totalGiaTriGoiThau = goiThaus.reduce(
            (sum, g) => sum + Number(g.giaGoiThau || 0), 0
        );
        const totalGiaTriTrungThau = ketQuaLCNTs.reduce(
            (sum, k) => sum + Number(k.tongGiaTriTrungThau || 0), 0
        );
        const totalMoiThau = ketQuaLCNTs.reduce(
            (sum, k) => sum + (k.soMatHangMoiThau || 0), 0
        );
        const totalTrungThau = ketQuaLCNTs.reduce(
            (sum, k) => sum + (k.soMatHangTrungThau || 0), 0
        );

        const kpis = {
            keHoachCount,
            totalGoiThau,
            totalGiaTriGoiThau,
            tbmtCount,
            ketQuaCount: ketQuaLCNTs.length,
            totalGiaTriTrungThau,
            tyLeTrungThau: totalMoiThau > 0 ? Math.round((totalTrungThau / totalMoiThau) * 100) : 0,
        };

        // Pie chart: Phân bổ gói thầu theo hình thức LCNT
        const hinhThucMap: Record<string, number> = {};
        goiThaus.forEach((g) => {
            const ht = g.hinhThucLCNT || "Không xác định";
            hinhThucMap[ht] = (hinhThucMap[ht] || 0) + 1;
        });
        const pieHinhThuc = Object.entries(hinhThucMap).map(([name, value]) => ({
            name,
            value,
        }));

        // Bar chart: Top 10 cơ sở có giá trị gói thầu lớn nhất
        const facilityValueMap: Record<string, { name: string; value: number }> = {};
        goiThaus.forEach((g) => {
            const fId = g.keHoach.facility.id;
            const fName = g.keHoach.facility.facilityName || "N/A";
            if (!facilityValueMap[fId]) {
                facilityValueMap[fId] = { name: fName, value: 0 };
            }
            facilityValueMap[fId].value += Number(g.giaGoiThau || 0);
        });
        const topFacilities = Object.values(facilityValueMap)
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);

        const { statusData, statusBreakdown, statusSummary } = buildPackageStatusData(
            goiThaus.map((g) => ({
                goiThauId: g.id,
                tenGoiThau: g.tenGoiThau,
                keHoachId: g.keHoach.id,
                tenKHLCNT: g.keHoach.tenKHLCNT,
                maKHLCNT: g.keHoach.maKHLCNT,
                quyTrinh: g.keHoach.quyTrinh,
                tbmtCount: g._count.thongBaoMoiThaus,
                kqlcntCount: g._count.ketQuaLCNTs,
                facilityId: g.keHoach.facility.id,
                facilityName: g.keHoach.facility.facilityName,
            }))
        );

        // Table: Tỷ lệ trúng thầu theo cơ sở
        const facilityBidMap: Record<string, { name: string; moiThau: number; trungThau: number }> = {};
        ketQuaLCNTs.forEach((k) => {
            const fId = k.goiThau.keHoach.facility.id;
            const fName = k.goiThau.keHoach.facility.facilityName || "N/A";
            if (!facilityBidMap[fId]) {
                facilityBidMap[fId] = { name: fName, moiThau: 0, trungThau: 0 };
            }
            facilityBidMap[fId].moiThau += k.soMatHangMoiThau || 0;
            facilityBidMap[fId].trungThau += k.soMatHangTrungThau || 0;
        });
        const bidRateByFacility = Object.values(facilityBidMap)
            .map((f) => ({
                ...f,
                tyLe: f.moiThau > 0 ? Math.round((f.trungThau / f.moiThau) * 100) : 0,
            }))
            .sort((a, b) => b.moiThau - a.moiThau);

        // Line chart: Xu hướng đấu thầu theo thời gian
        const trendMap: Record<string, number> = {};
        goiThaus.forEach((g) => {
            const d = new Date(g.createdAt);
            const key = `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
            trendMap[key] = (trendMap[key] || 0) + 1;
        });
        const trendData = Object.entries(trendMap)
            .sort(([a], [b]) => {
                const [mA, yA] = a.split("/").map(Number);
                const [mB, yB] = b.split("/").map(Number);
                return yA !== yB ? yA - yB : mA - mB;
            })
            .map(([month, count]) => ({ month, count }));

        // Pie chart: Phân bổ quy trình (Đấu thầu vs Tự quyết định)
        const quyTrinhMap: Record<string, number> = {};
        keHoachs.forEach((kh) => {
            const qt = kh.quyTrinh === 1 ? "Luật Đấu thầu" : "Tự quyết định";
            quyTrinhMap[qt] = (quyTrinhMap[qt] || 0) + 1;
        });
        const pieQuyTrinh = Object.entries(quyTrinhMap).map(([name, value]) => ({
            name,
            value,
        }));

        return NextResponse.json({
            kpis,
            pieHinhThuc,
            topFacilities,
            statusData,
            statusBreakdown,
            statusSummary,
            bidRateByFacility,
            trendData,
            pieQuyTrinh,
        });
    } catch (error: any) {
        console.error("Error fetching mua-sam statistics:", error);
        return NextResponse.json(
            { message: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
