import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { buildPackageStatusData } from "@/lib/mua-sam-package-status";

// GET - Statistics for facility (own data only)
export async function GET() {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const facilityId = session.user.id;

        // Parallel queries
        const [
            keHoachs,
            goiThaus,
            tbmtCount,
            ketQuaLCNTs,
        ] = await Promise.all([
            prisma.keHoachLCNT.findMany({
                where: { facilityId },
                select: {
                    id: true,
                    quyTrinh: true,
                    tenKHLCNT: true,
                    maKHLCNT: true,
                    ngayPheDuyet: true,
                    trangThai: true,
                    createdAt: true,
                },
            }),
            prisma.goiThau.findMany({
                where: { keHoach: { facilityId } },
                select: {
                    id: true,
                    tenGoiThau: true,
                    giaGoiThau: true,
                    hinhThucLCNT: true,
                    createdAt: true,
                    keHoachId: true,
                    keHoach: {
                        select: {
                            id: true,
                            tenKHLCNT: true,
                            maKHLCNT: true,
                            quyTrinh: true,
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
            prisma.thongBaoMoiThau.count({
                where: { goiThau: { keHoach: { facilityId } } },
            }),
            prisma.ketQuaLCNT.findMany({
                where: { goiThau: { keHoach: { facilityId } } },
                select: {
                    soMatHangMoiThau: true,
                    soMatHangTrungThau: true,
                    tongGiaTriTrungThau: true,
                    ngayPheDuyetKQLCNT: true,
                    goiThau: {
                        select: { tenGoiThau: true },
                    },
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
            keHoachCount: keHoachs.length,
            totalGoiThau,
            totalGiaTriGoiThau,
            tbmtCount,
            ketQuaCount: ketQuaLCNTs.length,
            totalGiaTriTrungThau,
            tyLeTrungThau: totalMoiThau > 0 ? Math.round((totalTrungThau / totalMoiThau) * 100) : 0,
        };

        // Pie chart: Phân bổ hình thức LCNT
        const hinhThucMap: Record<string, number> = {};
        goiThaus.forEach((g) => {
            const ht = g.hinhThucLCNT || "Không xác định";
            hinhThucMap[ht] = (hinhThucMap[ht] || 0) + 1;
        });
        const pieHinhThuc = Object.entries(hinhThucMap).map(([name, value]) => ({
            name,
            value,
        }));

        // Bar chart: Giá trị gói thầu theo từng kế hoạch
        const keHoachValueMap: Record<string, { name: string; value: number }> = {};
        goiThaus.forEach((g) => {
            const khId = g.keHoachId;
            const khName = g.keHoach.tenKHLCNT || g.keHoach.maKHLCNT || "KH không tên";
            if (!keHoachValueMap[khId]) {
                keHoachValueMap[khId] = { name: khName, value: 0 };
            }
            keHoachValueMap[khId].value += Number(g.giaGoiThau || 0);
        });
        const valueByKeHoach = Object.values(keHoachValueMap)
            .sort((a, b) => b.value - a.value);

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
            }))
        );

        // Bar chart: Tỷ lệ trúng thầu per kết quả
        const bidData = ketQuaLCNTs.map((k) => ({
            name: k.goiThau.tenGoiThau || "Gói thầu",
            moiThau: k.soMatHangMoiThau || 0,
            trungThau: k.soMatHangTrungThau || 0,
        }));

        // Pie chart: Phân bổ quy trình
        const quyTrinhMap: Record<string, number> = {};
        keHoachs.forEach((kh) => {
            const qt = kh.quyTrinh === 1 ? "Luật Đấu thầu" : "Tự quyết định";
            quyTrinhMap[qt] = (quyTrinhMap[qt] || 0) + 1;
        });
        const pieQuyTrinh = Object.entries(quyTrinhMap).map(([name, value]) => ({
            name,
            value,
        }));

        // Timeline: Kế hoạch theo thời gian
        const timeline = keHoachs.map((kh) => ({
            name: kh.tenKHLCNT || kh.maKHLCNT || "KH",
            date: kh.ngayPheDuyet || kh.createdAt,
            quyTrinh: kh.quyTrinh === 1 ? "Luật Đấu thầu" : "Tự quyết định",
            trangThai: kh.trangThai || "Chưa xác định",
        })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        return NextResponse.json({
            kpis,
            pieHinhThuc,
            valueByKeHoach,
            statusData,
            statusBreakdown,
            statusSummary,
            bidData,
            pieQuyTrinh,
            timeline,
        });
    } catch (error: any) {
        console.error("Error fetching facility mua-sam statistics:", error);
        return NextResponse.json(
            { message: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
