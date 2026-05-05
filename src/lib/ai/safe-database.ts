import pg from "pg";
import { getAIConfig } from "@/lib/ai/config";
import { generateGoogleResponse } from "@/lib/ai/providers/google";
import { generateOpenAIResponse } from "@/lib/ai/providers/openai";
import type { AIAgentRequest, AIProviderName } from "@/lib/ai/types";

const SAFE_VIEW_NAMES = [
    "ai_facilities",
    "ai_companies",
    "ai_therapeutic_groups",
    "ai_master_drugs",
    "ai_company_drugs",
    "ai_mapping_status",
    "ai_inventory_reports",
    "ai_report_submissions",
    "ai_report_review_logs",
    "ai_report_periods",
    "ai_drug_orders",
    "ai_drug_order_shipments",
    "ai_drug_order_receipts",
    "ai_procurement_plans",
    "ai_procurement_packages",
    "ai_procurement_package_lots",
    "ai_procurement_notices",
    "ai_procurement_results",
    "ai_procurement_lot_results",
] as const;

const SAFE_SCHEMA_DESCRIPTION = `
Available read-only AI views:

ai_facilities(
  facility_id, facility_name, facility_code, company_id, autonomy_group,
  facility_type, is_active, created_at, updated_at
)

ai_companies(
  company_id, company_code, company_name, contact_person, phone_number,
  email, address, is_active, created_at, updated_at
)

ai_therapeutic_groups(
  therapeutic_group_id, name, normalized_name, is_active, created_at, updated_at
)

ai_master_drugs(
  master_drug_id, ma_chung, ma_bhyt, ten_thuoc, hoat_chat, ham_luong,
  dang_bao_che, so_dang_ky, quy_cach, don_vi_tinh, tieu_chuan, tuoi_tho,
  duong_dung, nguon_goc, cong_ty_san_xuat, nuoc_san_xuat, cong_ty_dang_ky,
  nuoc_dang_ky, nhom_thuoc, therapeutic_group_name, is_ke_don,
  kiem_soat_dac_biet, is_trong_nuoc, is_active, created_at, updated_at
)

ai_company_drugs(
  company_drug_id, company_id, company_code, company_name, master_drug_id,
  ma_chung, master_drug_name, company_drug_code, company_drug_name,
  active_ingredient, quy_cach, unit, is_active, created_at, updated_at
)

ai_mapping_status(
  mapping_id, facility_id, facility_name, facility_code, ma_noi_bo,
  ten_thuoc_noi_bo, hoat_chat_noi_bo, so_dang_ky_noi_bo, don_vi_tinh_noi_bo,
  master_drug_id, ma_chung, master_drug_name, master_active_ingredient,
  master_strength, status, is_out_of_catalog, admin_note, created_at, updated_at
)

ai_inventory_reports(
  inventory_report_id, facility_id, facility_name, facility_code, map_id,
  ma_noi_bo, ten_thuoc_noi_bo, hoat_chat_noi_bo, master_drug_id, ma_chung,
  master_drug_name, master_active_ingredient, master_strength, nhom_thuoc,
  report_month, ton_dau, nhap, xuat, ton_cuoi, gia_vat,
  thanh_tien_ton_cuoi, so_qd_trung_thau, ten_cong_ty, ngay_bat_dau_hd,
  ngay_ket_thuc_hd, bhyt, dich_vu, status, admin_note, created_at, updated_at
)

ai_report_submissions(
  submission_id, facility_id, facility_name, facility_code, report_month,
  submitted_at, reported_row_count, skipped_row_count, created_at, updated_at
)

ai_report_review_logs(
  review_log_id, facility_id, facility_name, facility_code, report_month,
  status, admin_note, admin_id, created_at
)

ai_report_periods(
  report_period_id, month, is_active, year, period_month, deadline,
  reminder_sent, created_at, updated_at
)

ai_drug_orders(
  order_id, order_no, facility_id, facility_name, facility_code, company_id,
  company_code, company_name, order_status, base_report_month, submitted_at,
  closed_at, order_created_at, order_updated_at, order_line_id, source_type,
  master_drug_id, ma_chung, master_drug_name, company_drug_id,
  company_drug_code, company_drug_name, display_name, unit, requested_qty,
  accepted_qty, suggested_qty, line_status, company_response_reason,
  suggestion_report_month, shipment_count, total_shipped_qty, receipt_count,
  total_received_qty
)

ai_drug_order_shipments(
  shipment_id, order_id, order_no, facility_id, facility_name, facility_code,
  company_id, company_code, company_name, shipment_no, shipment_status,
  shipped_at, shipped_from_date, shipped_to_date, company_note, created_at,
  updated_at, shipment_line_count, total_shipped_qty, receipt_count
)

ai_drug_order_receipts(
  receipt_id, order_id, order_no, shipment_id, shipment_no, facility_id,
  facility_name, facility_code, company_id, company_code, company_name,
  confirmed_at, note, created_at, updated_at, receipt_line_count,
  total_received_qty
)

ai_procurement_plans(
  plan_id, facility_id, facility_name, facility_code, quy_trinh, loai_mua_sam,
  ma_khlcnt, ten_khlcnt, so_quyet_dinh, ngay_phe_duyet, so_luong_goi_thau,
  trang_thai, loai_mua_sam_tu_quyet, thoi_gian_bat_dau_mua_sam,
  thoi_gian_bat_dau_thuc_hien_hop_dong, thoi_gian_thuc_hien_hop_dong,
  thoi_gian_ket_thuc_hop_dong, created_at, updated_at, package_count,
  notice_count, result_count, total_package_value, total_awarded_value
)

ai_procurement_packages(
  package_id, plan_id, facility_id, facility_name, facility_code, ma_khlcnt,
  ten_khlcnt, ten_goi_thau, gia_goi_thau, linh_vuc, hinh_thuc_lcnt,
  phuong_thuc_lcnt, loai_hop_dong, phan_loai_goi_thau, chi_tiet_nguon_von,
  so_luong_phan_lo, thoi_gian_to_chuc, thoi_gian_bat_dau,
  thoi_gian_thuc_hien, trang_thai, ma_thong_bao, created_at, updated_at,
  lot_count, notice_count, result_count
)

ai_procurement_package_lots(
  lot_id, package_id, plan_id, facility_id, facility_name, facility_code,
  ma_khlcnt, ten_khlcnt, ten_goi_thau, stt, ten_phan_lo, don_vi_tinh,
  so_luong, don_gia, thanh_tien, thoi_gian_thuc_hien,
  don_vi_tinh_thoi_gian, created_at, updated_at
)

ai_procurement_notices(
  notice_id, package_id, plan_id, facility_id, facility_name, facility_code,
  ma_khlcnt, ten_khlcnt, ten_goi_thau, ma_tbmt, ngay_dang_tai,
  so_qd_phe_duyet_hsmt, ngay_phe_duyet_hsmt, ngay_dong_thau, created_at,
  updated_at, result_count
)

ai_procurement_results(
  result_id, package_id, notice_id, plan_id, facility_id, facility_name,
  facility_code, ma_khlcnt, ten_khlcnt, ten_goi_thau, ma_tbmt,
  so_qd_phe_duyet_kqlcnt, ngay_phe_duyet_kqlcnt, so_mat_hang_moi_thau,
  so_mat_hang_trung_thau, tong_gia_tri_trung_thau, created_at, updated_at,
  lot_result_count
)

ai_procurement_lot_results(
  lot_result_id, result_id, package_id, notice_id, plan_id, facility_id,
  facility_name, facility_code, ma_khlcnt, ten_khlcnt, ten_goi_thau,
  ten_phan_lo, lot_stt, ket_qua, don_gia_trung_thau, nha_thau_trung_thau,
  created_at, updated_at
)
`.trim();

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 300;
const QUERY_TIMEOUT_MS = 5000;
const MAX_CELL_LENGTH = 300;
const BLOCKED_KEYWORDS = [
    "insert",
    "update",
    "delete",
    "upsert",
    "alter",
    "drop",
    "truncate",
    "create",
    "grant",
    "revoke",
    "copy",
    "call",
    "do",
    "begin",
    "commit",
    "rollback",
    "vacuum",
    "analyze",
    "explain",
    "execute",
    "prepare",
    "set",
    "reset",
] as const;

