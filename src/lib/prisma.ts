import { PrismaClient } from "@/../prisma/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
    pool: pg.Pool | undefined;
};

function createPrismaClient() {
    const connectionString = process.env.DATABASE_URL;

    // During build time, DATABASE_URL might not be available
    // Return a basic PrismaClient that won't actually connect
    if (!connectionString) {
        if (process.env.NODE_ENV === 'production' && typeof window === 'undefined') {
            // This is server-side runtime, DATABASE_URL is required
            throw new Error("DATABASE_URL environment variable is not set");
        }
        // Build time or client-side, return basic client
        return new PrismaClient();
    }

    const pool = new pg.Pool({ connectionString });
    globalForPrisma.pool = pool;

    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
