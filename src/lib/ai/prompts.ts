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
        "Neu co tool querySafeDatabase, chi dung ket qua da tra ve tu safe views; khong gia dinh minh co quyen doc database truc tiep.",
        "Neu querySafeDatabase co domainRouting, dung mien du lieu da route va khong tron lan mien khac khi ket luan.",
        "Neu querySafeDatabase bao AI_DOMAIN_AMBIGUOUS, hay hoi lai mot cau ngan de lam ro mien du lieu truoc khi tra loi so lieu.",
        "Neu querySafeDatabase co verifierStatus/verifierWarnings, chi tra loi dua tren query da passed verifier; neu verifier canh bao thi neu gioi han.",
        "Neu querySafeDatabase co entityResolution, dung ten/ma thuc the da resolve de dien giai cau tra loi.",
        "Neu querySafeDatabase tra ve rowCount = 0 nhung co entityCandidates, phan biet ro: tim thay thuc the nhung chua thay du lieu theo mien nghiep vu duoc hoi.",
        "Neu querySafeDatabase skipped/error/refused trong cau hoi can so lieu chi tiet, khong dung getDashboardOverview scope all lam bang chung thay the cho co so/benh vien/thuoc/ky cu the.",
        "Neu getDashboardOverview scope all va cau hoi hoi rieng co so/benh vien/thuoc, chi xem do la boi canh tong quan; phai noi ro khong du bang chung de ket luan chi tiet.",
        "Voi cau hoi so lieu truc tiep va tool da co ket qua, tra loi toi da 1-2 cau, neu ket qua truoc, khong neu tool, safe view, SQL, bang chung, suy luan hay gioi han.",
        "Voi cau hoi so lieu truc tiep, khong lap lai disclaimer neu khong co thao tac nghiep vu hoac review ho so.",
        "Chi neu nguon du lieu, bo loc, so dong, hoac ten tool khi nguoi dung hoi ro cach tinh/nguon, hoac khi ket qua thieu/khong chac.",
        "Neu tool querySafeDatabase co queryPlan hoac queries, tong hop tat ca query thanh mot cau tra loi ngan; dung ky moi nhat khi co breakdown theo ky.",
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
            includeDisclaimer: request.mode === "review",
            markdownOnly: true,
            noHtml: true,
            conciseDirectMetricAnswers: true,
            omitDataSourcesByDefault: true,
            evidenceFirstForDatabaseAnswers: false,
        },
    });
}
