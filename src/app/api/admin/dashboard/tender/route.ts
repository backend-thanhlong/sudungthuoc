import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

function parseDate(dateStr: string | null): Date | null {
    if (!dateStr) return null;
    // Format: YYYYMMDD or DD/MM/YYYY or YYYY-MM-DD
    if (/^\d{8}$/.test(dateStr)) {
        const y = parseInt(dateStr.substring(0, 4));
        const m = parseInt(dateStr.substring(4, 6)) - 1;
        const d = parseInt(dateStr.substring(6, 8));
        return new Date(y, m, d);
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
        const [d, m, y] = dateStr.split('/').map(Number);
        return new Date(y, m - 1, d);
    }
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? null : parsed;
}

export async function GET(request: Request) {
    const session = await auth();
    if (!session || (session.user as any).role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const reportMonth = searchParams.get("reportMonth") || undefined;
    const facilityId = searchParams.get("facilityId") || undefined;

    try {
        const reportWhere: any = {};
        if (reportMonth) {
            reportWhere.reportMonth = reportMonth;
        }
        if (facilityId) {
            reportWhere.facilityId = facilityId;
        }

        const allReports = await prisma.inventoryReport.findMany({
            where: {
                ...reportWhere,
                soQdTrungThau: { not: null },
            },
            select: {
                facilityId: true,
                soQdTrungThau: true,
                ngayBatDauHd: true,
                ngayKetThucHd: true,
                tenCongTy: true,
                nhap: true,
                giaVat: true,
                drugMap: {
                    select: {
                        tenThuocNoiBo: true,
                        masterDrug: {
                            select: {
                                id: true,
                                maChung: true,
                                tenThuoc: true,
                                hoatChat: true,
                                hamLuong: true,
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

        const now = new Date();
        const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

        // 1. Gantt Chart Data - grouped by soQdTrungThau
        const contractMap = new Map<string, {
            soQd: string;
            congTy: string;
            startDate: string | null;
            endDate: string | null;
            startMs: number | null;
            endMs: number | null;
            status: string;
            drugCount: number;
        }>();

        allReports.forEach(r => {
            const soQd = r.soQdTrungThau || "";
            if (!soQd) return;

            if (!contractMap.has(soQd)) {
                const startParsed = parseDate(r.ngayBatDauHd);
                const endParsed = parseDate(r.ngayKetThucHd);

                let status = "active";
                if (endParsed) {
                    if (endParsed < now) status = "expired";
                    else if (endParsed <= in30Days) status = "expiring";
                }

                contractMap.set(soQd, {
                    soQd,
                    congTy: r.tenCongTy || "N/A",
                    startDate: r.ngayBatDauHd,
                    endDate: r.ngayKetThucHd,
                    startMs: startParsed?.getTime() || null,
                    endMs: endParsed?.getTime() || null,
                    status,
                    drugCount: 0,
                });
            }
            contractMap.get(soQd)!.drugCount += 1;
        });

        const ganttData = Array.from(contractMap.values())
            .filter(c => c.startMs && c.endMs)
            .sort((a, b) => (a.startMs || 0) - (b.startMs || 0))
            .slice(0, 30);

        // 2. Expiring contracts table
        const expiringContracts = allReports
            .filter(r => {
                const endDate = parseDate(r.ngayKetThucHd);
                return endDate && endDate <= in60Days && endDate >= now;
            })
            .map(r => ({
                soQd: r.soQdTrungThau || "N/A",
                congTy: r.tenCongTy || "N/A",
                drugName: r.drugMap?.masterDrug?.tenThuoc || r.drugMap?.tenThuocNoiBo || "N/A",
                hoatChat: r.drugMap?.masterDrug?.hoatChat || "N/A",
                facility: r.facility?.facilityName || "Unknown",
                ngayKetThuc: r.ngayKetThucHd || "N/A",
            }))
            .slice(0, 100);

        // 3. Treemap: Top 10 suppliers by value
        const supplierMap = new Map<string, number>();
        allReports.forEach(r => {
            const company = r.tenCongTy || "Không rõ";
            const value = Number(r.nhap) * Number(r.giaVat);
            supplierMap.set(company, (supplierMap.get(company) || 0) + value);
        });
        const treemapData = Array.from(supplierMap.entries())
            .map(([name, value]) => ({ name, value: Math.round(value) }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);

        // 4. Price comparison: same master drug across facilities / tenders
        const priceGroups = new Map<string, Array<{
            masterDrugId: string;
            maChung: string;
            hoatChat: string;
            hamLuong: string;
            soQd: string;
            congTy: string;
            facilityId: string;
            facility: string;
            giaVat: number;
            drugName: string;
        }>>();

        allReports.forEach(r => {
            const masterDrug = r.drugMap?.masterDrug;
            if (!masterDrug?.id || !masterDrug.maChung) return;

            const key = masterDrug.id;
            if (!priceGroups.has(key)) {
                priceGroups.set(key, []);
            }
            priceGroups.get(key)!.push({
                masterDrugId: masterDrug.id,
                maChung: masterDrug.maChung,
                hoatChat: masterDrug.hoatChat || "N/A",
                hamLuong: masterDrug.hamLuong || "N/A",
                soQd: r.soQdTrungThau || "N/A",
                congTy: r.tenCongTy || "N/A",
                facilityId: r.facilityId,
                facility: r.facility?.facilityName || "Unknown",
                giaVat: Number(r.giaVat),
                drugName: masterDrug.tenThuoc || r.drugMap?.tenThuocNoiBo || "N/A",
            });
        });

        // Only keep groups with price variance
        const priceComparison: Array<{
            maChung: string;
            drugName: string;
            hoatChat: string;
            hamLuong: string;
            items: Array<{
                soQd: string;
                congTy: string;
                facility: string;
                giaVat: number;
                drugName: string;
            }>;
            minPrice: number;
            maxPrice: number;
            variance: number;
        }> = [];

        priceGroups.forEach((items) => {
            // Deduplicate by facility + soQd + congTy. Keep highest price if repeated.
            const uniqueItems = new Map<string, typeof items[0]>();
            items.forEach(item => {
                const ukey = `${item.facilityId}|||${item.soQd}|||${item.congTy}`;
                if (!uniqueItems.has(ukey) || item.giaVat > uniqueItems.get(ukey)!.giaVat) {
                    uniqueItems.set(ukey, item);
                }
            });

            const deduped = Array.from(uniqueItems.values());
            if (deduped.length < 2) return;

            const prices = deduped.map(i => i.giaVat).filter(p => p > 0);
            if (prices.length < 2) return;

            const minP = Math.min(...prices);
            const maxP = Math.max(...prices);
            const variance = minP > 0 ? ((maxP - minP) / minP) * 100 : 0;

            if (variance > 5) { // Only show if variance > 5%
                priceComparison.push({
                    maChung: deduped[0].maChung,
                    drugName: deduped[0].drugName,
                    hoatChat: deduped[0].hoatChat,
                    hamLuong: deduped[0].hamLuong,
                    items: deduped.map(i => ({
                        soQd: i.soQd,
                        congTy: i.congTy,
                        facility: i.facility,
                        giaVat: i.giaVat,
                        drugName: i.drugName,
                    })),
                    minPrice: minP,
                    maxPrice: maxP,
                    variance: Math.round(variance * 10) / 10,
                });
            }
        });

        priceComparison.sort((a, b) => b.variance - a.variance);

        return NextResponse.json({
            ganttData,
            expiringContracts,
            treemapData,
            priceComparison: priceComparison.slice(0, 50),
        });
    } catch (error) {
        console.error("Dashboard tender error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
