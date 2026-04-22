import type { Prisma } from "@/../prisma/generated/client";
import prisma from "@/lib/prisma";
import { RouteError } from "@/lib/server-authz";

export const THERAPEUTIC_GROUP_SELECT = {
    id: true,
    name: true,
    isActive: true,
    updatedAt: true,
    _count: {
        select: {
            masterDrugs: true,
        },
    },
} satisfies Prisma.TherapeuticGroupSelect;

export type TherapeuticGroupRecord = Prisma.TherapeuticGroupGetPayload<{
    select: typeof THERAPEUTIC_GROUP_SELECT;
}>;

export type TherapeuticGroupStatus = "active" | "inactive" | "all";

export function sanitizeTherapeuticGroupName(value: string) {
    return value.trim().replace(/\s+/g, " ");
}

export function normalizeTherapeuticGroupName(value: string) {
    return sanitizeTherapeuticGroupName(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

export function getTherapeuticGroupWhere(search = "", status: TherapeuticGroupStatus = "active"): Prisma.TherapeuticGroupWhereInput {
    const where: Prisma.TherapeuticGroupWhereInput = {};

    if (status === "active") {
        where.isActive = true;
    } else if (status === "inactive") {
        where.isActive = false;
    }

    const sanitizedSearch = sanitizeTherapeuticGroupName(search);
    if (sanitizedSearch) {
        where.name = {
            contains: sanitizedSearch,
            mode: "insensitive",
        };
    }

    return where;
}

export async function getTherapeuticGroupSummary(id: string) {
    return prisma.therapeuticGroup.findUnique({
        where: { id },
        select: THERAPEUTIC_GROUP_SELECT,
    });
}

export function serializeTherapeuticGroup(group: TherapeuticGroupRecord) {
    return {
        id: group.id,
        name: group.name,
        isActive: group.isActive,
        updatedAt: group.updatedAt.toISOString(),
        drugCount: group._count.masterDrugs,
    };
}

export async function findOrCreateTherapeuticGroup(name: string) {
    const sanitizedName = sanitizeTherapeuticGroupName(name);
    if (!sanitizedName) {
        throw new RouteError(400, "Tên nhóm điều trị không được để trống");
    }

    const normalizedName = normalizeTherapeuticGroupName(sanitizedName);
    const existing = await prisma.therapeuticGroup.findUnique({
        where: { normalizedName },
    });

    if (existing) {
        if (existing.isActive) {
            return {
                group: existing,
                created: false,
                reactivated: false,
            };
        }

        const reactivated = await prisma.therapeuticGroup.update({
            where: { id: existing.id },
            data: {
                isActive: true,
                name: sanitizedName,
            },
        });

        return {
            group: reactivated,
            created: false,
            reactivated: true,
        };
    }

    const created = await prisma.therapeuticGroup.create({
        data: {
            name: sanitizedName,
            normalizedName,
        },
    });

    return {
        group: created,
        created: true,
        reactivated: false,
    };
}

export async function renameTherapeuticGroup(id: string, name: string) {
    const sanitizedName = sanitizeTherapeuticGroupName(name);
    if (!sanitizedName) {
        throw new RouteError(400, "Tên nhóm điều trị không được để trống");
    }

    const normalizedName = normalizeTherapeuticGroupName(sanitizedName);
    const duplicate = await prisma.therapeuticGroup.findFirst({
        where: {
            normalizedName,
            NOT: { id },
        },
        select: { id: true },
    });

    if (duplicate) {
        throw new RouteError(409, "Nhóm điều trị này đã tồn tại");
    }

    return prisma.therapeuticGroup.update({
        where: { id },
        data: {
            name: sanitizedName,
            normalizedName,
        },
    });
}
