
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import * as XLSX from "xlsx";

export async function GET(request: Request) {
    try {
        const session = await auth();
        if (!session || session.user.role !== "FACILITY") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const month = searchParams.get("month");

        if (!month) {
            return NextResponse.json({ message: "Missing month parameter" }, { status: 400 });
        }

        // Get approved mappings
        const mappings = await prisma.facilityDrugMap.findMany({
            where: {
                facilityId: session.user.id,
                status: {
                    in: ["APPROVED", "AUTO_MAPPED"]
                }
            },
            include: {
                masterDrug: true
            },
            orderBy: {
                tenThuocNoiBo: 'asc'
            }
        });

        // Calculate previous month
        const [currentMonth, currentYear] = month.split('/').map(Number);
        const prevDate = new Date(currentYear, currentMonth - 2, 1); // month is 1-indexed, so -2 to get previous
        const prevMonth = `${String(prevDate.getMonth() + 1).padStart(2, '0')}/${prevDate.getFullYear()}`;

        // Get previous month's reports for this facility
        const previousReports = await prisma.inventoryReport.findMany({
            where: {
                facilityId: session.user.id,
                reportMonth: prevMonth
            },
            select: {
                mapId: true,
                tonCuoi: true,
                giaVat: true,
                soQdTrungThau: true,
                tenCongTy: true,
                ngayBatDauHd: true,
                ngayKetThucHd: true,
                bhyt: true,
                dichVu: true
            }
        });

        // Build lookup map: mapId -> previous report data
        const prevReportMap = new Map(previousReports.map(r => [r.mapId, r]));

        // Format data for Excel
        const data = mappings.map((m, index) => {
            const prevReport = prevReportMap.get(m.id);
            return {
                "STT": index + 1,
                "Mã nội bộ": m.maNoiBo,
                "Mã thuốc": m.masterDrug?.maChung || m.maNoiBo,
                "Tên thuốc": m.masterDrug?.tenThuoc || m.tenThuocNoiBo,
                "Hoạt chất": m.masterDrug?.hoatChat || m.hoatChatNoiBo,
                "Đơn vị tính": m.masterDrug?.donViTinh || m.donViTinhNoiBo,
                "Tồn đầu": prevReport ? Number(prevReport.tonCuoi) : 0,
                "Nhập trong kỳ": 0,
                "Xuất trong kỳ": 0,
                "Tồn cuối": 0,
                "Giá VAT": prevReport ? Number(prevReport.giaVat) : 0,
                "Thành tiền tồn cuối": 0,
                "Số QĐ trúng thầu": prevReport?.soQdTrungThau || "",
                "Tên Công ty": prevReport?.tenCongTy || "",
                "Ngày bắt đầu HĐ": prevReport?.ngayBatDauHd || "",
                "Ngày kết thúc HĐ": prevReport?.ngayKetThucHd || "",
                "BHYT": prevReport?.bhyt || "",
                "Dịch vụ": prevReport?.dichVu || "",
                "Ghi chú": ""
            };
        });

        // Create workbook
        const worksheet = XLSX.utils.json_to_sheet(data);

        // Set column widths
        const wscols = [
            { wch: 5 },  // STT
            { wch: 15 }, // Ma noi bo
            { wch: 15 }, // Ma thuoc
            { wch: 30 }, // Ten thuoc
            { wch: 20 }, // Hoat chat
            { wch: 10 }, // DVT
            { wch: 10 }, // Ton dau
            { wch: 10 }, // Nhap
            { wch: 10 }, // Xuat
            { wch: 10 }, // Ton cuoi
            { wch: 10 }, // Gia VAT
            { wch: 18 }, // Thanh tien ton cuoi
            { wch: 18 }, // So QD trung thau
            { wch: 25 }, // Ten Cong ty
            { wch: 15 }, // Ngay bat dau HD
            { wch: 15 }, // Ngay ket thuc HD
            { wch: 8 },  // BHYT
            { wch: 8 },  // Dich vu
            { wch: 20 }, // Ghi chu
        ];
        worksheet['!cols'] = wscols;

        // Add data validation for BHXH (column Q, index 16) and Dịch vụ (column R, index 17)
        // Note: Excel column indices start at 1, row indices start at 1
        const lastRow = data.length + 1; // +1 because row 1 is header

        // Create data validation for BHXH column (Q)
        const bhxhValidation = {
            type: 'list',
            allowBlank: true,
            formula1: '"X"',
            showDropDown: true,
            error: 'Chỉ được nhập "X" hoặc để trống',
            errorTitle: 'Giá trị không hợp lệ'
        };

        // Create data validation for Dịch vụ column (R)
        const dichVuValidation = {
            type: 'list',
            allowBlank: true,
            formula1: '"X"',
            showDropDown: true,
            error: 'Chỉ được nhập "X" hoặc để trống',
            errorTitle: 'Giá trị không hợp lệ'
        };

        // Apply validation to each cell in BHXH and Dịch vụ columns
        if (!worksheet['!dataValidation']) {
            worksheet['!dataValidation'] = [];
        }

        // Add validation for BHXH column (Q2:Q{lastRow})
        worksheet['!dataValidation'].push({
            ref: `Q2:Q${lastRow}`,
            ...bhxhValidation
        });

        // Add validation for Dịch vụ column (R2:R{lastRow})
        worksheet['!dataValidation'].push({
            ref: `R2:R${lastRow}`,
            ...dichVuValidation
        });

        // Create instruction sheet
        const instructions = [
            {
                "Tên trường": "Tồn đầu",
                "Kiểu dữ liệu": "Số",
                "Định dạng/Ví dụ": "100",
                "Ghi chú": "Số lượng tồn kho đầu kỳ (tự động = Tồn cuối tháng trước)"
            },
            {
                "Tên trường": "Nhập trong kỳ",
                "Kiểu dữ liệu": "Số",
                "Định dạng/Ví dụ": "50",
                "Ghi chú": "Số lượng nhập trong kỳ báo cáo"
            },
            {
                "Tên trường": "Xuất trong kỳ",
                "Kiểu dữ liệu": "Số",
                "Định dạng/Ví dụ": "30",
                "Ghi chú": "Số lượng xuất trong kỳ báo cáo"
            },
            {
                "Tên trường": "Tồn cuối",
                "Kiểu dữ liệu": "Số",
                "Định dạng/Ví dụ": "120",
                "Ghi chú": "Công thức: Tồn đầu + Nhập trong kỳ - Xuất trong kỳ"
            },
            {
                "Tên trường": "Giá VAT",
                "Kiểu dữ liệu": "Số",
                "Định dạng/Ví dụ": "25000",
                "Ghi chú": "Đơn giá bao gồm thuế VAT (đồng)"
            },
            {
                "Tên trường": "Thành tiền tồn cuối",
                "Kiểu dữ liệu": "Số",
                "Định dạng/Ví dụ": "3000000",
                "Ghi chú": "Công thức: Tồn cuối × Giá VAT"
            },
            {
                "Tên trường": "Số QĐ trúng thầu",
                "Kiểu dữ liệu": "Văn bản",
                "Định dạng/Ví dụ": "123/QĐ-BYT",
                "Ghi chú": "Số quyết định trúng thầu (nếu có), để trống nếu không có"
            },
            {
                "Tên trường": "Tên Công ty",
                "Kiểu dữ liệu": "Văn bản",
                "Định dạng/Ví dụ": "Công ty TNHH ABC",
                "Ghi chú": "Tên công ty cung cấp thuốc"
            },
            {
                "Tên trường": "Ngày bắt đầu HĐ",
                "Kiểu dữ liệu": "Văn bản",
                "Định dạng/Ví dụ": "20260101",
                "Ghi chú": "Định dạng: YYYYMMDD (Năm Tháng Ngày không có dấu gạch ngang)"
            },
            {
                "Tên trường": "Ngày kết thúc HĐ",
                "Kiểu dữ liệu": "Văn bản",
                "Định dạng/Ví dụ": "20261231",
                "Ghi chú": "Định dạng: YYYYMMDD (Năm Tháng Ngày không có dấu gạch ngang)"
            },
            {
                "Tên trường": "BHXH",
                "Kiểu dữ liệu": "Văn bản",
                "Định dạng/Ví dụ": "X",
                "Ghi chú": "Chỉ nhập chữ 'X' (HOA hoặc thường) nếu thuộc BHXH, để trống nếu không"
            },
            {
                "Tên trường": "Dịch vụ",
                "Kiểu dữ liệu": "Văn bản",
                "Định dạng/Ví dụ": "X",
                "Ghi chú": "Chỉ nhập chữ 'X' (HOA hoặc thường) nếu có dịch vụ, để trống nếu không"
            }
        ];

        const instructionSheet = XLSX.utils.json_to_sheet(instructions);

        // Set column widths for instruction sheet
        const instructionCols = [
            { wch: 20 }, // Tên trường
            { wch: 15 }, // Kiểu dữ liệu
            { wch: 20 }, // Định dạng/Ví dụ
            { wch: 70 }  // Ghi chú
        ];
        instructionSheet['!cols'] = instructionCols;

        const workbook = XLSX.utils.book_new();

        // Add BaoCao sheet first (main data sheet)
        XLSX.utils.book_append_sheet(workbook, worksheet, "BaoCao");

        // Add instruction sheet second
        XLSX.utils.book_append_sheet(workbook, instructionSheet, "Hướng dẫn");

        // Set BaoCao as the active sheet (sheet index 0)
        if (!workbook.Workbook) workbook.Workbook = {};
        if (!workbook.Workbook.Views) workbook.Workbook.Views = [];
        // @ts-ignore - activeTab is valid in Excel but not in XLSX type definitions
        workbook.Workbook.Views[0] = { activeTab: 0 };

        // Write to buffer
        const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

        // Return response
        return new NextResponse(buffer, {
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="bao_cao_${month.replace("/", "_")}.xlsx"`,
            },
        });

    } catch (error) {
        console.error("Error generating report template:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
