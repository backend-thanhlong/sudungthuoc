import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import {
    buildSnapshotMetrics,
    buildSupplyDashboardDataFromMetrics,
    normalizeDemandWindow,
    normalizeSupplyReportRow,
    resolveEffectiveReportMonth,
} from "@/lib/dashboard/supply-risk";
import { buildSupplyInsights } from "@/lib/dashboard/supply-insights";

export async function GET(request: Request) {
    const session = await auth();
    if (!session || (session.user as any).role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const reportMonth = searchParams.get("reportMonth") || undefined;
    const facilityId = searchParams.get("facilityId") || undefined;
    const hoatChat = searchParams.get("hoatChat") || undefined;
    const demandWindow = normalizeDemandWindow(searchParams.get("demandWindow"));

    try {
        const selectedReportMonth = reportMonth && reportMonth !== "all" ? reportMonth : undefined;
        const reportWhere: { facilityId?: string } = {};
        if (facilityId) {
            reportWhere.facilityId = facilityId;
        }

        const [allReports, activeFacilityCount] = await Promise.all([
            prisma.inventoryReport.findMany({
                where: reportWhere,
                select: {
                    facilityId: true,
                    mapId: true,
                    tonCuoi: true,
                    xuat: true,
                    giaVat: true,
                    thanhTienTonCuoi: true,
                    soQdTrungThau: true,
                    tenCongTy: true,
                    ngayBatDauHd: true,
                    ngayKetThucHd: true,
                    bhyt: true,
                    dichVu: true,
                    reportMonth: true,
                    drugMap: {
                        select: {
                            tenThuocNoiBo: true,
                            hoatChatNoiBo: true,
                            masterDrug: {
                                select: {
                                    tenThuoc: true,
                                    hoatChat: true,
                                    hamLuong: true,
                                    isTrongNuoc: true,
                                },
                            },
                        },
                    },
                    facility: {
                        select: {
                            facilityName: true,
                        },
                    },
                },
            }),
            prisma.user.count({
                where: {
                    role: "FACILITY",
                    isActive: true,
                    ...(facilityId ? { id: facilityId } : {}),
                },
            }),
        ]);

        const normalizedReports = allReports.map(normalizeSupplyReportRow);
        const effectiveReportMonth = resolveEffectiveReportMonth(normalizedReports, selectedReportMonth);
        const metrics = buildSnapshotMetrics(normalizedReports, effectiveReportMonth, demandWindow);
        const supplyData = buildSupplyDashboardDataFromMetrics({
            metrics,
            effectiveReportMonth,
            demandWindow,
            hoatChat,
        });
        const supplyInsights = buildSupplyInsights({
            metrics,
            scope: "admin",
            activeFacilityCount,
        });

        // 4. Get available hoatChat list for dropdown
        const hoatChatList = await prisma.masterDrug.findMany({
            where: { isActive: true, hoatChat: { not: null } },
            select: { hoatChat: true },
            distinct: ["hoatChat"],
            orderBy: { hoatChat: "asc" },
            take: 200,
        });

        return NextResponse.json({
            ...supplyData,
            ...supplyInsights,
            hoatChatList: hoatChatList
                .map(item => item.hoatChat)
                .filter((value): value is string => Boolean(value)),
        });
    } catch (error) {
        console.error("Dashboard supply error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
