import prisma from "@/lib/prisma";

interface LogActivityParams {
    userId: string;
    action: string;
    entityType: string;
    entityId?: string;
    details?: Record<string, unknown>;
}

/**
 * Log an activity (fire-and-forget)
 * This function does not throw errors - they are caught and logged
 */
export async function logActivity(params: LogActivityParams) {
    try {
        await prisma.activityLog.create({
            data: {
                userId: params.userId,
                action: params.action,
                entityType: params.entityType,
                entityId: params.entityId,
                details: params.details ? JSON.stringify(params.details) : null,
            },
        });
    } catch (error) {
        console.error("Failed to log activity:", error);
    }
}

// Action constants
export const ACTIONS = {
    LOGIN: "LOGIN",
    LOGOUT: "LOGOUT",
    CREATE: "CREATE",
    UPDATE: "UPDATE",
    DELETE: "DELETE",
    APPROVE: "APPROVE",
    REJECT: "REJECT",
    CONFIRM: "CONFIRM",
    EXPORT: "EXPORT",
    IMPORT: "IMPORT",
    SUBMIT: "SUBMIT",
    RECALL: "RECALL",
    AI_AGENT_DB_QUERY: "AI_AGENT_DB_QUERY",
} as const;

// Entity type constants
export const ENTITY_TYPES = {
    USER: "user",
    REPORT: "report",
    MAPPING: "mapping",
    MASTER_DRUG: "master_drug",
    COMPANY: "company",
    COMPANY_DRUG: "company_drug",
    DRUG_ORDER_SHIPMENT: "drug_order_shipment",
    DRUG_ORDER_RECEIPT: "drug_order_receipt",
    LCNT: "lcnt",
    GOI_THAU: "goi_thau",
    TBMT: "tbmt",
    KET_QUA: "ket_qua",
    REPORT_PERIOD: "report_period",
    NOTIFICATION: "notification",
    DRUG_ORDER: "drug_order",
    AI_AGENT_DB_QUERY: "ai_agent_db_query",
} as const;

// Vietnamese labels for display
export const ACTION_LABELS: Record<string, string> = {
    LOGIN: "Đăng nhập",
    LOGOUT: "Đăng xuất",
    CREATE: "Tạo mới",
    UPDATE: "Cập nhật",
    DELETE: "Xóa",
    APPROVE: "Phê duyệt",
    REJECT: "Từ chối",
    CONFIRM: "Xác nhận",
    EXPORT: "Xuất file",
    IMPORT: "Nhập file",
    SUBMIT: "Gửi",
    RECALL: "Thu hồi",
    AI_AGENT_DB_QUERY: "Truy vấn DB AI",
};

export const ENTITY_TYPE_LABELS: Record<string, string> = {
    user: "Người dùng",
    report: "Báo cáo tồn kho",
    mapping: "Ánh xạ thuốc",
    master_drug: "Danh mục thuốc",
    company: "Công ty",
    company_drug: "Thuốc công ty",
    drug_order_shipment: "Đợt giao đơn hàng",
    drug_order_receipt: "Biên nhận thực nhận",
    lcnt: "KH LCNT",
    goi_thau: "Gói thầu",
    tbmt: "Thông báo mời thầu",
    ket_qua: "Kết quả LCNT",
    report_period: "Kỳ báo cáo",
    notification: "Thông báo",
    drug_order: "Dự trù đặt hàng",
    ai_agent_db_query: "Truy vấn DB AI",
};
