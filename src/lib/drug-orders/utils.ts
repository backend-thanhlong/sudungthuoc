import { randomUUID } from "crypto";
import { Prisma } from "@/../prisma/generated/client";
import { RouteError } from "@/lib/server-authz";

export const DRUG_ORDER_SUGGESTION_RULE_VERSION = "xnt-v1-coverage-2m";
export const DRUG_ORDER_COMPLETE_SUGGESTION_RULE_VERSION =
    "complete-v1-coverage-2m-net-incoming";
export const DRUG_ORDER_TARGET_COVERAGE_MONTHS = 2;
export const DRUG_ORDER_SERIALIZABLE_TRANSACTION = {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
} as const;

const REPORT_MONTH_PATTERN = /^\d{2}\/\d{4}$/;

export function normalizeText(value: unknown) {
    return typeof value === "string" ? value.trim() : "";
}

export function normalizeOptionalText(value: unknown) {
    const normalized = normalizeText(value);
    return normalized.length > 0 ? normalized : null;
}

export function parseReportMonthValue(reportMonth: string | null | undefined) {
    if (!reportMonth || !REPORT_MONTH_PATTERN.test(reportMonth)) {
        return null;
    }

    const [month, year] = reportMonth.split("/").map(Number);
    return year * 100 + month;
}

export function isReportMonthAtOrBefore(candidate: string, upperBound: string | null | undefined) {
    const candidateValue = parseReportMonthValue(candidate);
    const upperBoundValue = parseReportMonthValue(upperBound);

    if (candidateValue === null || upperBoundValue === null) {
        return true;
    }

    return candidateValue <= upperBoundValue;
}

export function compareReportMonthsDesc(left: string, right: string) {
    return (parseReportMonthValue(right) || 0) - (parseReportMonthValue(left) || 0);
}

export function buildDrugOrderNo(now = new Date()) {
    const isoDate = now.toISOString().slice(0, 10).replace(/-/g, "");
    return `DTRU-${isoDate}-${randomUUID().slice(0, 6).toUpperCase()}`;
}

export function toNumber(value: unknown) {
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : 0;
    }

    if (typeof value === "string") {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    if (
        typeof value === "object" &&
        value !== null &&
        "toString" in value &&
        typeof value.toString === "function"
    ) {
        const parsed = Number(value.toString());
        return Number.isFinite(parsed) ? parsed : 0;
    }

    return 0;
}

export function formatQuantityLabel(value: number) {
    return new Intl.NumberFormat("vi-VN", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(value);
}

export function rethrowDrugOrderConcurrencyError(
    error: unknown,
    message = "Đơn đặt hàng vừa thay đổi bởi thao tác khác. Vui lòng tải lại và thử lại."
): never {
    if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error.code === "P2002" || error.code === "P2034")
    ) {
        throw new RouteError(409, message);
    }

    throw error;
}
