import type { NextAuthConfig } from "next-auth";

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
    },
    trustHost: true,
} satisfies NextAuthConfig;
