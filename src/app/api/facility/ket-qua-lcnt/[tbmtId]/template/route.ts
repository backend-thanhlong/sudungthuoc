import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import * as XLSX from "xlsx";

// GET /api/facility/ket-qua-lcnt/[tbmtId]/template
// Generate Excel template with existing PhanLo data
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ tbmtId: string }> }
) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        if (session.user.role !== "FACILITY") {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        const { tbmtId } = await params;

        // Get TBMT and related package and lots
        const tbmt = await prisma.thongBaoMoiThau.findUnique({
            where: { id: tbmtId },
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
            "Số lượng": phanLo.soLuong ? Number(phanLo.soLuong) : 0,
            "Đơn giá": phanLo.donGia ? Number(phanLo.donGia) : 0,
            "Thành tiền": phanLo.thanhTien ? Number(phanLo.thanhTien) : 0,
            "Thời gian thực hiện gói thầu": phanLo.thoiGianThucHien || "",
            "Đơn vị tính TGTHHGT": phanLo.donViTinhThoiGian || "",
            "Kết quả": "", // Empty for user to fill
            "Đơn giá trúng thầu": "", // Empty for user to fill
            "Nhà thầu trúng thầu": "", // Empty for user to fill
            "_phanLoId": phanLo.id, // Hidden field for reference
        }));

        // Generate Excel file
        const ws = XLSX.utils.json_to_sheet(excelData);

        // Hide the _phanLoId column
        if (!ws["!cols"]) ws["!cols"] = [];
        ws["!cols"][11] = { hidden: true };

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Kết quả LCNT");

        // Write to buffer
        const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

        // Return as file download
        return new NextResponse(buffer, {
            status: 200,
            headers: {
                "Content-Type":
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="Ket_Qua_LCNT_${tbmt.maTBMT}.xlsx"`,
            },
        });
    } catch (error) {
        console.error("Error generating template:", error);
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        );
    }
}