const BLOCKED_IDENTIFIERS = [
    "password_hash",
    "secret",
    "token",
    "session",
    "auth",
    "credential",
    "pg_catalog",
    "information_schema",
    "_prisma_migrations",
] as const;

const MAX_ENTITY_CANDIDATES = 12;
const MAX_ENTITY_ROWS = 300;
const MAX_SEARCH_TERMS = 6;
const ENTITY_SCORE_THRESHOLD = 14;

const ENTITY_STOP_WORDS = new Set([
    "ai",
    "admin",
    "anh",
    "bao",
    "bao cao",
    "benh",
    "biet",
    "can",
    "cho",
    "co",
    "cong",
    "cua",
    "du",
    "duoc",
    "gia",
    "gi",
    "goi",
    "he",
    "hoach",
    "hoi",
    "khong",
    "ke",
    "ket",
    "la",
    "lcnt",
    "lieu",
    "mua",
    "nao",
    "nhieu",
    "nha",
    "nhom",
    "phan",
    "qua",
    "sam",
    "so",
    "sung",
    "thau",
    "thong",
    "thuoc",
    "tong",
    "trong",
    "ve",
    "vien",
]);

const FACILITY_HINT_WORDS = ["benh", "vien", "trung", "tam", "ttyt", "co", "so", "phong", "kham"];
const COMPANY_HINT_WORDS = ["cong", "ty", "nha", "thau", "cty", "duoc"];
const DRUG_HINT_WORDS = ["thuoc", "hoat", "chat", "ma", "chung", "bhyt", "dang", "bao", "che", "ham", "luong"];
const PROCUREMENT_HINT_WORDS = ["lcnt", "mua", "sam", "goi", "thau", "khlcnt", "tbmt", "ke", "hoach", "phan", "lo"];

