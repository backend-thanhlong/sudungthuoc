import prisma from "@/lib/prisma";

interface CreateNotificationParams {
    userId: string;
    type: string;
    title: string;
    message: string;
    entityType?: string;
    entityId?: string;
    entityUrl?: string;
}

/**
 * Create a notification for a specific user
 * Fire-and-forget: errors are logged but don't block the main flow
 */
export async function createNotification(params: CreateNotificationParams) {
    try {
        await prisma.notification.create({
            data: {
                userId: params.userId,
                type: params.type,
                title: params.title,
                message: params.message,
                entityType: params.entityType,
                entityId: params.entityId,
                entityUrl: params.entityUrl,
            },
        });
    } catch (error) {
        console.error("Failed to create notification:", error);
    }
}

/**
 * Create notifications for all admin users
 */
export async function createNotificationForAdmins(
    type: string,
    title: string,
    message: string,
    entityType?: string,
    entityId?: string,
    entityUrl?: string
) {
    try {
        const admins = await prisma.user.findMany({
            where: { role: "ADMIN", isActive: true },
            select: { id: true },
        });

        await prisma.notification.createMany({
            data: admins.map((admin) => ({
                userId: admin.id,
                type,
                title,
                message,
                entityType,
                entityId,
                entityUrl,
            })),
        });
    } catch (error) {
        console.error("Failed to create admin notifications:", error);
    }
}

/**
 * Create a notification for a specific facility user
 */
export async function createNotificationForFacility(
    facilityId: string,
    type: string,
    title: string,
    message: string,
    entityType?: string,
    entityId?: string,
    entityUrl?: string
) {
    return createNotification({
        userId: facilityId,
        type,
        title,
        message,
        entityType,
        entityId,
        entityUrl,
    });
}

/**
 * Create notifications for all active users of a company
 */
export async function createNotificationForCompany(
    companyId: string,
    type: string,
    title: string,
    message: string,
    entityType?: string,
    entityId?: string,
    entityUrl?: string
) {
    try {
        const companyUsers = await prisma.user.findMany({
            where: {
                role: "COMPANY",
                companyId,
                isActive: true,
            },
            select: { id: true },
        });

        if (companyUsers.length === 0) {
            return;
        }

        await prisma.notification.createMany({
            data: companyUsers.map((user) => ({
                userId: user.id,
                type,
                title,
                message,
                entityType,
                entityId,
                entityUrl,
            })),
        });
    } catch (error) {
        console.error("Failed to create company notifications:", error);
    }
}

/**
 * Create notifications for all active facility users
 */
export async function createNotificationForAllFacilities(
    type: string,
    title: string,
    message: string,
    entityType?: string,
    entityId?: string,
    entityUrl?: string
) {
    try {
        const facilities = await prisma.user.findMany({
            where: { role: "FACILITY", isActive: true },
            select: { id: true },
        });

        await prisma.notification.createMany({
            data: facilities.map((facility) => ({
                userId: facility.id,
                type,
                title,
                message,
                entityType,
                entityId,
                entityUrl,
            })),
        });
    } catch (error) {
        console.error("Failed to create facility notifications:", error);
    }
}
