import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
    assertPhanLoIdsBelongToGoiThau,
    getFacilityOwnedGoiThau,
    getFacilityOwnedThongBaoMoiThauById,
    isRouteError,
    requireActiveSessionUser,
    RouteError,
} from "@/lib/server-authz";

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

const safeParseInt = (val: unknown): number | undefined => {
    if (val === null || val === undefined || val === "") {
        return undefined;
    }

    const parsed = parseInt(String(val), 10);
    return Number.isNaN(parsed) ? undefined : parsed;
};

const safeParseFloat = (val: unknown): number | undefined => {
    if (val === null || val === undefined || val === "") {
        return undefined;
    }

    const parsed = parseFloat(String(val));
    return Number.isNaN(parsed) ? undefined : parsed;
};

const safeParseNullableFloat = (val: unknown): number | null => {
    const parsed = safeParseFloat(val);
    return parsed === undefined ? null : parsed;
};

const normalizeString = (value: unknown) =>
    typeof value === "string" ? value.trim() : "";

const normalizeOptionalString = (value: unknown) => {
    const normalized = normalizeString(value);
    return normalized === "" ? null : normalized;
};

const requireValidKetQuaPhanLos = (ketQuaPhanLos: KetQuaPhanLoInput[] | undefined) => {
    if (!Array.isArray(ketQuaPhanLos) || ketQuaPhanLos.length === 0) {
        throw new RouteError(400, "Thiếu dữ liệu phần lô từ file Excel");
    }

    const validKetQuaPhanLos = ketQuaPhanLos.filter(
        (kqpl): kqpl is KetQuaPhanLoInput & { phanLoGoiThauId: string } =>
            typeof kqpl.phanLoGoiThauId === "string"
            && kqpl.phanLoGoiThauId.trim().length > 0
    );

    if (validKetQuaPhanLos.length !== ketQuaPhanLos.length) {
        throw new RouteError(
            400,
            "File Excel không hợp lệ: thiếu ID phần lô. Hãy tải lại file mẫu mới."
        );
    }

    return validKetQuaPhanLos;
};

interface KetQuaPhanLoInput {
    phanLoGoiThauId?: string;
    ketQua?: string;
    donGiaTrungThau?: number | string | null;
    nhaThauTrungThau?: string | null;
}

interface KetQuaLCNTRequestBody {
    goiThauId?: string;
    thongBaoMoiThauId?: string;
    soQdPheDuyetKQLCNT?: string;
    ngayPheDuyetKQLCNT?: string;
    soMatHangMoiThau?: number | string | null;
    soMatHangTrungThau?: number | string | null;
    tongGiaTriTrungThau?: number | string | null;
    ketQuaPhanLos?: KetQuaPhanLoInput[];
}