type SafeViewName = (typeof SAFE_VIEW_NAMES)[number];

const SAFE_VIEW_SET = new Set<string>(SAFE_VIEW_NAMES);

const globalForSafeDb = globalThis as unknown as {
    aiSafeDbPool: pg.Pool | undefined;
};

export class SafeDatabaseQueryError extends Error {
    code: string;

    constructor(code: string, message: string) {
        super(message);
        this.name = "SafeDatabaseQueryError";
        this.code = code;
    }
}

export interface GeneratedSafeSql {
    shouldQuery: boolean;
    sql?: string;
    reason?: string;
}

export interface ValidatedSafeSql {
    sql: string;
    referencedViews: SafeViewName[];
    warnings: string[];
}

export interface SafeDatabaseQueryResult extends ValidatedSafeSql {
    columns: string[];
    rows: Record<string, unknown>[];
    rowCount: number;
    durationMs: number;
}

export type SafeDatabaseEntityType =
    | "facility"
    | "company"
    | "master_drug"
    | "company_drug"
    | "procurement_plan"
    | "procurement_package";

export interface SafeDatabaseEntityCandidate {
    type: SafeDatabaseEntityType;
    id: string;
    name: string;
    code?: string;
    score: number;
    matchedTerms: string[];
    metadata?: Record<string, string | number | boolean | null>;
}

export interface SafeDatabaseEntityResolution {
    candidates: SafeDatabaseEntityCandidate[];
    warnings: string[];
}

export interface SafeDatabaseRetryContext {
    previousSql: string;
    previousReferencedViews: SafeViewName[];
    previousRowCount: number;
    reason: string;
}

export interface GenerateSafeDatabaseSqlOptions {
    signal?: AbortSignal;
    entityResolution?: SafeDatabaseEntityResolution;
    retry?: SafeDatabaseRetryContext;
}

function getSafeDatabasePool() {
    const connectionString = process.env.AI_DATABASE_READ_URL || process.env.DATABASE_URL;
    if (!connectionString) {
        throw new SafeDatabaseQueryError("AI_DATABASE_URL_MISSING", "Chưa cấu hình DATABASE_URL cho AI database tool");
    }

    if (!globalForSafeDb.aiSafeDbPool) {
        globalForSafeDb.aiSafeDbPool = new pg.Pool({
            connectionString,
            max: 2,
            idleTimeoutMillis: 10_000,
        });
    }

    return globalForSafeDb.aiSafeDbPool;
}

function normalizeVietnameseText(value: string) {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function tokenizeSearchText(value: string) {
    return normalizeVietnameseText(value)
        .split(" ")
        .filter(token => token.length >= 2 && !ENTITY_STOP_WORDS.has(token));
}

function tokenizeRawSearchText(value: string) {
    return value
        .replace(/[^\p{L}\p{N}]+/gu, " ")
        .replace(/\s+/g, " ")
        .trim()
        .split(" ")
        .filter(token => token.length >= 2 && !ENTITY_STOP_WORDS.has(normalizeVietnameseText(token)));
}

function uniqueTokens(tokens: string[], limit = MAX_SEARCH_TERMS) {
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const token of tokens) {
        const key = normalizeVietnameseText(token);
        if (!key || seen.has(key)) {
            continue;
        }
        seen.add(key);
        unique.push(token);
        if (unique.length >= limit) {
            break;
        }
    }
    return unique;
}

function hasAnyHint(value: string, hints: string[]) {
    const normalized = normalizeVietnameseText(value);
    return hints.some(hint => normalized.includes(hint));
}

function extractEntitySearchTerms(question: string) {
    return uniqueTokens(tokenizeSearchText(question));
}

