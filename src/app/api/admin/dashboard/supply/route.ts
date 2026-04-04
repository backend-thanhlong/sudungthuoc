import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(request: Request) {
    const session = await auth();
    if (!session || (session.user as any).role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const reportMonth = searchParams.get("reportMonth") || undefined;
    const facilityId = searchParams.get("facilityId") || undefined;
    const hoatChat = searchParams.get("hoatChat") || undefined;

    try {
        const reportWhere: any = {};
        if (reportMonth) {
            reportWhere.reportMonth = reportMonth;
        }
        if (facilityId) {
            reportWhere.facilityId = facilityId;
        }

        const allReports = await prisma.inventoryReport.findMany({
            where: reportWhere,
            select: {
                facilityId: true,
                tonCuoi: true,
                xuat: true,
                nhap: true,
                giaVat: true,
                reportMonth: true,
                drugMap: {
                    select: {
                        tenThuocNoiBo: true,
                        masterDrug: {
                            select: {
                                tenThuoc: true,
                                hoatChat: true,
                                hamLuong: true,
                                donViTinh: true,
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
        });

        // 1. Stockout Risk: tonCuoi = 0 but xuat > 0
        const stockoutRisk = allReports
            .filter(r => Number(r.tonCuoi) === 0 && Number(r.xuat) > 0)
            .map(r => ({
                facility: r.facility?.facilityName || "Unknown",
                drugName: r.drugMap?.masterDrug?.tenThuoc || r.drugMap?.tenThuocNoiBo || "N/A",
                hoatChat: r.drugMap?.masterDrug?.hoatChat || "N/A",
                hamLuong: r.drugMap?.masterDrug?.hamLuong || "",
                xuat: Number(r.xuat),
                tonCuoi: 0,
            }))
            .sort((a, b) => b.xuat - a.xuat)
            .slice(0, 100);

        // 2. Scatter plot data: tonCuoi vs xuat
        const scatterData = allReports
            .filter(r => Number(r.tonCuoi) > 0 || Number(r.xuat) > 0)
            .map(r => ({
                drugName: r.drugMap?.masterDrug?.tenThuoc || r.drugMap?.tenThuocNoiBo || "N/A",
                facility: r.facility?.facilityName || "Unknown",
                xuat: Number(r.xuat),
                tonCuoi: Number(r.tonCuoi),
            }))
            .slice(0, 500);

        // 3. Transfer suggestions for a given hoatChat
        let transferData = null;
        if (hoatChat) {
            const hoatChatReports = allReports.filter(
                r => r.drugMap?.masterDrug?.hoatChat?.toLowerCase().includes(hoatChat.toLowerCase())
            );

            // Calculate monthly usage (xuat) per facility
            const facilityUsage = new Map<string, { tonCuoi: number; xuat: number; facilityName: string }>();
            hoatChatReports.forEach(r => {
                const fName = r.facility?.facilityName || "Unknown";
                const existing = facilityUsage.get(fName) || { tonCuoi: 0, xuat: 0, facilityName: fName };
                existing.tonCuoi += Number(r.tonCuoi);
                existing.xuat += Number(r.xuat);
                facilityUsage.set(fName, existing);
            });

            // Surplus: tonCuoi > 3 * xuat (more than 3 months stock)
            const surplus = Array.from(facilityUsage.values())
                .filter(f => f.xuat > 0 && f.tonCuoi > 3 * f.xuat)
                .map(f => ({
                    facility: f.facilityName,
                    tonCuoi: f.tonCuoi,
                    xuat: f.xuat,
                    monthsOfStock: Math.round((f.tonCuoi / f.xuat) * 10) / 10,
                }))
                .sort((a, b) => b.monthsOfStock - a.monthsOfStock);

            // Shortage: tonCuoi = 0
            const shortage = Array.from(facilityUsage.values())
                .filter(f => f.tonCuoi === 0)
                .map(f => ({
                    facility: f.facilityName,
                    tonCuoi: 0,
                    xuat: f.xuat,
                }))
                .sort((a, b) => b.xuat - a.xuat);

            transferData = { surplus, shortage };
        }

        // 4. Get available hoatChat list for dropdown
        const hoatChatList = await prisma.masterDrug.findMany({
            where: { isActive: true, hoatChat: { not: null } },
            select: { hoatChat: true },
            distinct: ['hoatChat'],
            orderBy: { hoatChat: 'asc' },
            take: 200,
        });

        return NextResponse.json({
            stockoutRisk,
            scatterData,
            transferData,
            hoatChatList: hoatChatList.map(h => h.hoatChat).filter(Boolean),
        });
    } catch (error) {
        console.error("Dashboard supply error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
