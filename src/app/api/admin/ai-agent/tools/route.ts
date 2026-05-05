import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { isRouteError, requireActiveSessionUser } from "@/lib/server-authz";
import { getAIToolPolicyMap, isAIPolicyRole } from "@/lib/ai/admin-config";
import {
    AI_TOOL_REGISTRY,
    getAIToolDefinitionsForRole,
    isKnownAIToolName,
    type AIPolicyRole,
    type AIToolName,
} from "@/lib/ai/tool-registry";

interface ToolPolicyUpdate {
    toolName: AIToolName;
    role: AIPolicyRole;
    enabled: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function validatePayload(payload: unknown): ToolPolicyUpdate[] | string {
    if (!isRecord(payload) || !Array.isArray(payload.policies)) {
        return "Payload phải có policies dạng mảng";
    }

    const updates: ToolPolicyUpdate[] = [];
    for (const [index, item] of payload.policies.entries()) {
        if (!isRecord(item)) {
            return `Policy #${index + 1} không hợp lệ`;
        }

        const { toolName, role, enabled } = item;
        if (typeof toolName !== "string" || !isKnownAIToolName(toolName)) {
            return `toolName không hợp lệ ở policy #${index + 1}`;
        }
        if (role !== "ADMIN" && role !== "FACILITY") {
            return `role không hợp lệ ở policy #${index + 1}`;
        }
        if (typeof enabled !== "boolean") {
            return `enabled phải là boolean ở policy #${index + 1}`;
        }

        const supported = getAIToolDefinitionsForRole(role).some(tool => tool.name === toolName);
        if (!supported) {
            return `${toolName} không hỗ trợ role ${role}`;
        }

        updates.push({ toolName, role, enabled });
    }

    if (updates.length === 0) {
        return "Không có policy nào để cập nhật";
    }

    return updates;
}

export async function GET() {
    try {
        await requireActiveSessionUser("ADMIN");
        const [adminPolicies, facilityPolicies, rawPolicies] = await Promise.all([
            getAIToolPolicyMap("ADMIN"),
            getAIToolPolicyMap("FACILITY"),
            prisma.aIToolPolicy.findMany({
                select: {
                    toolName: true,
                    role: true,
                    enabled: true,
                    updatedAt: true,
                    updatedById: true,
                },
                orderBy: [
                    { role: "asc" },
                    { toolName: "asc" },
                ],
            }),
        ]);

        return NextResponse.json({
            roles: ["ADMIN", "FACILITY"],
            tools: AI_TOOL_REGISTRY.map(tool => ({
                ...tool,
                enabledByRole: {
                    ADMIN: (tool.roles as readonly AIPolicyRole[]).includes("ADMIN") ? adminPolicies[tool.name] !== false : null,
                    FACILITY: (tool.roles as readonly AIPolicyRole[]).includes("FACILITY") ? facilityPolicies[tool.name] !== false : null,
                },
            })),
            rawPolicies: rawPolicies.filter(policy => isAIPolicyRole(policy.role) && isKnownAIToolName(policy.toolName)),
        });
    } catch (error) {
        if (isRouteError(error)) {
            return NextResponse.json({ message: error.message }, { status: error.status });
        }

        console.error("Error fetching AI tool policies:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const sessionContext = await requireActiveSessionUser("ADMIN");
        const body = await request.json().catch(() => null);
        const updates = validatePayload(body);
        if (typeof updates === "string") {
            return NextResponse.json({ message: updates }, { status: 400 });
        }

        await prisma.$transaction(
            updates.map(update => prisma.aIToolPolicy.upsert({
                where: {
                    toolName_role: {
                        toolName: update.toolName,
                        role: update.role,
                    },
                },
                create: {
                    toolName: update.toolName,
                    role: update.role,
                    enabled: update.enabled,
                    updatedById: sessionContext.user.id,
                },
                update: {
                    enabled: update.enabled,
                    updatedById: sessionContext.user.id,
                },
            }))
        );

        await logActivity({
            userId: sessionContext.user.id,
            action: "AI_AGENT_TOOL_POLICY_UPDATED",
            entityType: "ai_agent_tool_policy",
            details: {
                count: updates.length,
                policies: updates,
            },
        });

        return NextResponse.json({ message: "Tool policy đã được cập nhật", count: updates.length });
    } catch (error) {
        if (isRouteError(error)) {
            return NextResponse.json({ message: error.message }, { status: error.status });
        }

        console.error("Error updating AI tool policies:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