function extractSqlSearchTerms(question: string) {
    return uniqueTokens([
        ...tokenizeRawSearchText(question),
        ...tokenizeSearchText(question),
    ]);
}

function compactEntityCandidate(candidate: SafeDatabaseEntityCandidate) {
    return {
        type: candidate.type,
        id: candidate.id,
        name: candidate.name,
        code: candidate.code,
        score: candidate.score,
        matchedTerms: candidate.matchedTerms,
        metadata: candidate.metadata,
    };
}

function scoreEntityCandidate(question: string, candidateText: string, code?: string) {
    const questionText = normalizeVietnameseText(question);
    const candidateNormalized = normalizeVietnameseText(candidateText);
    const candidateTokens = new Set(candidateNormalized.split(" ").filter(Boolean));
    const queryTerms = extractEntitySearchTerms(question);
    const matchedTerms: string[] = [];
    let score = 0;

    if (code) {
        const normalizedCode = normalizeVietnameseText(code);
        if (normalizedCode && questionText.includes(normalizedCode)) {
            score += 80;
            matchedTerms.push(code);
        }
    }

    for (const term of queryTerms) {
        if (candidateTokens.has(term)) {
            score += 14;
            matchedTerms.push(term);
        } else if (candidateNormalized.includes(term)) {
            score += 8;
            matchedTerms.push(term);
        }
    }

    const queryPhrase = queryTerms.join(" ");
    if (queryPhrase.length >= 5 && candidateNormalized.includes(queryPhrase)) {
        score += 35;
    }
    if (candidateNormalized.length >= 6 && questionText.includes(candidateNormalized)) {
        score += 70;
    }

    return {
        score,
        matchedTerms: [...new Set(matchedTerms)],
    };
}

async function runFixedReadQuery<T extends Record<string, unknown>>(sql: string, values: unknown[] = []): Promise<T[]> {
    const client = await getSafeDatabasePool().connect();
    try {
        await client.query("BEGIN READ ONLY");
        await client.query(`SET LOCAL statement_timeout = ${QUERY_TIMEOUT_MS}`);
        const result = await client.query(sql, values);
        await client.query("COMMIT");
        return result.rows as T[];
    } catch (error) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw new SafeDatabaseQueryError(
            "AI_ENTITY_LOOKUP_ERROR",
            error instanceof Error ? error.message : "Không thể resolve thực thể AI"
        );
    } finally {
        client.release();
    }
}

function rankCandidates(candidates: SafeDatabaseEntityCandidate[]) {
    return candidates
        .filter(candidate => candidate.score >= ENTITY_SCORE_THRESHOLD)
        .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name, "vi"))
        .slice(0, MAX_ENTITY_CANDIDATES);
}

function asString(value: unknown) {
    return typeof value === "string" ? value : value === null || value === undefined ? "" : String(value);
}

function makeCandidate({
    type,
    id,
    name,
    code,
    question,
    metadata,
}: {
    type: SafeDatabaseEntityType;
    id: unknown;
    name: unknown;
    code?: unknown;
    question: string;
    metadata?: Record<string, string | number | boolean | null>;
}): SafeDatabaseEntityCandidate | null {
    const candidateId = asString(id);
    const candidateName = asString(name);
    const candidateCode = asString(code);
    if (!candidateId || !candidateName) {
        return null;
    }

    const scored = scoreEntityCandidate(question, `${candidateName} ${candidateCode}`, candidateCode);
    if (scored.score <= 0) {
        return null;
    }

    return {
        type,
        id: candidateId,
        name: candidateName,
        code: candidateCode || undefined,
        score: scored.score,
        matchedTerms: scored.matchedTerms,
        metadata,
    };
}

async function lookupFacilityCandidates(question: string) {
    const rows = await runFixedReadQuery<{
        facility_id: string;
        facility_name: string;
        facility_code: string | null;
        company_id: string | null;
        facility_type: string | null;
    }>(
        "SELECT facility_id, facility_name, facility_code, company_id, facility_type FROM ai_facilities ORDER BY facility_name LIMIT $1",
        [MAX_ENTITY_ROWS]
    );

    return rows
        .map(row => makeCandidate({
            type: "facility",
            id: row.facility_id,
            name: row.facility_name,
            code: row.facility_code,
            question,
            metadata: {
                company_id: row.company_id,
                facility_type: row.facility_type,
            },
        }))
        .filter((candidate): candidate is SafeDatabaseEntityCandidate => Boolean(candidate));
}

