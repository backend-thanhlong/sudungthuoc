import type { AIAgentRequest, AIReviewEvidence } from "@/lib/ai/types";
import { normalizeAIChatModelChoice } from "@/lib/ai/model-options";

const MAX_EVIDENCE_ROWS = 30;
const MAX_STRING_LENGTH = 500;

const REVIEW_ROW_ALLOWLIST = new Set([
    "stt",
    "excelRowNumber",
    "row",
    "rowNumber",
    "maNoiBo",
    "maThuoc",
    "drugName",
    "tenThuocNoiBo",
    "hoatChatNoiBo",
    "soDangKyNoiBo",
    "donViTinhNoiBo",
    "status",
    "adminNote",
    "tonDau",
    "nhap",
    "xuat",
    "tonCuoi",
    "giaVat",
    "thanhTienTonCuoi",
    "warnings",
    "message",
    "type",
]);

export function cleanText(value: unknown, maxLength = MAX_STRING_LENGTH) {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, maxLength);
}

function sanitizeValue(value: unknown): unknown {
    if (typeof value === "number" || typeof value === "boolean" || value === null) {
        return value;
    }
    if (typeof value === "string") {
        return cleanText(value);
    }
    if (Array.isArray(value)) {
        return value.slice(0, 10).map(item => sanitizeValue(item));
    }
    if (typeof value === "object" && value) {
        return sanitizeRecord(value as Record<string, unknown>);
    }

    return cleanText(value);
}

function sanitizeRecord(record: Record<string, unknown>, allowlist?: Set<string>) {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(record)) {
        if (allowlist && !allowlist.has(key)) {
            continue;
        }
        sanitized[key] = sanitizeValue(value);
    }
    return sanitized;
}

export function sanitizeEvidence(evidence: AIReviewEvidence | undefined): AIReviewEvidence | undefined {
    if (!evidence || typeof evidence !== "object") {
        return undefined;
    }

    const summary = evidence.summary && typeof evidence.summary === "object"
        ? sanitizeRecord(evidence.summary)
        : undefined;

    const rows = Array.isArray(evidence.rows)
        ? evidence.rows
            .slice(0, MAX_EVIDENCE_ROWS)
            .filter(row => row && typeof row === "object")
            .map(row => sanitizeRecord(row as Record<string, unknown>, REVIEW_ROW_ALLOWLIST))
        : undefined;

    return { summary, rows };
}

export function normalizeAgentRequest(body: unknown): AIAgentRequest | null {
    if (!body || typeof body !== "object") {
        return null;
    }

    const value = body as Record<string, unknown>;
    if (value.mode !== "chat" && value.mode !== "review") {
        return null;
    }
    if (typeof value.message !== "string" || !value.message.trim()) {
        return null;
    }

    const surface = value.surface === "dashboard"
        || value.surface === "facility_reports"
        || value.surface === "facility_mappings"
        ? value.surface
        : undefined;

    if (value.mode === "review" && !surface) {
        return null;
    }

    const context = value.context && typeof value.context === "object"
        ? sanitizeRecord(value.context as Record<string, unknown>) as AIAgentRequest["context"]
        : undefined;

    return {
        mode: value.mode,
        message: cleanText(value.message, 2000),
        surface,
        context,
        evidence: sanitizeEvidence(value.evidence as AIReviewEvidence | undefined),
        useFallback: value.useFallback === true,
        modelChoice: value.mode === "chat" ? normalizeAIChatModelChoice(value.modelChoice) : undefined,
    };
}
