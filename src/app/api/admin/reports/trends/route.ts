import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

// GET: Usage trends over multiple months
export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session || (session.user as any).role !== "ADMIN") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const facilityId = searchParams.get("facilityId") || "";
        const months = parseInt(searchParams.get("months") || "6");

        // Get all available report months, sorted
        const allMonths = await prisma.inventoryReport.findMany({
            select: { reportMonth: true },
            distinct: ["reportMonth"],
            orderBy: { reportMonth: "desc" },
        });

        // Take last N months
        const selectedMonths = allMonths.map((m) => m.reportMonth).slice(0, months);

        // Build where clause
        const where: any = {
            reportMonth: { in: selectedMonths },
        };
        if (facilityId) {
            where.facilityId = facilityId;
        }

        // Aggregate by month
        const monthlyData = await prisma.inventoryReport.groupBy({
            by: ["reportMonth"],
            where,
            _sum: {
                tonDau: true,
                nhap: true,
                xuat: true,
                tonCuoi: true,
                thanhTienTonCuoi: true,
            },
            _count: {
                id: true,
            },
        });

        // Sort chronologically (MM/YYYY format)
        const sortedData = monthlyData
            .map((d) => ({
                month: d.reportMonth,
                tonDau: Number(d._sum.tonDau) || 0,
                nhap: Number(d._sum.nhap) || 0,
                xuat: Number(d._sum.xuat) || 0,
                tonCuoi: Number(d._sum.tonCuoi) || 0,
                giaTriTonKho: Number(d._sum.thanhTienTonCuoi) || 0,
                soMatHang: d._count.id,
            }))
            .sort((a, b) => {
                const [mA, yA] = a.month.split("/").map(Number);
                const [mB, yB] = b.month.split("/").map(Number);
                return yA !== yB ? yA - yB : mA - mB;
            });

        // Get facility list for filter
        const facilities = await prisma.user.findMany({
            where: { role: "FACILITY", isActive: true },
            select: { id: true, facilityName: true, username: true },
            orderBy: { facilityName: "asc" },
        });

        // Summary statistics
        const summary = {
            totalMonths: sortedData.length,
            avgImport: sortedData.length > 0
                ? Math.round(sortedData.reduce((s, d) => s + d.nhap, 0) / sortedData.length)
                : 0,
            avgExport: sortedData.length > 0
                ? Math.round(sortedData.reduce((s, d) => s + d.xuat, 0) / sortedData.length)
                : 0,
            avgInventoryValue: sortedData.length > 0
                ? Math.round(sortedData.reduce((s, d) => s + d.giaTriTonKho, 0) / sortedData.length)
                : 0,
            trend: sortedData.length >= 2
                ? sortedData[sortedData.length - 1].giaTriTonKho > sortedData[sortedData.length - 2].giaTriTonKho
                    ? "increasing"
                    : "decreasing"
                : "stable",
        };

        return NextResponse.json({
            trends: sortedData,
            facilities,
            summary,
            availableMonths: allMonths.map((m) => m.reportMonth),
        });
    } catch (error) {
        console.error("Error in trends report:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