async function lookupCompanyCandidates(question: string) {
    const rows = await runFixedReadQuery<{
        company_id: string;
        company_name: string;
        company_code: string | null;
    }>(
        "SELECT company_id, company_name, company_code FROM ai_companies ORDER BY company_name LIMIT $1",
        [MAX_ENTITY_ROWS]
    );

    return rows
        .map(row => makeCandidate({
            type: "company",
            id: row.company_id,
            name: row.company_name,
            code: row.company_code,
            question,
        }))
        .filter((candidate): candidate is SafeDatabaseEntityCandidate => Boolean(candidate));
}

async function lookupDrugCandidates(question: string) {
    const terms = extractSqlSearchTerms(question);
    if (terms.length === 0) {
        return [];
    }

    const patterns = terms.map(term => `%${term}%`);
    const masterConditions = patterns.map((_, index) => {
        const parameter = `$${index + 1}`;
        return [
            `ten_thuoc ILIKE ${parameter}`,
            `hoat_chat ILIKE ${parameter}`,
            `ma_chung ILIKE ${parameter}`,
            `ma_bhyt ILIKE ${parameter}`,
        ].join(" OR ");
    }).map(condition => `(${condition})`).join(" OR ");

    const companyConditions = patterns.map((_, index) => {
        const parameter = `$${index + 1}`;
        return [
            `company_drug_name ILIKE ${parameter}`,
            `master_drug_name ILIKE ${parameter}`,
            `active_ingredient ILIKE ${parameter}`,
            `company_drug_code ILIKE ${parameter}`,
            `ma_chung ILIKE ${parameter}`,
        ].join(" OR ");
    }).map(condition => `(${condition})`).join(" OR ");

    const [masterRows, companyRows] = await Promise.all([
        runFixedReadQuery<{
            master_drug_id: string;
            ten_thuoc: string;
            ma_chung: string | null;
            hoat_chat: string | null;
        }>(
            `SELECT master_drug_id, ten_thuoc, ma_chung, hoat_chat FROM ai_master_drugs WHERE ${masterConditions} ORDER BY ten_thuoc LIMIT 40`,
            patterns
        ),
        runFixedReadQuery<{
            company_drug_id: string;
            company_drug_name: string;
            company_drug_code: string | null;
            company_name: string | null;
            ma_chung: string | null;
        }>(
            `SELECT company_drug_id, company_drug_name, company_drug_code, company_name, ma_chung FROM ai_company_drugs WHERE ${companyConditions} ORDER BY company_drug_name LIMIT 40`,
            patterns
        ),
    ]);

    return [
        ...masterRows.map(row => makeCandidate({
            type: "master_drug" as const,
            id: row.master_drug_id,
            name: row.ten_thuoc,
            code: row.ma_chung,
            question,
            metadata: {
                active_ingredient: row.hoat_chat,
            },
        })),
        ...companyRows.map(row => makeCandidate({
            type: "company_drug" as const,
            id: row.company_drug_id,
            name: row.company_drug_name,
            code: row.company_drug_code || row.ma_chung,
            question,
            metadata: {
                company_name: row.company_name,
                ma_chung: row.ma_chung,
            },
        })),
    ].filter((candidate): candidate is SafeDatabaseEntityCandidate => Boolean(candidate));
}

async function lookupProcurementCandidates(question: string) {
    const terms = extractSqlSearchTerms(question);
    if (terms.length === 0) {
        return [];
    }

    const patterns = terms.map(term => `%${term}%`);
    const planConditions = patterns.map((_, index) => {
        const parameter = `$${index + 1}`;
        return [
            `ma_khlcnt ILIKE ${parameter}`,
            `ten_khlcnt ILIKE ${parameter}`,
            `facility_name ILIKE ${parameter}`,
            `facility_code ILIKE ${parameter}`,
        ].join(" OR ");
    }).map(condition => `(${condition})`).join(" OR ");

    const packageConditions = patterns.map((_, index) => {
        const parameter = `$${index + 1}`;
        return [
            `ten_goi_thau ILIKE ${parameter}`,
            `ma_khlcnt ILIKE ${parameter}`,
            `ten_khlcnt ILIKE ${parameter}`,
            `facility_name ILIKE ${parameter}`,
            `facility_code ILIKE ${parameter}`,
        ].join(" OR ");
    }).map(condition => `(${condition})`).join(" OR ");

    const [planRows, packageRows] = await Promise.all([
        runFixedReadQuery<{
            plan_id: string;
            ten_khlcnt: string;
            ma_khlcnt: string | null;
            facility_id: string | null;
            facility_name: string | null;
            facility_code: string | null;
        }>(
            `SELECT plan_id, ten_khlcnt, ma_khlcnt, facility_id, facility_name, facility_code FROM ai_procurement_plans WHERE ${planConditions} ORDER BY updated_at DESC NULLS LAST LIMIT 40`,
            patterns
        ),
        runFixedReadQuery<{
            package_id: string;
            ten_goi_thau: string;
            ma_khlcnt: string | null;
            facility_id: string | null;
            facility_name: string | null;
            facility_code: string | null;
        }>(
            `SELECT package_id, ten_goi_thau, ma_khlcnt, facility_id, facility_name, facility_code FROM ai_procurement_packages WHERE ${packageConditions} ORDER BY updated_at DESC NULLS LAST LIMIT 40`,
            patterns
        ),
    ]);

    return [
        ...planRows.map(row => makeCandidate({
            type: "procurement_plan" as const,
            id: row.plan_id,
            name: row.ten_khlcnt,
            code: row.ma_khlcnt,
            question,
            metadata: {
                facility_id: row.facility_id,
                facility_name: row.facility_name,
                facility_code: row.facility_code,
            },
        })),
        ...packageRows.map(row => makeCandidate({
            type: "procurement_package" as const,
            id: row.package_id,
            name: row.ten_goi_thau,
            code: row.ma_khlcnt,
            question,
            metadata: {
                facility_id: row.facility_id,
                facility_name: row.facility_name,
                facility_code: row.facility_code,
            },
        })),
    ].filter((candidate): candidate is SafeDatabaseEntityCandidate => Boolean(candidate));
}

