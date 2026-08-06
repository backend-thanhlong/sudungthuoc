import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import type { Prisma, Role } from "@/../prisma/generated/client";
import type { Session } from "next-auth";

const ACTIVE_USER_SELECT = {
    id: true,
    username: true,
    role: true,
    facilityName: true,
    facilityCode: true,
    companyId: true,
    isActive: true,
    company: {
        select: {
            id: true,
            name: true,
            code: true,
            isActive: true,
        },
    },
} satisfies Prisma.UserSelect;

export type ActiveUserRecord = Prisma.UserGetPayload<{
    select: typeof ACTIVE_USER_SELECT;
}>;

type SessionValue = Session;

export interface ActiveSessionContext {
    session: SessionValue;
    user: ActiveUserRecord;
}

export class RouteError extends Error {
    status: number;

    constructor(status: number, message: string) {
        super(message);
        this.name = "RouteError";
        this.status = status;
    }
}

export const isRouteError = (error: unknown): error is RouteError => error instanceof RouteError;

export async function requireActiveSessionUser(expectedRole?: Role): Promise<ActiveSessionContext> {
    const session = await auth();
    if (!session?.user?.id) {
        throw new RouteError(401, "Unauthorized");
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: ACTIVE_USER_SELECT,
    });

    if (!user) {
        throw new RouteError(401, "Unauthorized");
    }

    if (!user.isActive) {
        throw new RouteError(403, "Tài khoản đã bị vô hiệu hóa");
    }

    if (user.role === "COMPANY") {
        if (!user.companyId || !user.company) {
            throw new RouteError(403, "Tài khoản công ty chưa được gán công ty");
        }

        if (!user.company.isActive) {
            throw new RouteError(403, "Công ty đã bị vô hiệu hóa");
        }
    }

    if (expectedRole && user.role !== expectedRole) {
        throw new RouteError(403, "Forbidden");
    }

    return {
        session,
        user,
    };
}

export async function getFacilityOwnedGoiThau(goiThauId: string, facilityId: string) {
    const goiThau = await prisma.goiThau.findUnique({
        where: { id: goiThauId },
        select: {
            id: true,
            yeuCauTBMT: true,
            keHoach: {
                select: {
                    facilityId: true,
                    quyTrinh: true,
                },
            },
        },
    });

    if (!goiThau) {
        throw new RouteError(404, "Gói thầu không tồn tại");
    }

    if (goiThau.keHoach.facilityId !== facilityId) {
        throw new RouteError(403, "Forbidden");
    }

    return goiThau;
}

export async function getFacilityOwnedThongBaoMoiThauById(tbmtId: string, facilityId: string) {
    const tbmt = await prisma.thongBaoMoiThau.findUnique({
        where: { id: tbmtId },
        select: {
            id: true,
            goiThauId: true,
            maTBMT: true,
            goiThau: {
                select: {
                    keHoach: {
                        select: {
                            facilityId: true,
                        },
                    },
                },
            },
        },
    });

    if (!tbmt) {
        throw new RouteError(404, "TBMT not found");
    }

    if (tbmt.goiThau.keHoach.facilityId !== facilityId) {
        throw new RouteError(403, "Forbidden");
    }

    return tbmt;
}

export async function getFacilityOwnedKetQuaLCNTByTbmtId(tbmtId: string, facilityId: string) {
    const tbmt = await getFacilityOwnedThongBaoMoiThauById(tbmtId, facilityId);
    const ketQuaLCNT = await prisma.ketQuaLCNT.findFirst({
        where: {
            thongBaoMoiThauId: tbmt.id,
        },
        select: {
            id: true,
            goiThauId: true,
            thongBaoMoiThauId: true,
        },
    });

    if (!ketQuaLCNT) {
        throw new RouteError(404, "LCNT result not found");
    }

    return ketQuaLCNT;
}

export async function getFacilityOwnedKetQuaLCNTByGoiThauWithoutTbmtId(goiThauId: string, facilityId: string) {
    const goiThau = await getFacilityOwnedGoiThau(goiThauId, facilityId);
    const ketQuaLCNT = await prisma.ketQuaLCNT.findFirst({
        where: {
            goiThauId: goiThau.id,
            thongBaoMoiThauId: null,
        },
        select: {
            id: true,
            goiThauId: true,
            thongBaoMoiThauId: true,
        },
    });

    if (!ketQuaLCNT) {
        throw new RouteError(404, "LCNT result not found");
    }

    return ketQuaLCNT;
}

export async function assertPhanLoIdsBelongToGoiThau(phanLoIds: string[], goiThauId: string) {
    const uniqueIds = [...new Set(phanLoIds.filter(Boolean))];
    if (uniqueIds.length === 0) {
        return;
    }

    const phanLos = await prisma.phanLoGoiThau.findMany({
        where: {
            id: { in: uniqueIds },
            goiThauId,
        },
        select: {
            id: true,
        },
    });

    if (phanLos.length !== uniqueIds.length) {
        throw new RouteError(400, "Một hoặc nhiều phần lô không thuộc gói thầu hiện tại");
    }
}

export function getDashboardRedirectPath(role: Role, pathname: string) {
    if (pathname.startsWith("/dashboard/admin")) {
        if (pathname.startsWith("/dashboard/admin/master-drugs") && role === "FACILITY") {
            return null;
        }

        if (role !== "ADMIN") {
            return getRoleDashboardHome(role);
        }
    }

    if (pathname.startsWith("/dashboard/facility") && role !== "FACILITY") {
        return getRoleDashboardHome(role);
    }

    if (pathname.startsWith("/dashboard/company") && role !== "COMPANY") {
        return getRoleDashboardHome(role);
    }

    return null;
}

export function getRoleDashboardHome(role: Role) {
    if (role === "ADMIN") {
        return "/dashboard/admin";
    }

    if (role === "COMPANY") {
        return "/dashboard/company";
    }

    return "/dashboard/facility";
}

export function buildFreshSession(session: SessionValue, user: ActiveUserRecord): SessionValue {
    return {
        ...session,
        user: {
            ...session.user,
            id: user.id,
            name: user.role === "COMPANY"
                ? user.company?.name || user.username
                : user.facilityName || user.username,
            email: user.username,
            role: user.role,
            facilityCode: user.facilityCode,
            companyId: user.companyId,
        },
    };
}
