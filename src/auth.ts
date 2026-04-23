import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
    ...authConfig,
    debug: false,
    providers: [
        Credentials({
            name: "credentials",
            credentials: {
                username: { label: "Username", type: "text" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                try {
                    const username = credentials?.username?.toString().trim();
                    const password = credentials?.password?.toString();

                    if (!username || !password) {
                        return null;
                    }

                    const user = await prisma.user.findUnique({
                        where: { username },
                        include: {
                            company: {
                                select: {
                                    id: true,
                                    name: true,
                                    isActive: true,
                                },
                            },
                        },
                    });

                    if (!user) {
                        return null;
                    }

                    if (!user.isActive) {
                        return null;
                    }

                    if (user.role === "COMPANY") {
                        if (!user.companyId || !user.company?.isActive) {
                            return null;
                        }
                    }

                    const isPasswordValid = await bcrypt.compare(
                        password,
                        user.passwordHash
                    );

                    if (!isPasswordValid) {
                        return null;
                    }

                    return {
                        id: user.id,
                        name: user.role === "COMPANY"
                            ? user.company?.name || user.username
                            : user.facilityName || user.username,
                        email: user.username,
                        role: user.role,
                        facilityCode: user.facilityCode,
                        companyId: user.companyId,
                    };
                } catch (error) {
                    console.error("Login error", error);
                    throw error;
                }
            },
        }),
    ],
});