export async function resolveSafeDatabaseEntities(request: AIAgentRequest): Promise<SafeDatabaseEntityResolution> {
    const question = request.message;
    const normalized = normalizeVietnameseText(question);
    const warnings: string[] = [];
    const lookups: Array<Promise<SafeDatabaseEntityCandidate[]>> = [];

    if (hasAnyHint(normalized, FACILITY_HINT_WORDS) || hasAnyHint(normalized, PROCUREMENT_HINT_WORDS)) {
        lookups.push(lookupFacilityCandidates(question));
    }
    if (hasAnyHint(normalized, COMPANY_HINT_WORDS)) {
        lookups.push(lookupCompanyCandidates(question));
    }
    if (hasAnyHint(normalized, DRUG_HINT_WORDS)) {
        lookups.push(lookupDrugCandidates(question));
    }
    if (hasAnyHint(normalized, PROCUREMENT_HINT_WORDS)) {
        lookups.push(lookupProcurementCandidates(question));
    }

    if (lookups.length === 0 && extractEntitySearchTerms(question).length >= 2) {
        lookups.push(lookupFacilityCandidates(question));
    }

    const settled = await Promise.allSettled(lookups);
    const candidates = settled.flatMap(result => {
        if (result.status === "fulfilled") {
            return result.value;
        }
        warnings.push(result.reason instanceof Error ? result.reason.message : "Không thể resolve một nhóm thực thể");
        return [];
    });

    return {
        candidates: rankCandidates(candidates).map(compactEntityCandidate),
        warnings,
    };
}

function stripMarkdownFence(text: string) {
    return text
        .replace(/^```(?:json)?/i, "")
        .replace(/```$/i, "")
        .trim();
}

function parseGeneratedSql(text: string): GeneratedSafeSql {
    const cleaned = stripMarkdownFence(text);
    try {
        const parsed = JSON.parse(cleaned) as Record<string, unknown>;
        return {
            shouldQuery: parsed.shouldQuery === true,
            sql: typeof parsed.sql === "string" ? parsed.sql : undefined,
            reason: typeof parsed.reason === "string" ? parsed.reason : undefined,
        };
    } catch {
        throw new SafeDatabaseQueryError("AI_SQL_GENERATION_PARSE_ERROR", "Provider AI không trả về JSON SQL hợp lệ");
    }
}

function providerApiKey(provider: AIProviderName) {
    const config = getAIConfig();
    return provider === "google" ? config.googleApiKey : config.openaiApiKey;
}

