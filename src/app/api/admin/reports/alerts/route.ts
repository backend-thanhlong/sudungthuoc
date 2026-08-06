import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

const getReportMonthSortValue = (reportMonth: string) => {
    const match = /^(\d{2})\/(\d{4})$/.exec(reportMonth);
    if (!match) return 0;

    const [, month, year] = match;
    return Number(year) * 100 + Number(month);
};

// GET: Detect abnormal inventory situations
export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session || (session.user as any).role !== "ADMIN") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const reportMonth = searchParams.get("reportMonth") || "";
        const severity = searchParams.get("severity") || ""; // "warning" or "danger"

        // Fetch all reports that match the selected filters.
        const reports = await prisma.inventoryReport.findMany({
            where: reportMonth ? { reportMonth } : {},
            include: {
                facility: {
                    select: {
                        facilityName: true,
                        username: true,
                    },
                },
                drugMap: {
                    include: {
                        masterDrug: {
                            select: {
                                tenThuoc: true,
                                maChung: true,
                            },
                        },
                    },
                },
            },
        });

        // Calculate averages for each drug (across facilities)
        const drugStats = new Map<string, { totalTonCuoi: number; count: number; avgTonCuoi: number }>();
        reports.forEach((r) => {
            const drugId = r.drugMap?.masterDrug?.maChung || r.drugMap?.maNoiBo || "unknown";
            if (!drugStats.has(drugId)) {
                drugStats.set(drugId, { totalTonCuoi: 0, count: 0, avgTonCuoi: 0 });
            }
            const stats = drugStats.get(drugId)!;
            stats.totalTonCuoi += Number(r.tonCuoi);
            stats.count += 1;
        });
        drugStats.forEach((stats) => {
            stats.avgTonCuoi = stats.count > 0 ? stats.totalTonCuoi / stats.count : 0;
        });

        // Detect anomalies
        const alerts: any[] = [];

        reports.forEach((r) => {
            const facilityName = r.facility.facilityName || r.facility.username;
            const drugName = r.drugMap?.masterDrug?.tenThuoc || r.drugMap?.tenThuocNoiBo || "N/A";
            const drugId = r.drugMap?.masterDrug?.maChung || r.drugMap?.maNoiBo || "unknown";
            const tonDau = Number(r.tonDau);
            const nhap = Number(r.nhap);
            const nhapHoanTra = Number(r.nhapHoanTra);
            const xuat = Number(r.xuat);
            const tonCuoi = Number(r.tonCuoi);
            const giaVat = Number(r.giaVat);

            // Alert 1: Balance mismatch (tonDau + nhap + nhapHoanTra - xuat != tonCuoi)
            const expectedTonCuoi = tonDau + nhap + nhapHoanTra - xuat;
            const variance = Math.abs(expectedTonCuoi - tonCuoi);
            if (variance > 0.01 && expectedTonCuoi > 0) {
                const variancePercent = (variance / Math.max(expectedTonCuoi, 1)) * 100;
                if (variancePercent > 5) {
                    alerts.push({
                        id: `balance-${r.id}`,
                        type: "BALANCE_MISMATCH",
                        severity: variancePercent > 20 ? "danger" : "warning",
                        facilityName,
                        drugName,
                        reportMonth: r.reportMonth,
                        message: `Chênh lệch tồn kho: Tồn đầu(${tonDau}) + Nhập(${nhap}) + Nhập HT(${nhapHoanTra}) - Xuất(${xuat}) = ${expectedTonCuoi}, nhưng Tồn cuối = ${tonCuoi}`,
                        detail: {
                            tonDau,
                            nhap,
                            nhapHoanTra,
                            xuat,
                            expectedTonCuoi,
                            actualTonCuoi: tonCuoi,
                            variance: Math.round(variance * 100) / 100,
                            variancePercent: Math.round(variancePercent * 100) / 100,
                        },
                    });
                }
            }

            // Alert 2: Abnormally high inventory (>2x average across facilities)
            const stats = drugStats.get(drugId);
            if (stats && stats.count > 1 && stats.avgTonCuoi > 0) {
                const ratio = tonCuoi / stats.avgTonCuoi;
                if (ratio > 3) {
                    alerts.push({
                        id: `high-${r.id}`,
                        type: "HIGH_INVENTORY",
                        severity: "warning",
                        facilityName,
                        drugName,
                        reportMonth: r.reportMonth,
                        message: `Tồn cuối (${tonCuoi}) cao gấp ${ratio.toFixed(1)}x so với trung bình (${Math.round(stats.avgTonCuoi)})`,
                        detail: {
                            tonCuoi,
                            avgTonCuoi: Math.round(stats.avgTonCuoi),
                            ratio: Math.round(ratio * 10) / 10,
                        },
                    });
                }
            }

            // Alert 3: Zero inventory with high import
            if (tonCuoi === 0 && nhap > 10) {
                alerts.push({
                    id: `zero-${r.id}`,
                    type: "ZERO_INVENTORY",
                    severity: "danger",
                    facilityName,
                    drugName,
                    reportMonth: r.reportMonth,
                    message: `Tồn cuối = 0 nhưng nhập trong kỳ = ${nhap}. Kiểm tra dữ liệu xuất.`,
                    detail: {
                        tonDau,
                        nhap,
                        xuat,
                        tonCuoi,
                    },
                });
            }

            // Alert 4: High value inventory
            const value = tonCuoi * giaVat;
            if (value > 500000000) { // > 500 million VND
                alerts.push({
                    id: `value-${r.id}`,
                    type: "HIGH_VALUE",
                    severity: "warning",
                    facilityName,
                    drugName,
                    reportMonth: r.reportMonth,
                    message: `Giá trị tồn kho cao: ${new Intl.NumberFormat("vi-VN").format(value)} VNĐ`,
                    detail: {
                        tonCuoi,
                        giaVat,
                        totalValue: value,
                    },
                });
            }
        });

        // Filter by severity if specified
        const filteredAlerts = severity
            ? alerts.filter((a) => a.severity === severity)
            : alerts;

        // Sort: danger first, then warning
        filteredAlerts.sort((a, b) => {
            if (a.severity !== b.severity) {
                return a.severity === "danger" ? -1 : 1;
            }

            const monthDiff = getReportMonthSortValue(b.reportMonth) - getReportMonthSortValue(a.reportMonth);
            if (monthDiff !== 0) {
                return monthDiff;
            }

            const facilityDiff = a.facilityName.localeCompare(b.facilityName, "vi");
            if (facilityDiff !== 0) {
                return facilityDiff;
            }

            return a.drugName.localeCompare(b.drugName, "vi");
        });

        // Get months for filter
        const months = await prisma.inventoryReport.findMany({
            select: { reportMonth: true },
            distinct: ["reportMonth"],
            orderBy: { reportMonth: "desc" },
        });

        const monthValues = months
            .map((m) => m.reportMonth)
            .sort((a, b) => getReportMonthSortValue(b) - getReportMonthSortValue(a));

        // Summary
        const summary = {
            totalAlerts: filteredAlerts.length,
            dangerCount: filteredAlerts.filter((a) => a.severity === "danger").length,
            warningCount: filteredAlerts.filter((a) => a.severity === "warning").length,
            byType: {
                BALANCE_MISMATCH: filteredAlerts.filter((a) => a.type === "BALANCE_MISMATCH").length,
                HIGH_INVENTORY: filteredAlerts.filter((a) => a.type === "HIGH_INVENTORY").length,
                ZERO_INVENTORY: filteredAlerts.filter((a) => a.type === "ZERO_INVENTORY").length,
                HIGH_VALUE: filteredAlerts.filter((a) => a.type === "HIGH_VALUE").length,
            },
        };

        return NextResponse.json({
            alerts: filteredAlerts,
            months: monthValues,
            currentMonth: reportMonth || null,
            summary,
        });
    } catch (error) {
        console.error("Error in alerts report:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
