
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { logActivity, ACTIONS, ENTITY_TYPES } from "@/lib/activity-log";
import { createNotificationForAdmins } from "@/lib/notifications";
import {
    buildFacilityReportValidationResponse,
    loadFacilityReportCanonicalContext,
    validateFacilityReportRows,
} from "@/lib/facility-report-upload";
import {
    hasExistingFacilityReportMonth,
    listReportMonthSummaries,
} from "@/lib/report-submissions";

export async function GET() {
    try {
        const session = await auth();
        if (!session || session.user.role !== "FACILITY") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const summaries = await listReportMonthSummaries({ facilityId: session.user.id });

        return NextResponse.json(
            summaries.map((summary) => ({
                month: summary.month,
                drugCount: summary.drugCount,
                totalImport: summary.totalImport,
                totalExport: summary.totalExport,
                lastUpdated: summary.lastUpdated,
                status: summary.status,
                reportedRowCount: summary.reportedRowCount,
                skippedRowCount: summary.skippedRowCount,
            }))
        );
    } catch (error) {
        console.error("Error fetching report history:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session || session.user.role !== "FACILITY") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        // Verify user exists in DB (to prevent stale session issues after DB reset)
        const userExists = await prisma.user.findUnique({
            where: { id: session.user.id }
        });

        if (!userExists) {
            return NextResponse.json({ message: "User not found. Please login again." }, { status: 401 });
        }

        const body = await request.json();
        const { month, data } = body;

        if (!month || !data || !Array.isArray(data)) {
            return NextResponse.json({ message: "Invalid data format" }, { status: 400 });
        }

        const existingReportMonth = await hasExistingFacilityReportMonth(session.user.id, month);
        if (existingReportMonth) {
            return NextResponse.json({
                message: `Báo cáo tháng ${month} đã được nộp và đã chốt. Không thể nộp lại.`
            }, { status: 403 });
        }

        const context = await loadFacilityReportCanonicalContext(session.user.id, month);
        const validationResult = validateFacilityReportRows(data, context);
        if (!validationResult.ok) {
            return NextResponse.json(buildFacilityReportValidationResponse(validationResult), { status: 400 });
        }

        const submissionCreate = prisma.facilityReportSubmission.create({
            data: {
                facilityId: session.user.id,
                reportMonth: month,
                submittedAt: new Date(),
                reportedRowCount: validationResult.summary.reportedRowCount,
                skippedRowCount: validationResult.summary.skippedRowCount,
            },
        });
        const inventoryReportData = validationResult.rows.map((row) => ({
            facilityId: session.user.id,
            mapId: row.mapId,
            reportMonth: month,
            tonDau: row.tonDau,
            nhap: row.nhap,
            nhapHoanTra: row.nhapHoanTra,
            xuat: row.xuat,
            tonCuoi: row.tonCuoi,
            giaVat: row.giaVat,
            thanhTienTonCuoi: row.thanhTienTonCuoi,
            soQdTrungThau: row.soQdTrungThau,
            tenCongTy: row.tenCongTy,
            ngayBatDauHd: row.ngayBatDauHd,
            ngayKetThucHd: row.ngayKetThucHd,
            bhyt: row.bhyt,
            dichVu: row.dichVu,
            status: "APPROVED" as const,
            adminNote: null,
        }));

        if (inventoryReportData.length === 0) {
            await submissionCreate;
        } else {
            await prisma.$transaction([
                submissionCreate,
                prisma.inventoryReport.createMany({ data: inventoryReportData }),
            ]);
        }

        // Log activity and notify admins
        logActivity({
            userId: session.user.id,
            action: ACTIONS.SUBMIT,
            entityType: ENTITY_TYPES.REPORT,
            details: {
                month,
                drugCount: validationResult.summary.reportedRowCount,
                skippedCount: validationResult.summary.skippedRowCount,
            },
        });

        const facilityName = userExists.facilityName || session.user.name || "Cơ sở";
        createNotificationForAdmins(
            "REPORT_SUBMITTED",
            "Báo cáo mới được nộp",
            `${facilityName} đã nộp báo cáo tồn kho tháng ${month} (${validationResult.summary.reportedRowCount} mặt hàng, ${validationResult.summary.skippedRowCount} dòng bỏ qua)`,
            "report",
            undefined,
            "/dashboard/admin/reports"
        );

        return NextResponse.json({
            message: "Nộp báo cáo thành công",
            stats: {
                success: validationResult.summary.reportedRowCount,
                skipped: validationResult.summary.skippedRowCount,
                error: 0
            }
        });

    } catch (error: unknown) {
        console.error("Error uploading report:", error);
        return NextResponse.json({
            message: "Không thể nộp báo cáo do lỗi hệ thống. Vui lòng thử lại sau hoặc liên hệ quản trị viên."
        }, { status: 500 });
    }
}
