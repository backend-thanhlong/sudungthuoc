import type { ActiveSessionContext } from "@/lib/server-authz";
import type { AIAgentRequest, AITaskType, AIToolResult } from "@/lib/ai/types";

const DISCLAIMER = "Noi dung AI chi mang tinh ho tro kiem tra va tong hop. Nguoi dung can xac nhan truoc khi thao tac nghiep vu.";

export function inferTaskType(request: AIAgentRequest): AITaskType {
    const message = request.message.toLowerCase();
    if (request.mode === "review") {
        return "record_review";
    }
    if (request.useFallback) {
        return "deep_analysis";
    }
    if (message.includes("báo cáo lãnh đạo") || message.includes("bao cao lanh dao") || message.includes("executive")) {
        return "executive_report";
    }
    if (message.includes("phân tích sâu") || message.includes("phan tich sau") || message.includes("nguyên nhân")) {
        return "deep_analysis";
    }
    if (message.includes("tóm tắt") || message.includes("tong ket") || message.includes("tổng kết")) {
        return "summary";
    }

    return "simple_qa";
}

export function buildSystemPrompt() {
    return [
        "Ban la Tro ly AI cho he thong quan ly su dung thuoc.",
        "Tra loi bang tieng Viet, ngan gon, ro y, uu tien bullet khi co nhieu diem.",
        "Chi dua ket luan dua tren du lieu tool/context duoc cung cap.",
        "Neu thieu du lieu, noi ro thieu du lieu nao va khong doan.",
        "Khong dua tu van dieu tri ca nhan hoa, khong thay the quy trinh phe duyet chinh thuc.",
        "Khong tu nhan da ghi, sua, gui, phe duyet du lieu.",
        "Voi review ho so, tach thanh: Loi can xu ly, Canh bao nen kiem tra, Goi y tiep theo.",
        DISCLAIMER,
    ].join("\n");
}

export function buildUserPrompt({
    sessionContext,
    request,
    toolResults,
}: {
    sessionContext: ActiveSessionContext;
    request: AIAgentRequest;
    toolResults: AIToolResult[];
}) {
    const role = sessionContext.user.role;
    const scope = role === "FACILITY"
        ? `FACILITY:${sessionContext.user.id}:${sessionContext.user.facilityName || sessionContext.user.username}`
        : "ADMIN:toan-he-thong";

    return JSON.stringify({
        role,
        scope,
        mode: request.mode,
        surface: request.surface || "dashboard",
        question: request.message,
        context: request.context || {},
        evidence: request.evidence || null,
        toolResults: toolResults.map(result => ({
            name: result.name,
            status: result.status,
            warning: result.warning,
            data: result.data,
        })),
        responseRequirements: {
            language: "vi",
            includeDisclaimer: true,
            markdownOnly: true,
            noHtml: true,
        },
    });
}
