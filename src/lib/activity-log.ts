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
    EXPORT: "EXPORT",
    IMPORT: "IMPORT",
    SUBMIT: "SUBMIT",
} as const;

// Entity type constants
export const ENTITY_TYPES = {
    USER: "user",
    REPORT: "report",
    MAPPING: "mapping",
    MASTER_DRUG: "master_drug",
    LCNT: "lcnt",
    GOI_THAU: "goi_thau",
    TBMT: "tbmt",
    KET_QUA: "ket_qua",
    REPORT_PERIOD: "report_period",
    NOTIFICATION: "notification",
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
    EXPORT: "Xuất file",
    IMPORT: "Nhập file",
    SUBMIT: "Gửi",
};

export const ENTITY_TYPE_LABELS: Record<string, string> = {
    user: "Người dùng",
    report: "Báo cáo tồn kho",
    mapping: "Ánh xạ thuốc",
    master_drug: "Danh mục thuốc",
    lcnt: "KH LCNT",
    goi_thau: "Gói thầu",
    tbmt: "Thông báo mời thầu",
    ket_qua: "Kết quả LCNT",
    report_period: "Kỳ báo cáo",
    notification: "Thông báo",
};