export async function generateSafeDatabaseSql(
    request: AIAgentRequest,
    options: GenerateSafeDatabaseSqlOptions = {}
): Promise<GeneratedSafeSql> {
    const config = getAIConfig();
    const provider = config.primaryProvider;
    const model = config.primaryModel;
    const retryInstructions = options.retry
        ? [
            "The previous safe query returned zero rows. Generate one broader safe SELECT for the same question.",
            "Use resolved entity IDs/codes when available. If names are needed, use ILIKE with partial matching.",
            "Do not repeat the previous SQL unless it is already the broadest safe query.",
        ]
        : [];
    const modelRequest = {
        model,
        systemPrompt: [
            "You generate safe PostgreSQL SELECT queries for an admin analytics assistant.",
            "Return only JSON with keys: shouldQuery, sql, reason.",
            "Use only the provided ai_* views and columns.",
            "Never query application tables directly.",
            "Never include comments, multiple statements, DDL, DML, transaction statements, or sensitive identifiers.",
            "For human-entered Vietnamese names, prefer ILIKE with partial matching instead of LIKE or exact equality.",
            "If entityCandidates are provided and relevant, prefer stable IDs/codes such as facility_id, facility_code, company_id, ma_chung, plan_id, or package_id.",
            "For facility-specific questions, resolve through ai_facilities candidates and filter business views by facility_id or facility_code when possible.",
            "For LCNT, mua sắm, gói thầu, kế hoạch đấu thầu, TBMT, or kết quả thầu questions, prefer ai_procurement_* views.",
            `Always include LIMIT ${DEFAULT_LIMIT} unless the question asks for fewer rows.`,
            `Never use LIMIT greater than ${MAX_LIMIT}.`,
            "If the question can be answered without database rows, return shouldQuery false.",
            "If the requested data is outside the ai_* views, return shouldQuery false with a short reason.",
            ...retryInstructions,
            SAFE_SCHEMA_DESCRIPTION,
        ].join("\n"),
        prompt: JSON.stringify({
            question: request.message,
            context: request.context || {},
            entityCandidates: options.entityResolution?.candidates || [],
            entityResolutionWarnings: options.entityResolution?.warnings || [],
            retry: options.retry ? {
                previousSql: options.retry.previousSql,
                previousReferencedViews: options.retry.previousReferencedViews,
                previousRowCount: options.retry.previousRowCount,
                reason: options.retry.reason,
            } : undefined,
            outputExamples: [
                {
                    shouldQuery: true,
                    sql: "SELECT facility_name, facility_code, COUNT(plan_id) AS plan_count FROM ai_procurement_plans WHERE facility_code = '92118' GROUP BY facility_name, facility_code LIMIT 100",
                    reason: "Procurement plans for a resolved facility",
                },
                {
                    shouldQuery: true,
                    sql: "SELECT facility_name, facility_code FROM ai_facilities WHERE facility_name ILIKE '%phụ sản%' LIMIT 100",
                    reason: "Find facilities by partial human-entered name",
                },
                {
                    shouldQuery: false,
                    reason: "Question does not require database access",
                },
            ],
        }),
        maxOutputTokens: 700,
        signal: options.signal,
    };

    const response = provider === "google"
        ? await generateGoogleResponse(modelRequest, providerApiKey(provider))
        : await generateOpenAIResponse(modelRequest, providerApiKey(provider));

    return parseGeneratedSql(response.text);
}

