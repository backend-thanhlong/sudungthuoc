import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
    findOrCreateTherapeuticGroup,
    getTherapeuticGroupWhere,
    serializeTherapeuticGroup,
    THERAPEUTIC_GROUP_SELECT,
    type TherapeuticGroupStatus,
} from "@/lib/therapeutic-groups";
import {
    isRouteError,
    requireActiveSessionUser,
} from "@/lib/server-authz";

export async function GET(request: Request) {
    try {
        await requireActiveSessionUser("ADMIN");

        const { searchParams } = new URL(request.url);
        const search = searchParams.get("search") || "";
        const status = (searchParams.get("status") || "active") as TherapeuticGroupStatus;
        const limitParam = searchParams.get("limit");
        const limit = limitParam ? Number(limitParam) : null;

        const data = await prisma.therapeuticGroup.findMany({
            where: getTherapeuticGroupWhere(search, status),
            orderBy: { name: "asc" },
            ...(limit && Number.isFinite(limit) && limit > 0 ? { take: limit } : {}),
            select: THERAPEUTIC_GROUP_SELECT,
        });

        return NextResponse.json({
            data: data.map(serializeTherapeuticGroup),
        });
    } catch (error) {
        if (isRouteError(error)) {
            return NextResponse.json({ message: error.message }, { status: error.status });
        }

        console.error("Error fetching therapeutic groups:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        await requireActiveSessionUser("ADMIN");

        const body = await request.json();
        const result = await findOrCreateTherapeuticGroup(String(body.name || ""));
        const summary = await prisma.therapeuticGroup.findUnique({
            where: { id: result.group.id },
            select: THERAPEUTIC_GROUP_SELECT,
        });

        if (!summary) {
            return NextResponse.json({ message: "Không thể tải nhóm điều trị vừa tạo" }, { status: 500 });
        }

        return NextResponse.json({
            data: serializeTherapeuticGroup(summary),
            meta: {
                created: result.created,
                reactivated: result.reactivated,
            },
        }, { status: result.created ? 201 : 200 });
    } catch (error) {
        if (isRouteError(error)) {
            return NextResponse.json({ message: error.message }, { status: error.status });
        }

        console.error("Error creating therapeutic group:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
