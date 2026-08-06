import type { NextAuthConfig } from "next-auth";

const DEFAULT_SESSION_IDLE_TIMEOUT_SECONDS = 4 * 60 * 60;

function parseSessionIdleTimeoutSeconds(value: string | undefined) {
    if (!value) {
        return DEFAULT_SESSION_IDLE_TIMEOUT_SECONDS;
    }

    const parsedValue = Number(value);

    if (!Number.isFinite(parsedValue)) {
        return DEFAULT_SESSION_IDLE_TIMEOUT_SECONDS;
    }

    const seconds = Math.floor(parsedValue);

    return seconds >= 60 ? seconds : DEFAULT_SESSION_IDLE_TIMEOUT_SECONDS;
}

export const SESSION_IDLE_TIMEOUT_SECONDS = parseSessionIdleTimeoutSeconds(
    process.env.AUTH_SESSION_IDLE_TIMEOUT_SECONDS
);

export const authConfig = {
    providers: [],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = (user as any).role;
                token.facilityCode = (user as any).facilityCode;
                token.companyId = (user as any).companyId;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as string;
                session.user.facilityCode = token.facilityCode as string | null;
                session.user.companyId = token.companyId as string | null;
            }
            return session;
        },
    },
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt",
        maxAge: SESSION_IDLE_TIMEOUT_SECONDS,
    },
    jwt: {
        maxAge: SESSION_IDLE_TIMEOUT_SECONDS,
    },
    trustHost: true,
} satisfies NextAuthConfig;
