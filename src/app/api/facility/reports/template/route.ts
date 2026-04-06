import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { auth } from "@/auth";
import { createFacilityReportRowToken } from "@/lib/facility-report-token";
import { buildFacilityReportTemplateRows, loadFacilityReportCanonicalContext } from "@/lib/facility-report-upload";
import { REPORT_ROW_TOKEN_COLUMN } from "@/lib/report-validation";

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

        const context = await loadFacilityReportCanonicalContext(session.user.id, month);
        const data = buildFacilityReportTemplateRows(context).map((row, index) => ({
            ...row,
            [REPORT_ROW_TOKEN_COLUMN]: createFacilityReportRowToken({
                facilityId: session.user.id,
                reportMonth: month,
                mapId: context.rows[index].mapId,
            }),
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        worksheet["!cols"] = [
            { wch: 5 },
            { wch: 15 },
            { wch: 15 },
            { wch: 30 },
            { wch: 20 },
            { wch: 10 },
            { wch: 10 },
            { wch: 10 },
            { wch: 10 },
            { wch: 10 },
            { wch: 10 },
            { wch: 18 },
            { wch: 18 },
            { wch: 25 },
            { wch: 15 },
            { wch: 15 },
            { wch: 8 },
            { wch: 8 },
            { wch: 24 },
            { wch: 40, hidden: true },
        ];

        const lastRow = data.length + 1;
        const bhytValidation = {
            type: "list",
            allowBlank: true,
            formula1: '"X"',
            showDropDown: true,
            error: 'Chỉ được nhập "X" hoặc để trống',
            errorTitle: "Giá trị không hợp lệ",
        };

        const dichVuValidation = {
            type: "list",
            allowBlank: true,
            formula1: '"X"',
            showDropDown: true,
            error: 'Chỉ được nhập "X" hoặc để trống',
            errorTitle: "Giá trị không hợp lệ",
        };

        if (!worksheet["!dataValidation"]) {
            worksheet["!dataValidation"] = [];
        }

        worksheet["!dataValidation"].push({
            ref: `Q2:Q${lastRow}`,
            ...bhytValidation,
        });
        worksheet["!dataValidation"].push({
            ref: `R2:R${lastRow}`,
            ...dichVuValidation,
        });

        const instructions = [
            {
                "Tên trường": "Cột nhận diện thuốc",
                "Kiểu dữ liệu": "Văn bản",
                "Định dạng/Ví dụ": "Mã nội bộ / Mã thuốc / Tên thuốc / Hoạt chất / Đơn vị tính",
                "Ghi chú": "Không chỉnh sửa các cột nhận diện. Nếu thay đổi, hệ thống sẽ từ chối toàn bộ file.",
            },
            {
                "Tên trường": "Xóa dòng",
                "Kiểu dữ liệu": "Thao tác",
                "Định dạng/Ví dụ": "Xóa hẳn một dòng",
                "Ghi chú": "Được phép xóa hẳn dòng không muốn báo cáo. Hệ thống sẽ bỏ qua các dòng đã xóa.",
            },
            {
                "Tên trường": "Mẫu cũ",
                "Kiểu dữ liệu": "Lưu ý",
                "Định dạng/Ví dụ": "File không có cột khóa dòng",
                "Ghi chú": "Các file mẫu cũ sẽ bị từ chối. Luôn tải lại mẫu mới cho đúng tháng trước khi nhập dữ liệu.",
            },
            {
                "Tên trường": "Tồn đầu",
                "Kiểu dữ liệu": "Số",
                "Định dạng/Ví dụ": "100",
                "Ghi chú": "Số lượng tồn kho đầu kỳ, mặc định bằng Tồn cuối tháng trước khi có dữ liệu.",
            },
            {
                "Tên trường": "Nhập trong kỳ",
                "Kiểu dữ liệu": "Số",
                "Định dạng/Ví dụ": "50",
                "Ghi chú": "Số lượng nhập trong kỳ báo cáo.",
            },
            {
                "Tên trường": "Xuất trong kỳ",
                "Kiểu dữ liệu": "Số",
                "Định dạng/Ví dụ": "30",
                "Ghi chú": "Số lượng xuất trong kỳ báo cáo.",
            },
            {
                "Tên trường": "Tồn cuối",
                "Kiểu dữ liệu": "Số",
                "Định dạng/Ví dụ": "120",
                "Ghi chú": "Công thức: Tồn đầu + Nhập trong kỳ - Xuất trong kỳ.",
            },
            {
                "Tên trường": "Giá VAT",
                "Kiểu dữ liệu": "Số",
                "Định dạng/Ví dụ": "25000",
                "Ghi chú": "Đơn giá bao gồm VAT, không được nhập âm.",
            },
            {
                "Tên trường": "Thành tiền tồn cuối",
                "Kiểu dữ liệu": "Số",
                "Định dạng/Ví dụ": "3000000",
                "Ghi chú": "Công thức: Tồn cuối × Giá VAT.",
            },
            {
                "Tên trường": "Số QĐ trúng thầu",
                "Kiểu dữ liệu": "Văn bản",
                "Định dạng/Ví dụ": "123/QĐ-BYT",
                "Ghi chú": "Để trống nếu không có.",
            },
            {
                "Tên trường": "Tên Công ty",
                "Kiểu dữ liệu": "Văn bản",
                "Định dạng/Ví dụ": "Công ty TNHH ABC",
                "Ghi chú": "Tên công ty cung cấp thuốc.",
            },
            {
                "Tên trường": "Ngày bắt đầu HĐ",
                "Kiểu dữ liệu": "Văn bản",
                "Định dạng/Ví dụ": "20260101",
                "Ghi chú": "Định dạng YYYYMMDD. Để trống nếu không có.",
            },
            {
                "Tên trường": "Ngày kết thúc HĐ",
                "Kiểu dữ liệu": "Văn bản",
                "Định dạng/Ví dụ": "20261231",
                "Ghi chú": "Định dạng YYYYMMDD. Không được nhỏ hơn Ngày bắt đầu HĐ.",
            },
            {
                "Tên trường": "BHYT",
                "Kiểu dữ liệu": "Văn bản",
                "Định dạng/Ví dụ": "X",
                "Ghi chú": "Chỉ nhập X hoặc để trống.",
            },
            {
                "Tên trường": "Dịch vụ",
                "Kiểu dữ liệu": "Văn bản",
                "Định dạng/Ví dụ": "X",
                "Ghi chú": "Chỉ nhập X hoặc để trống. Phải có ít nhất một trong hai cột BHYT hoặc Dịch vụ.",
            },
        ];

        const instructionSheet = XLSX.utils.json_to_sheet(instructions);
        instructionSheet["!cols"] = [
            { wch: 24 },
            { wch: 18 },
            { wch: 42 },
            { wch: 90 },
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "BaoCao");
        XLSX.utils.book_append_sheet(workbook, instructionSheet, "Hướng dẫn");

        if (!workbook.Workbook) workbook.Workbook = {};
        if (!workbook.Workbook.Views) workbook.Workbook.Views = [];
        // @ts-expect-error xlsx typings do not expose activeTab but Excel supports it
        workbook.Workbook.Views[0] = { activeTab: 0 };

        const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
        return new NextResponse(buffer, {
            status: 200,
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="bao_cao_${month.replace("/", "_")}.xlsx"`,
            },
        });
    } catch (error) {
        console.error("Error generating facility report template:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
