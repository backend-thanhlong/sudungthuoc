import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { logActivity, ACTIONS, ENTITY_TYPES } from "@/lib/activity-log";
import {
    compareReportMonths,
    getPreviousReportMonth,
    isValidReportMonth,
} from "@/lib/report-month";

const LIFECYCLE_ALLOWED_STATUSES = ["APPROVED", "AUTO_MAPPED"] as const;

const normalizeOptionalText = (value: unknown) => {
    if (value === null || value === undefined) return null;
    const normalized = String(value).trim().replace(/\s+/g, " ");
    return normalized || null;
};

const hasSubmittedMonth = async (facilityId: string, reportMonth: string) => {
    const [submission, report] = await Promise.all([
        prisma.facilityReportSubmission.findUnique({
            where: {
                facilityId_reportMonth: {
                    facilityId,
                    reportMonth,
                },
            },
            select: { id: true },
        }),
        prisma.inventoryReport.findFirst({
            where: { facilityId, reportMonth },
            select: { id: true },
        }),
    ]);

    return Boolean(submission || report);
};

const hasLaterSubmittedMonth = async (facilityId: string, reportMonth: string) => {
    const [submissions, reports] = await Promise.all([
        prisma.facilityReportSubmission.findMany({
            where: { facilityId },
            select: { reportMonth: true },
        }),
        prisma.inventoryReport.findMany({
            where: { facilityId },
            select: { reportMonth: true },
            distinct: ["reportMonth"],
        }),
    ]);

    return [...submissions, ...reports].some((row) =>
        isValidReportMonth(row.reportMonth) && compareReportMonths(row.reportMonth, reportMonth) >= 0
    );
};

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session || session.user.role !== "FACILITY") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json() as {
            action?: "deactivate" | "reactivate";
            effectiveMonth?: string;
            reason?: string;
        };

        const effectiveMonth = normalizeOptionalText(body.effectiveMonth);
        if (!effectiveMonth || !isValidReportMonth(effectiveMonth)) {
            return NextResponse.json(
                { message: "Tháng hiệu lực phải theo định dạng MM/YYYY" },
                { status: 400 }
            );
        }

        const mapping = await prisma.facilityDrugMap.findFirst({
            where: { id, facilityId: session.user.id },
            select: {
                id: true,
                facilityId: true,
                status: true,
                isActive: true,
                tenThuocNoiBo: true,
                inactiveFromMonth: true,
                reactivatedFromMonth: true,
            },
        });

        if (!mapping) {
            return NextResponse.json({ message: "Mapping not found" }, { status: 404 });
        }

        if (!LIFECYCLE_ALLOWED_STATUSES.includes(mapping.status as typeof LIFECYCLE_ALLOWED_STATUSES[number])) {
            return NextResponse.json(
                { message: "Chỉ thuốc đã duyệt hoặc tự động ánh xạ mới có thể ngừng sử dụng/kích hoạt lại." },
                { status: 400 }
            );
        }

        if (body.action === "deactivate") {
            if (!mapping.isActive) {
                return NextResponse.json({ message: "Thuốc đã ở trạng thái ngừng sử dụng." }, { status: 400 });
            }

            if (await hasLaterSubmittedMonth(session.user.id, effectiveMonth)) {
                return NextResponse.json(
                    { message: `Đã có báo cáo từ tháng ${effectiveMonth} trở đi. Không thể ngừng sử dụng hồi tố.` },
                    { status: 400 }
                );
            }

            const previousMonth = getPreviousReportMonth(effectiveMonth);
            if (previousMonth) {
                const previousReport = await prisma.inventoryReport.findUnique({
                    where: {
                        facilityId_mapId_reportMonth: {
                            facilityId: session.user.id,
                            mapId: mapping.id,
                            reportMonth: previousMonth,
                        },
                    },
                    select: { tonCuoi: true },
                });

                if (previousReport && Number(previousReport.tonCuoi) > 0) {
                    return NextResponse.json(
                        {
                            message:
                                `Thuốc còn tồn cuối tháng ${previousMonth}. Cần báo cáo đến khi tồn cuối bằng 0 trước khi ngừng sử dụng.`,
                        },
                        { status: 400 }
                    );
                }
            }

            const updated = await prisma.facilityDrugMap.update({
                where: { id },
                data: {
                    isActive: false,
                    inactiveFromMonth: effectiveMonth,
                    inactiveReason: normalizeOptionalText(body.reason),
                    inactiveAt: new Date(),
                    reactivatedFromMonth: null,
                    reactivatedAt: null,
                },
                include: { masterDrug: true },
            });

            logActivity({
                userId: session.user.id,
                action: ACTIONS.UPDATE,
                entityType: ENTITY_TYPES.MAPPING,
                entityId: id,
                details: {
                    action: "DEACTIVATE_MAPPING",
                    effectiveMonth,
                    tenThuoc: mapping.tenThuocNoiBo,
                },
            });

            return NextResponse.json(updated);
        }

        if (body.action === "reactivate") {
            if (mapping.isActive) {
                return NextResponse.json({ message: "Thuốc đang hoạt động." }, { status: 400 });
            }

            if (mapping.inactiveFromMonth && compareReportMonths(effectiveMonth, mapping.inactiveFromMonth) < 0) {
                return NextResponse.json(
                    { message: `Tháng kích hoạt lại không được trước tháng ngừng sử dụng ${mapping.inactiveFromMonth}.` },
                    { status: 400 }
                );
            }

            if (await hasSubmittedMonth(session.user.id, effectiveMonth)) {
                return NextResponse.json(
                    { message: `Báo cáo tháng ${effectiveMonth} đã được nộp. Chọn tháng chưa nộp để kích hoạt lại.` },
                    { status: 400 }
                );
            }

            const updated = await prisma.facilityDrugMap.update({
                where: { id },
                data: {
                    isActive: true,
                    reactivatedFromMonth: effectiveMonth,
                    reactivatedAt: new Date(),
                },
                include: { masterDrug: true },
            });

            logActivity({
                userId: session.user.id,
                action: ACTIONS.UPDATE,
                entityType: ENTITY_TYPES.MAPPING,
                entityId: id,
                details: {
                    action: "REACTIVATE_MAPPING",
                    effectiveMonth,
                    tenThuoc: mapping.tenThuocNoiBo,
                },
            });

            return NextResponse.json(updated);
        }

        return NextResponse.json({ message: "Invalid lifecycle action" }, { status: 400 });
    } catch (error) {
        console.error("Error updating mapping lifecycle:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
