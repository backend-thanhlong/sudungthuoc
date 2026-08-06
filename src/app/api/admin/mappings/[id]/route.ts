import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { createNotificationForFacility } from "@/lib/notifications";
import { logActivity, ACTIONS, ENTITY_TYPES } from "@/lib/activity-log";
import {
    compareReportDates,
    isCategoryMarked,
    normalizeReportText,
    parseReportDateValue,
    parseStrictNumber,
} from "@/lib/report-validation";

const ADMIN_EDITABLE_STATUSES = ["APPROVED", "AUTO_MAPPED"] as const;

const hasOwn = (body: Record<string, unknown>, key: string) =>
    Object.prototype.hasOwnProperty.call(body, key);

const normalizeOptionalText = (value: unknown) => {
    if (value === null || value === undefined) return null;
    const normalized = String(value).trim().replace(/\s+/g, " ");
    return normalized || null;
};

const normalizeOptionalDate = (value: unknown) => {
    const parsed = parseReportDateValue(value);
    return {
        value: parsed.value,
        valid: parsed.valid,
    };
};

const normalizeRequiredGiaVat = (value: unknown) => {
    const parsed = parseStrictNumber(value);
    return {
        value: parsed.value,
        valid: parsed.valid && !parsed.blank && parsed.value >= 0,
        blank: parsed.blank,
        negative: parsed.valid && !parsed.blank && parsed.value < 0,
    };
};

const normalizeOptionalCategory = (value: unknown) => {
    const normalized = normalizeReportText(value);
    if (!normalized) return { value: null, valid: true };
    return { value: isCategoryMarked(normalized) ? "X" : normalized, valid: isCategoryMarked(normalized) };
};