function normalizeRelationName(rawName: string) {
    const withoutSchema = rawName
        .replace(/"/g, "")
        .split(".")
        .pop();
    return withoutSchema?.toLowerCase() || "";
}

function normalizeWhitespace(sql: string) {
    return sql.replace(/\s+/g, " ").trim();
}

function stripOptionalFinalSemicolon(sql: string) {
    const trimmed = sql.trim();
    const withoutFinal = trimmed.endsWith(";")
        ? trimmed.slice(0, -1).trim()
        : trimmed;
    if (withoutFinal.includes(";")) {
        throw new SafeDatabaseQueryError("AI_SQL_MULTI_STATEMENT", "AI database query chỉ được có một statement");
    }
    return withoutFinal;
}

function assertNoBlockedTerms(sql: string) {
    const lowered = sql.toLowerCase();
    if (/--|\/\*|\*\//.test(sql)) {
        throw new SafeDatabaseQueryError("AI_SQL_COMMENTS_BLOCKED", "AI database query không được chứa SQL comment");
    }

    for (const keyword of BLOCKED_KEYWORDS) {
        if (new RegExp(`\\b${keyword}\\b`, "i").test(sql)) {
            throw new SafeDatabaseQueryError("AI_SQL_UNSAFE_KEYWORD", `AI database query chứa keyword bị chặn: ${keyword}`);
        }
    }

    for (const identifier of BLOCKED_IDENTIFIERS) {
        if (lowered.includes(identifier)) {
            throw new SafeDatabaseQueryError("AI_SQL_SENSITIVE_IDENTIFIER", `AI database query tham chiếu định danh bị chặn: ${identifier}`);
        }
    }
}

function extractReferencedViews(sql: string): SafeViewName[] {
    if (/\b(from|join)\s*\(/i.test(sql)) {
        throw new SafeDatabaseQueryError("AI_SQL_SUBQUERY_BLOCKED", "AI database query không hỗ trợ subquery trong FROM/JOIN");
    }

    const relations = [...sql.matchAll(/\b(?:from|join)\s+((?:"?public"?\.)?"?[a-zA-Z_][a-zA-Z0-9_]*"?)/gi)]
        .map(match => normalizeRelationName(match[1]));
    if (relations.length === 0) {
        throw new SafeDatabaseQueryError("AI_SQL_NO_SAFE_VIEW", "AI database query phải đọc ít nhất một ai_* view");
    }

    const invalid = relations.filter(relation => !SAFE_VIEW_SET.has(relation));
    if (invalid.length > 0) {
        throw new SafeDatabaseQueryError("AI_SQL_UNSAFE_RELATION", `AI database query chỉ được đọc ai_* safe views: ${invalid.join(", ")}`);
    }

    return [...new Set(relations)] as SafeViewName[];
}

function enforceLimit(sql: string): { sql: string; warnings: string[] } {
    const warnings: string[] = [];
    const limitMatches = [...sql.matchAll(/\blimit\s+(\d+)\b/gi)];
    if (/\blimit\b/i.test(sql) && limitMatches.length === 0) {
        throw new SafeDatabaseQueryError("AI_SQL_INVALID_LIMIT", "LIMIT phải là số nguyên");
    }
    if (limitMatches.length > 1) {
        throw new SafeDatabaseQueryError("AI_SQL_MULTIPLE_LIMITS", "AI database query chỉ được có một LIMIT");
    }

    if (limitMatches.length === 0) {
        warnings.push(`AI_SQL_DEFAULT_LIMIT_${DEFAULT_LIMIT}`);
        return { sql: `${sql} LIMIT ${DEFAULT_LIMIT}`, warnings };
    }

    const limit = Number(limitMatches[0][1]);
    if (!Number.isInteger(limit) || limit <= 0) {
        throw new SafeDatabaseQueryError("AI_SQL_INVALID_LIMIT", "LIMIT phải là số nguyên dương");
    }

    if (limit > MAX_LIMIT) {
        warnings.push(`AI_SQL_LIMIT_CAPPED_${MAX_LIMIT}`);
        return {
            sql: sql.replace(/\blimit\s+\d+\b/i, `LIMIT ${MAX_LIMIT}`),
            warnings,
        };
    }

    return { sql, warnings };
}

export function validateSafeDatabaseSql(inputSql: string): ValidatedSafeSql {
    const noFinalSemicolon = stripOptionalFinalSemicolon(inputSql);
    const sql = normalizeWhitespace(noFinalSemicolon);
    if (!/^select\b/i.test(sql)) {
        throw new SafeDatabaseQueryError("AI_SQL_NOT_SELECT", "AI database query chỉ được là SELECT");
    }

    assertNoBlockedTerms(sql);
    const referencedViews = extractReferencedViews(sql);
    const limited = enforceLimit(sql);

    return {
        sql: limited.sql,
        referencedViews,
        warnings: limited.warnings,
    };
}

function sanitizeCell(value: unknown): unknown {
    if (value instanceof Date) {
        return value.toISOString();
    }
    if (typeof value === "bigint") {
        return value.toString();
    }
    if (typeof value === "string") {
        return value.length > MAX_CELL_LENGTH
            ? `${value.slice(0, MAX_CELL_LENGTH)}...`
            : value;
    }
    return value;
}

function sanitizeRows(rows: Record<string, unknown>[]) {
    return rows.map(row => Object.fromEntries(
        Object.entries(row).map(([key, value]) => [key, sanitizeCell(value)])
    ));
}

export async function executeSafeDatabaseSql(inputSql: string): Promise<SafeDatabaseQueryResult> {
    const validated = validateSafeDatabaseSql(inputSql);
    const startedAt = Date.now();
    const client = await getSafeDatabasePool().connect();

    try {
        await client.query("BEGIN READ ONLY");
        await client.query(`SET LOCAL statement_timeout = ${QUERY_TIMEOUT_MS}`);
        const result = await client.query(validated.sql);
        await client.query("COMMIT");

        return {
            ...validated,
            columns: result.fields.map(field => field.name),
            rows: sanitizeRows(result.rows as Record<string, unknown>[]),
            rowCount: result.rowCount || result.rows.length,
            durationMs: Date.now() - startedAt,
        };
    } catch (error) {
        await client.query("ROLLBACK").catch(() => undefined);
        if (error instanceof SafeDatabaseQueryError) {
            throw error;
        }
        throw new SafeDatabaseQueryError(
            "AI_SQL_EXECUTION_ERROR",
            error instanceof Error ? error.message : "Không thể chạy AI database query"
        );
    } finally {
        client.release();
    }
}
