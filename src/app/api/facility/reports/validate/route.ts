import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
    buildFacilityReportValidationResponse,
    loadFacilityReportCanonicalContext,
    validateFacilityReportRows,
} from "@/lib/facility-report-upload";

export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session || session.user.role !== "FACILITY") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { month, data } = body;

        if (!month || !Array.isArray(data)) {
            return NextResponse.json({ message: "Invalid data format" }, { status: 400 });
        }

        const context = await loadFacilityReportCanonicalContext(session.user.id, month);
        const result = validateFacilityReportRows(data, context);

        if (!result.ok) {
            return NextResponse.json(buildFacilityReportValidationResponse(result), { status: 400 });
        }

        return NextResponse.json({
            message: "Dữ liệu hợp lệ",
            summary: result.summary,
        });
    } catch (error) {
        console.error("Error validating facility report:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
