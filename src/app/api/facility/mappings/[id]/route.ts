import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import {
    compareReportDates,
    isCategoryMarked,
    normalizeReportText,
    parseReportDateValue,
    parseStrictNumber,
} from "@/lib/report-validation";

// Statuses that facility cannot edit
const LOCKED_STATUSES = ["WAITING_APPROVAL", "APPROVED"];

const normalizeOptionalText = (value: unknown) => {
    if (value === null || value === undefined) return null;
    const normalized = String(value).trim().replace(/\s+/g, " ");
    return normalized || null;
};

const hasOwn = (body: Record<string, unknown>, key: string) =>
    Object.prototype.hasOwnProperty.call(body, key);

const DEMAND_ROUNDING_KEYS = [
    "demandRoundingEnabled",
    "demandPackageUnit",
    "demandPackageSize",
];

const isDemandRoundingOnlyUpdate = (body: Record<string, unknown>) => {
    const keys = Object.keys(body);
    return keys.length > 0 && keys.every((key) => DEMAND_ROUNDING_KEYS.includes(key));
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

const normalizeOptionalPositiveNumber = (value: unknown) => {
    if (value === null || value === undefined || String(value).trim() === "") {
        return { value: null, valid: true };
    }

    const parsed = parseStrictNumber(value);
    return {
        value: parsed.value,
        valid: parsed.valid && !parsed.blank && parsed.value > 0,
    };
};

const normalizeOptionalCategory = (value: unknown) => {
    const normalized = normalizeReportText(value);
    if (!normalized) return { value: null, valid: true };
    return { value: isCategoryMarked(normalized) ? "X" : normalized, valid: isCategoryMarked(normalized) };
};

// PATCH update mapping
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
        const body = await request.json() as any;

        // Verify ownership
        const mapping = await prisma.facilityDrugMap.findFirst({
            where: { id, facilityId: session.user.id },
        });

        if (!mapping) {
            return NextResponse.json({ message: "Mapping not found" }, { status: 404 });
        }

        // Block edit when mapping is locked (submitted for approval or already approved)
        const demandRoundingOnlyUpdate = isDemandRoundingOnlyUpdate(body);

        if (LOCKED_STATUSES.includes(mapping.status) && !demandRoundingOnlyUpdate) {
            return NextResponse.json(
                {
                    message:
                        mapping.status === "WAITING_APPROVAL"
                            ? "Không thể chỉnh sửa thuốc đang chờ duyệt. Vui lòng thu hồi yêu cầu trước khi sửa."
                            : "Không thể chỉnh sửa thuốc đã được duyệt.",
                },
                { status: 403 }
            );
        }

        const nextNgayBatDau = hasOwn(body, "ngayBatDauHd")
            ? normalizeOptionalDate(body.ngayBatDauHd)
            : { value: mapping.ngayBatDauHd, valid: true };
        const nextNgayKetThuc = hasOwn(body, "ngayKetThucHd")
            ? normalizeOptionalDate(body.ngayKetThucHd)
            : { value: mapping.ngayKetThucHd, valid: true };

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
            : { value: Number(mapping.giaVat), valid: true, blank: false, negative: false };
        const nextBhyt = hasOwn(body, "bhyt")
            ? normalizeOptionalCategory(body.bhyt)
            : { value: mapping.bhyt, valid: true };
        const nextDichVu = hasOwn(body, "dichVu")
            ? normalizeOptionalCategory(body.dichVu)
            : { value: mapping.dichVu, valid: true };

        if (!demandRoundingOnlyUpdate && !nextGiaVat.valid) {
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

        if (!demandRoundingOnlyUpdate && !nextBhyt.valid) {
            return NextResponse.json(
                { message: 'BHYT chỉ được nhập "X" hoặc để trống' },
                { status: 400 }
            );
        }

        if (!demandRoundingOnlyUpdate && !nextDichVu.valid) {
            return NextResponse.json(
                { message: 'Dịch vụ chỉ được nhập "X" hoặc để trống' },
                { status: 400 }
            );
        }

        if (!demandRoundingOnlyUpdate && !nextBhyt.value && !nextDichVu.value) {
            return NextResponse.json(
                { message: "Phải đánh dấu X ở ít nhất một trong hai cột BHYT hoặc Dịch vụ" },
                { status: 400 }
            );
        }

        const nextDemandRoundingEnabled = hasOwn(body, "demandRoundingEnabled")
            ? Boolean(body.demandRoundingEnabled)
            : mapping.demandRoundingEnabled;
        const nextDemandPackageUnit = hasOwn(body, "demandPackageUnit")
            ? normalizeOptionalText(body.demandPackageUnit)
            : mapping.demandPackageUnit;
        const nextDemandPackageSize = hasOwn(body, "demandPackageSize")
            ? normalizeOptionalPositiveNumber(body.demandPackageSize)
            : {
                value: mapping.demandPackageSize === null
                    ? null
                    : Number(mapping.demandPackageSize),
                valid: true,
            };

        if (!nextDemandPackageSize.valid) {
            return NextResponse.json(
                { message: "Số lượng trong 1 quy cách dự trù phải lớn hơn 0" },
                { status: 400 }
            );
        }

        if (
            nextDemandRoundingEnabled &&
            (!nextDemandPackageUnit || nextDemandPackageSize.value === null)
        ) {
            return NextResponse.json(
                { message: "Vui lòng nhập đơn vị quy cách và số lượng quy đổi khi bật làm tròn dự trù" },
                { status: 400 }
            );
        }

        const updated = await prisma.facilityDrugMap.update({
            where: { id },
            data: {
                masterDrugId: body.masterDrugId !== undefined ? body.masterDrugId : mapping.masterDrugId,
                isOutOfCatalog: body.isOutOfCatalog !== undefined ? body.isOutOfCatalog : mapping.isOutOfCatalog,
                status: body.status || mapping.status,
                // Allow updating internal fields if needed (e.g. correcting typo)
                maNoiBo: body.maNoiBo || mapping.maNoiBo,
                tenThuocNoiBo: body.tenThuocNoiBo || mapping.tenThuocNoiBo,
                hoatChatNoiBo: body.hoatChatNoiBo !== undefined ? body.hoatChatNoiBo : mapping.hoatChatNoiBo,
                soDangKyNoiBo: body.soDangKyNoiBo !== undefined ? body.soDangKyNoiBo : mapping.soDangKyNoiBo,
                donViTinhNoiBo: body.donViTinhNoiBo !== undefined ? body.donViTinhNoiBo : mapping.donViTinhNoiBo,
                giaVat: nextGiaVat.value,
                bhyt: nextBhyt.value,
                dichVu: nextDichVu.value,
                soQdTrungThau: hasOwn(body, "soQdTrungThau") ? normalizeOptionalText(body.soQdTrungThau) : mapping.soQdTrungThau,
                tenCongTy: hasOwn(body, "tenCongTy") ? normalizeOptionalText(body.tenCongTy) : mapping.tenCongTy,
                ngayBatDauHd: nextNgayBatDau.value,
                ngayKetThucHd: nextNgayKetThuc.value,
                demandRoundingEnabled: nextDemandRoundingEnabled,
                demandPackageUnit: nextDemandPackageUnit,
                demandPackageSize: nextDemandPackageSize.value,
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Error updating mapping:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

// DELETE a mapping (only if deletable status)
export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session || session.user.role !== "FACILITY") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        const mapping = await prisma.facilityDrugMap.findFirst({
            where: { id, facilityId: session.user.id },
        });

        if (!mapping) {
            return NextResponse.json({ message: "Mapping not found" }, { status: 404 });
        }

        if (mapping.status === "WAITING_APPROVAL") {
            return NextResponse.json(
                {
                    message: "Không thể xóa thuốc đang chờ duyệt. Vui lòng thu hồi yêu cầu trước.",
                },
                { status: 403 }
            );
        }

        if (mapping.status === "APPROVED" || mapping.status === "AUTO_MAPPED") {
            const reportCount = await prisma.inventoryReport.count({
                where: {
                    facilityId: session.user.id,
                    mapId: mapping.id,
                },
            });

            if (reportCount > 0) {
                return NextResponse.json(
                    {
                        message:
                            "Không thể xóa thuốc đã có báo cáo xuất-nhập-tồn. Vui lòng ngừng sử dụng nếu không tiếp tục báo cáo.",
                    },
                    { status: 403 }
                );
            }
        }

        await prisma.facilityDrugMap.delete({ where: { id } });
        return NextResponse.json({ message: "Deleted successfully" });
    } catch (error) {
        console.error("Error deleting mapping:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
