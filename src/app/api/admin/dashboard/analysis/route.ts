import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { buildAbcAnalysis } from "@/lib/dashboard/abc-analysis";

export async function GET(request: Request) {
    const session = await auth();
    if (!session || (session.user as any).role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const reportMonth = searchParams.get("reportMonth") || undefined;
    const facilityId = searchParams.get("facilityId") || undefined;
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Number(limitParam) : undefined;

    try {
        const reportWhere: any = {};
        if (reportMonth) {
            reportWhere.reportMonth = reportMonth;
        }
        if (facilityId) {
            reportWhere.facilityId = facilityId;
        }

        const reports = await prisma.inventoryReport.findMany({
            where: reportWhere,
            select: {
                facilityId: true,
                reportMonth: true,
                xuat: true,
                giaVat: true,
                drugMap: {
                    select: {
                        maNoiBo: true,
                        tenThuocNoiBo: true,
                        hoatChatNoiBo: true,
                        donViTinhNoiBo: true,
                        masterDrugId: true,
                        masterDrug: {
                            select: {
                                tenThuoc: true,
                                hoatChat: true,
                                hamLuong: true,
                                donViTinh: true,
                                nhomThuoc: true,
                                therapeuticGroup: {
                                    select: {
                                        name: true,
                                    },
                                },
                                isKeDon: true,
                                kiemSoatDacBiet: true,
                                isTrongNuoc: true,
                            },
                        },
                    },
                },
                facility: {
                    select: {
                        facilityName: true,
                        facilityType: true,
                    },
                },
            },
        });

        return NextResponse.json(buildAbcAnalysis(reports, { scope: "admin", limit }));
    } catch (error) {
        console.error("Dashboard analysis error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