// PATCH update mapping status
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session || session.user.role !== "ADMIN") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json() as Record<string, unknown>;
        const { status, adminNote } = body;

        // Fetch full mapping with facility info for notification
        const existingMapping = await prisma.facilityDrugMap.findUnique({
            where: { id },
            include: {
                facility: { select: { id: true, facilityName: true } },
            },
        });

        if (!existingMapping) {
            return NextResponse.json({ message: "Mapping not found" }, { status: 404 });
        }

        if (status !== undefined) {
            if (status !== "APPROVED" && status !== "REJECTED") {
                return NextResponse.json({ message: "Status must be APPROVED or REJECTED" }, { status: 400 });
            }

            const mapping = await prisma.facilityDrugMap.update({
                where: { id },
                data: {
                    status,
                    adminNote: normalizeOptionalText(adminNote),
                },
            });

            // Log activity
            logActivity({
                userId: session.user.id,
                action: status === "APPROVED" ? ACTIONS.APPROVE : ACTIONS.REJECT,
                entityType: ENTITY_TYPES.MAPPING,
                entityId: id,
                details: { status, adminNote, tenThuoc: existingMapping.tenThuocNoiBo },
            });

            // Notify the facility about the individual decision
            if (existingMapping.facility) {
                const facilityId = existingMapping.facility.id;
                const tenThuoc = existingMapping.tenThuocNoiBo;

                if (status === "APPROVED") {
                    createNotificationForFacility(
                        facilityId,
                        "MAPPING_APPROVED",
                        "Ánh xạ thuốc được duyệt",
                        `Thuốc "${tenThuoc}" đã được Admin phê duyệt ánh xạ`,
                        "mapping",
                        id,
                        "/dashboard/facility/mappings"
                    );
                } else if (status === "REJECTED") {
                    createNotificationForFacility(
                        facilityId,
                        "MAPPING_REJECTED",
                        "Ánh xạ thuốc bị từ chối",
                        `Thuốc "${tenThuoc}" bị từ chối. Lý do: ${adminNote || "Không có"}`,
                        "mapping",
                        id,
                        "/dashboard/facility/mappings"
                    );
                }
            }

            return NextResponse.json(mapping);
        }

        if (!ADMIN_EDITABLE_STATUSES.includes(existingMapping.status as typeof ADMIN_EDITABLE_STATUSES[number])) {
            return NextResponse.json(
                { message: "Chỉ được chỉnh sửa thuốc Đã duyệt hoặc Tự động." },
                { status: 403 }
            );
        }

        const nextNgayBatDau = hasOwn(body, "ngayBatDauHd")
            ? normalizeOptionalDate(body.ngayBatDauHd)
            : { value: existingMapping.ngayBatDauHd, valid: true };
        const nextNgayKetThuc = hasOwn(body, "ngayKetThucHd")
            ? normalizeOptionalDate(body.ngayKetThucHd)
            : { value: existingMapping.ngayKetThucHd, valid: true };

        if (!nextNgayBatDau.valid) {
            return NextResponse.json(
                { message: "Ngày bắt đầu HĐ phải theo định dạng YYYYMMDD và là ngày hợp lệ" },
                { status: 400 }
            );
        }

        if (!nextNgayKetThuc.valid) {
            return NextResponse.json(
                { message: "Ngày kết thúc HĐ phải theo định dạng YYYYMMDD và là ngày hợp lệ" },
                { status: 400 }
            );
        }

        if (
            nextNgayBatDau.value
            && nextNgayKetThuc.value
            && compareReportDates(nextNgayBatDau.value, nextNgayKetThuc.value) > 0
        ) {
            return NextResponse.json(
                { message: "Ngày bắt đầu HĐ không được lớn hơn Ngày kết thúc HĐ" },
                { status: 400 }
            );
        }

        const nextGiaVat = hasOwn(body, "giaVat")
            ? normalizeRequiredGiaVat(body.giaVat)
            : { value: Number(existingMapping.giaVat), valid: true, blank: false, negative: false };
        const nextBhyt = hasOwn(body, "bhyt")
            ? normalizeOptionalCategory(body.bhyt)
            : { value: existingMapping.bhyt, valid: true };
        const nextDichVu = hasOwn(body, "dichVu")
            ? normalizeOptionalCategory(body.dichVu)
            : { value: existingMapping.dichVu, valid: true };

        if (!nextGiaVat.valid) {
            return NextResponse.json(
                {
                    message: nextGiaVat.blank
                        ? "Thiếu Giá VAT (bắt buộc)"
                        : nextGiaVat.negative
                            ? "Giá VAT không được âm"
                            : "Giá VAT phải là số hợp lệ",
                },
                { status: 400 }
            );
        }

        if (!nextBhyt.valid) {
            return NextResponse.json(
                { message: 'BHYT chỉ được nhập "X" hoặc để trống' },
                { status: 400 }
            );
        }

        if (!nextDichVu.valid) {
            return NextResponse.json(
                { message: 'Dịch vụ chỉ được nhập "X" hoặc để trống' },
                { status: 400 }
            );
        }

        if (!nextBhyt.value && !nextDichVu.value) {
            return NextResponse.json(
                { message: "Phải đánh dấu X ở ít nhất một trong hai cột BHYT hoặc Dịch vụ" },
                { status: 400 }
            );
        }

        const mapping = await prisma.facilityDrugMap.update({
            where: { id },
            data: {
                maNoiBo: normalizeReportText(body.maNoiBo) || existingMapping.maNoiBo,
                tenThuocNoiBo: normalizeReportText(body.tenThuocNoiBo) || existingMapping.tenThuocNoiBo,
                hoatChatNoiBo: hasOwn(body, "hoatChatNoiBo") ? normalizeOptionalText(body.hoatChatNoiBo) : existingMapping.hoatChatNoiBo,
                soDangKyNoiBo: hasOwn(body, "soDangKyNoiBo") ? normalizeOptionalText(body.soDangKyNoiBo) : existingMapping.soDangKyNoiBo,
                donViTinhNoiBo: hasOwn(body, "donViTinhNoiBo") ? normalizeOptionalText(body.donViTinhNoiBo) : existingMapping.donViTinhNoiBo,
                giaVat: nextGiaVat.value,
                bhyt: nextBhyt.value,
                dichVu: nextDichVu.value,
                soQdTrungThau: hasOwn(body, "soQdTrungThau") ? normalizeOptionalText(body.soQdTrungThau) : existingMapping.soQdTrungThau,
                tenCongTy: hasOwn(body, "tenCongTy") ? normalizeOptionalText(body.tenCongTy) : existingMapping.tenCongTy,
                ngayBatDauHd: nextNgayBatDau.value,
                ngayKetThucHd: nextNgayKetThuc.value,
            },
        });

        logActivity({
            userId: session.user.id,
            action: ACTIONS.UPDATE,
            entityType: ENTITY_TYPES.MAPPING,
            entityId: id,
            details: {
                status: existingMapping.status,
                tenThuoc: mapping.tenThuocNoiBo,
                facilityName: existingMapping.facility?.facilityName,
            },
        });

        return NextResponse.json(mapping);
    } catch (error) {
        console.error("Error updating mapping:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
