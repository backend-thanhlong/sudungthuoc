import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
    assertPhanLoIdsBelongToGoiThau,
    getFacilityOwnedGoiThau,
    getFacilityOwnedKetQuaLCNTByGoiThauWithoutTbmtId,
    getFacilityOwnedKetQuaLCNTByTbmtId,
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

const GOI_THAU_TARGET_PREFIX = "goi-thau-";

const parseResultTarget = (targetId: string) => {
    if (targetId.startsWith(GOI_THAU_TARGET_PREFIX)) {
        return {
            mode: "NO_TBMT" as const,
            goiThauId: targetId.slice(GOI_THAU_TARGET_PREFIX.length),
        };
    }

    return {
        mode: "TBMT" as const,
        tbmtId: targetId,
    };
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

interface KetQuaLCNTPatchBody {
    soQdPheDuyetKQLCNT?: string;
    ngayPheDuyetKQLCNT?: string;
    soMatHangMoiThau?: number | string | null;
    soMatHangTrungThau?: number | string | null;
    tongGiaTriTrungThau?: number | string | null;
    ketQuaPhanLos?: KetQuaPhanLoInput[];
}

// GET /api/facility/ket-qua-lcnt/[tbmtId]
// Get existing LCNT results for a specific TBMT
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ tbmtId: string }> }
) {
    try {
        void req;
        const { user } = await requireActiveSessionUser("FACILITY");

        const { tbmtId } = await params;
        const target = parseResultTarget(tbmtId);

        if (target.mode === "NO_TBMT") {
            const ownedGoiThau = await getFacilityOwnedGoiThau(target.goiThauId, user.id);

            if (ownedGoiThau.yeuCauTBMT) {
                throw new RouteError(400, "Gói thầu này yêu cầu Thông báo mời thầu trước khi nhập KQLCNT");
            }

            const ketQuaLCNT = await prisma.ketQuaLCNT.findFirst({
                where: {
                    goiThauId: ownedGoiThau.id,
                    thongBaoMoiThauId: null,
                },
                include: {
                    ketQuaPhanLos: {
                        include: {
                            phanLoGoiThau: true,
                        },
                    },
                    thongBaoMoiThau: true,
                    goiThau: {
                        include: {
                            phanLos: true,
                        },
                    },
                },
            });

            if (ketQuaLCNT) {
                return NextResponse.json(ketQuaLCNT);
            }

            const goiThau = await prisma.goiThau.findUnique({
                where: { id: ownedGoiThau.id },
                include: {
                    phanLos: true,
                },
            });

            return NextResponse.json({
                goiThauId: ownedGoiThau.id,
                thongBaoMoiThau: null,
                goiThau,
            });
        }

        const ownedTbmt = await getFacilityOwnedThongBaoMoiThauById(tbmtId, user.id);

        // Find LCNT results by TBMT ID
        const ketQuaLCNT = await prisma.ketQuaLCNT.findFirst({
            where: {
                thongBaoMoiThauId: ownedTbmt.id,
            },
            include: {
                ketQuaPhanLos: {
                    include: {
                        phanLoGoiThau: true,
                    },
                },
                thongBaoMoiThau: true,
                goiThau: {
                    include: {
                        phanLos: true,
                    },
                },
            },
        });

        // If no results exist yet, fetch TBMT to get goiThauId
        if (!ketQuaLCNT) {
            const tbmt = await prisma.thongBaoMoiThau.findUnique({
                where: { id: ownedTbmt.id },
                include: {
                    goiThau: true,
                },
            });

            if (!tbmt) {
                return NextResponse.json(
                    { message: "TBMT not found" },
                    { status: 404 }
                );
            }

            // Return just the TBMT and goiThau info
            return NextResponse.json({
                goiThauId: tbmt.goiThauId,
                thongBaoMoiThau: tbmt,
                goiThau: tbmt.goiThau,
            });
        }

        return NextResponse.json(ketQuaLCNT);
    } catch (error: unknown) {
        return handleRouteError(error, "Error fetching ket qua LCNT detail:");
    }
}

// PATCH /api/facility/ket-qua-lcnt/[tbmtId]
// Update existing LCNT results
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ tbmtId: string }> }
) {
    try {
        const { user } = await requireActiveSessionUser("FACILITY");

        const { tbmtId } = await params;
        const body = await req.json() as KetQuaLCNTPatchBody;
        const {
            soQdPheDuyetKQLCNT,
            ngayPheDuyetKQLCNT,
            soMatHangMoiThau,
            soMatHangTrungThau,
            tongGiaTriTrungThau,
            ketQuaPhanLos,
        } = body;
        const resolvedSoQdPheDuyetKQLCNT = normalizeString(soQdPheDuyetKQLCNT);
        const resolvedNgayPheDuyetKQLCNT = normalizeString(ngayPheDuyetKQLCNT);
        const target = parseResultTarget(tbmtId);
        const ownedTbmt = target.mode === "TBMT"
            ? await getFacilityOwnedThongBaoMoiThauById(tbmtId, user.id)
            : null;
        const ownedGoiThau = target.mode === "NO_TBMT"
            ? await getFacilityOwnedGoiThau(target.goiThauId, user.id)
            : null;

        if (ownedGoiThau?.yeuCauTBMT) {
            throw new RouteError(400, "Gói thầu này yêu cầu Thông báo mời thầu trước khi nhập KQLCNT");
        }

        // Find existing LCNT result
        const existing = target.mode === "TBMT"
            ? await getFacilityOwnedKetQuaLCNTByTbmtId(tbmtId, user.id)
            : await getFacilityOwnedKetQuaLCNTByGoiThauWithoutTbmtId(target.goiThauId, user.id);

        const validKetQuaPhanLos = requireValidKetQuaPhanLos(ketQuaPhanLos);
        await assertPhanLoIdsBelongToGoiThau(
            validKetQuaPhanLos.map((kqpl) => kqpl.phanLoGoiThauId),
            ownedTbmt?.goiThauId ?? ownedGoiThau!.id
        );

        // Update in a transaction
        const result = await prisma.$transaction(async (tx) => {
            // Delete existing lot results
            await tx.ketQuaPhanLo.deleteMany({
                where: {
                    ketQuaLCNTId: existing.id,
                },
            });

            // Update main result and create new lot results
            return await tx.ketQuaLCNT.update({
                where: {
                    id: existing.id,
                },
                data: {
                    soQdPheDuyetKQLCNT: resolvedSoQdPheDuyetKQLCNT || undefined,
                    ngayPheDuyetKQLCNT: resolvedNgayPheDuyetKQLCNT
                        ? new Date(resolvedNgayPheDuyetKQLCNT)
                        : undefined,
                    soMatHangMoiThau: safeParseInt(soMatHangMoiThau),
                    soMatHangTrungThau: safeParseInt(soMatHangTrungThau),
                    tongGiaTriTrungThau: safeParseFloat(tongGiaTriTrungThau),
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
        });

        return NextResponse.json(result);
    } catch (error: unknown) {
        return handleRouteError(error, "Error updating ket qua LCNT:");
    }
}
