import type { AIAgentRequest, AIAgentResponse, AIToolResult } from "@/lib/ai/types";

function getArray(value: unknown, key: string): unknown[] {
    if (!value || typeof value !== "object") {
        return [];
    }

    const record = value as Record<string, unknown>;
    return Array.isArray(record[key]) ? record[key] : [];
}

function getNumber(value: unknown, key: string) {
    if (!value || typeof value !== "object") {
        return 0;
    }

    const record = value as Record<string, unknown>;
    const parsed = Number(record[key] || 0);
    return Number.isFinite(parsed) ? parsed : 0;
}

function formatFinding(item: unknown) {
    if (!item || typeof item !== "object") {
        return "- Dòng dữ liệu bất thường";
    }

    const record = item as Record<string, unknown>;
    const name = record.drugName || record.tenThuocNoiBo || record.maNoiBo || record.normalizedName || "Dòng dữ liệu";
    const type = record.type || "WARNING";
    const details = Object.entries(record)
        .filter(([key]) => !["drugName", "tenThuocNoiBo", "maNoiBo", "normalizedName", "type"].includes(key))
        .slice(0, 4)
        .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : String(value)}`)
        .join("; ");

    return `- ${name}: ${type}${details ? ` (${details})` : ""}`;
}

function collectReviewLines(toolResults: AIToolResult[]) {
    const errors: string[] = [];
    const warnings: string[] = [];
    const nextSteps: string[] = [];

    for (const result of toolResults) {
        if (result.status === "error") {
            warnings.push(`- Tool ${result.name} lỗi: ${result.warning || "không rõ nguyên nhân"}`);
            continue;
        }

        const findings = getArray(result.data, "findings");
        const missingInfo = getArray(result.data, "missingInfo");
        const duplicateNames = getArray(result.data, "duplicateNames");
        const rejected = getArray(result.data, "rejected");
        const rejectedRows = getArray(result.data, "rejectedRows");
        const findingCount = getNumber(result.data, "findingCount");

        if (findings.length > 0) {
            errors.push(...findings.slice(0, 12).map(formatFinding));
        } else if (findingCount === 0 && result.name.includes("Report")) {
            nextSteps.push("- Chưa thấy lỗi công thức rõ ràng trong tập dữ liệu đã kiểm tra.");
        }

        if (missingInfo.length > 0) {
            warnings.push(...missingInfo.slice(0, 10).map(formatFinding));
        }
        if (duplicateNames.length > 0) {
            warnings.push(...duplicateNames.slice(0, 5).map(formatFinding));
        }
        if (rejected.length > 0 || rejectedRows.length > 0) {
            warnings.push(...[...rejected, ...rejectedRows].slice(0, 10).map(formatFinding));
        }
    }

    if (errors.length === 0) {
        errors.push("- Chưa phát hiện lỗi nghiêm trọng từ các rule kiểm tra nội bộ.");
    }
    if (warnings.length === 0) {
        warnings.push("- Chưa có cảnh báo bổ sung từ các rule kiểm tra nội bộ.");
    }
    if (nextSteps.length === 0) {
        nextSteps.push("- Rà soát các dòng được nêu ở trên, chỉnh dữ liệu trong file hoặc danh mục rồi chạy kiểm tra lại.");
        nextSteps.push("- Sau khi cấu hình API key AI, hệ thống sẽ bổ sung phần diễn giải ngôn ngữ tự nhiên chi tiết hơn.");
    }

    return { errors, warnings, nextSteps };
}

export function buildDeterministicReviewResponse({
    request,
    toolResults,
    providerMessage,
}: {
    request: AIAgentRequest;
    toolResults: AIToolResult[];
    providerMessage: string;
}): AIAgentResponse {
    const { errors, warnings, nextSteps } = collectReviewLines(toolResults);
    const answer = [
        "Lỗi cần xử lý",
        ...errors,
        "",
        "Cảnh báo nên kiểm tra",
        ...warnings,
        "",
        "Gợi ý tiếp theo",
        ...nextSteps,
        "",
        `Ghi chú: Đây là kết quả kiểm tra rule nội bộ vì provider AI chưa phản hồi (${providerMessage}).`,
    ].join("\n");

    return {
        answer,
        mode: request.mode,
        model: "local-review-rules",
        usedFallback: false,
        toolCalls: toolResults.map(result => ({
            name: result.name,
            status: result.status,
        })),
        warnings: ["LOCAL_REVIEW_RULES_FALLBACK", providerMessage],
        usage: {
            inputTokens: 0,
            outputTokens: 0,
            estimatedCostUsd: 0,
        },
    };
}