// GET /api/facility/ket-qua-lcnt
// List all Process 1 KHLCNT plans with TBMT information
export async function GET(req: NextRequest) {
    try {
        void req;
        const { user } = await requireActiveSessionUser("FACILITY");

        const keHoachList = await prisma.keHoachLCNT.findMany({
            where: {
                facilityId: user.id,
                quyTrinh: 1, // Only Process 1 (Bidding Law)
            },
            include: {
                goiThaus: {
                    include: {
                        thongBaoMoiThaus: {
                            include: {
                                // Include existing results so frontend can determine if a TBMT already has results
                                ketQuaLCNTs: { select: { id: true } }
                            }
                        },
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        // Flatten to show each TBMT as a separate row
        const result = keHoachList.flatMap((kh) =>
            kh.goiThaus.flatMap((gt) =>
                gt.thongBaoMoiThaus.map((tbmt) => ({
                    id: kh.id,
                    maKHLCNT: kh.maKHLCNT,
                    tenKHLCNT: kh.tenKHLCNT,
                    goiThauId: gt.id,
                    tenGoiThau: gt.tenGoiThau,
                    tbmtId: tbmt.id,
                    maTBMT: tbmt.maTBMT,
                    ngayDangTaiTBMT: tbmt.ngayDangTai,
                }))
            )
        );

        return NextResponse.json(result);
    } catch (error: unknown) {
        return handleRouteError(error, "Error fetching ket qua LCNT list:");
    }
}

// POST /api/facility/ket-qua-lcnt
// Create new LCNT results
export async function POST(req: NextRequest) {
    try {
        const { user } = await requireActiveSessionUser("FACILITY");

        const body = await req.json() as KetQuaLCNTRequestBody;
        const {
            goiThauId,
            thongBaoMoiThauId,
            soQdPheDuyetKQLCNT,
            ngayPheDuyetKQLCNT,
            soMatHangMoiThau,
            soMatHangTrungThau,
            tongGiaTriTrungThau,
            ketQuaPhanLos,
        } = body;
        const resolvedSoQdPheDuyetKQLCNT = normalizeString(soQdPheDuyetKQLCNT);
        const resolvedNgayPheDuyetKQLCNT = normalizeString(ngayPheDuyetKQLCNT);

        // Log received data for debugging
        console.log("Received LCNT result data:", {
            goiThauId,
            thongBaoMoiThauId,
            soQdPheDuyetKQLCNT: resolvedSoQdPheDuyetKQLCNT,
            ngayPheDuyetKQLCNT: resolvedNgayPheDuyetKQLCNT,
            hasKetQuaPhanLos: Array.isArray(ketQuaPhanLos),
            ketQuaPhanLosCount: ketQuaPhanLos?.length || 0,
        });

        // Validate required fields
        const missingFields = [];
        if (!goiThauId) missingFields.push("goiThauId");
        if (!thongBaoMoiThauId) missingFields.push("thongBaoMoiThauId");
        if (!resolvedSoQdPheDuyetKQLCNT) missingFields.push("soQdPheDuyetKQLCNT");
        if (!resolvedNgayPheDuyetKQLCNT) missingFields.push("ngayPheDuyetKQLCNT");

        if (missingFields.length > 0) {
            console.error("Missing required fields:", missingFields);
            return NextResponse.json(
                { message: `Missing required fields: ${missingFields.join(", ")}` },
                { status: 400 }
            );
        }

        const resolvedGoiThauId = goiThauId as string;
        const resolvedThongBaoMoiThauId = thongBaoMoiThauId as string;

        // Filter out lot results with missing phanLoGoiThauId
        const validKetQuaPhanLos = requireValidKetQuaPhanLos(ketQuaPhanLos);
        const goiThau = await getFacilityOwnedGoiThau(resolvedGoiThauId, user.id);
        const thongBaoMoiThau = await getFacilityOwnedThongBaoMoiThauById(resolvedThongBaoMoiThauId, user.id);

        if (thongBaoMoiThau.goiThauId !== goiThau.id) {
            throw new RouteError(400, "TBMT không thuộc gói thầu hiện tại");
        }

        await assertPhanLoIdsBelongToGoiThau(
            validKetQuaPhanLos.map((kqpl) => kqpl.phanLoGoiThauId),
            goiThau.id
        );

        // Create KetQuaLCNT with related KetQuaPhanLo
        const result = await prisma.ketQuaLCNT.create({
            data: {
                goiThauId: goiThau.id,
                thongBaoMoiThauId: thongBaoMoiThau.id,
                soQdPheDuyetKQLCNT: resolvedSoQdPheDuyetKQLCNT,
                ngayPheDuyetKQLCNT: new Date(resolvedNgayPheDuyetKQLCNT),
                soMatHangMoiThau: safeParseInt(soMatHangMoiThau) ?? 0,
                soMatHangTrungThau: safeParseInt(soMatHangTrungThau) ?? 0,
                tongGiaTriTrungThau: safeParseFloat(tongGiaTriTrungThau) ?? 0,
                ketQuaPhanLos: {
                    create: validKetQuaPhanLos.map((kqpl) => ({
                        phanLoGoiThauId: kqpl.phanLoGoiThauId,
                        ketQua: normalizeString(kqpl.ketQua),
                        donGiaTrungThau: safeParseNullableFloat(kqpl.donGiaTrungThau),
                        nhaThauTrungThau: normalizeOptionalString(kqpl.nhaThauTrungThau),
                    })),
                },
            },
            include: {
                ketQuaPhanLos: true,
            },
        });

        return NextResponse.json(result, { status: 201 });
    } catch (error: unknown) {
        return handleRouteError(error, "Error creating ket qua LCNT:");
    }
}
