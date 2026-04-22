import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import * as XLSX from "xlsx";
import {
    getFacilityOwnedThongBaoMoiThauById,
    isRouteError,
    requireActiveSessionUser,
} from "@/lib/server-authz";

const buildAttachmentDisposition = (fileName: string) => {
    const asciiFallback = fileName
        .normalize("NFKD")
        .replace(/[^\x20-\x7E]/g, "")
        .replace(/[/\\?%*:|"<>]/g, "_")
        .replace(/\s+/g, "_")
        .replace(/_+/g, "_")
        .trim() || "Ket_Qua_LCNT.xlsx";

    return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
};

const handleRouteError = (error: unknown, context: string) => {
    if (isRouteError(error)) {
        return NextResponse.json({ message: error.message }, { status: error.status });
    }

    console.error(context, error);
    return NextResponse.json(
        { message: "Internal server error" },
        { status: 500 }
    );
};

const serializeExcelNumber = (value: { toString(): string } | number | null | undefined) => {
    if (value === null || value === undefined) {
        return "";
    }

    return Number(value);
};

// GET /api/facility/ket-qua-lcnt/[tbmtId]/template
// Generate Excel template with existing PhanLo data
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ tbmtId: string }> }
) {
    try {
        void req;
        const { user } = await requireActiveSessionUser("FACILITY");

        const { tbmtId } = await params;
        const ownedTbmt = await getFacilityOwnedThongBaoMoiThauById(tbmtId, user.id);

        // Get TBMT and related package and lots
        const tbmt = await prisma.thongBaoMoiThau.findUnique({
            where: { id: ownedTbmt.id },
            include: {
                goiThau: {
                    include: {
                        phanLos: {
                            orderBy: {
                                stt: "asc",
                            },
                        },
                    },
                },
            },
        });

        if (!tbmt) {
            return NextResponse.json(
                { message: "Thông báo mời thầu not found" },
                { status: 404 }
            );
        }

        // Prepare Excel data with lot information + new fields for results
        const excelData = tbmt.goiThau.phanLos.map((phanLo) => ({
            STT: phanLo.stt,
            "Tên phần lô": phanLo.tenPhanLo,
            "Đơn vị tính": phanLo.donViTinh || "",
            "Số lượng": serializeExcelNumber(phanLo.soLuong),
            "Đơn giá": serializeExcelNumber(phanLo.donGia),
            "Thành tiền": serializeExcelNumber(phanLo.thanhTien),
            "Thời gian thực hiện gói thầu": phanLo.thoiGianThucHien || "",
            "Đơn vị tính TGTHHGT": phanLo.donViTinhThoiGian || "",
            "Kết quả": "", // Empty for user to fill
            "Đơn giá trúng thầu": "", // Empty for user to fill
            "Nhà thầu trúng thầu": "", // Empty for user to fill
            "ID phần lô (không sửa)": phanLo.id,
        }));

        // Generate Excel file
        const ws = XLSX.utils.json_to_sheet(excelData);

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Kết quả LCNT");

        // Write to buffer
        const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
        const fileName = `Ket_Qua_LCNT_${tbmt.maTBMT}.xlsx`;

        // Return as file download
        return new NextResponse(buffer, {
            status: 200,
            headers: {
                "Content-Type":
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": buildAttachmentDisposition(fileName),
            },
        });
    } catch (error: unknown) {
        return handleRouteError(error, "Error generating template:");
    }
}
