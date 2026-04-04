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
                console.log("Login attempt for:", credentials?.username);
                try {
                    if (!credentials?.username || !credentials?.password) {
                        console.log("Missing credentials");
                        return null;
                    }

                    const user = await prisma.user.findUnique({
                        where: { username: credentials.username as string },
                    });

                    if (!user) {
                        console.log("User not found");
                        return null;
                    }

                    if (!user.isActive) {
                        console.log("User inactive");
                        return null;
                    }


                    const isPasswordValid = await bcrypt.compare(
                        credentials.password as string,
                        user.passwordHash
                    );

                    if (!isPasswordValid) {
                        console.log("Invalid password");
                        return null;
                    }

                    console.log("Login successful for:", user.username);
                    return {
                        id: user.id,
                        name: user.facilityName || user.username,
                        email: user.username,
                        role: user.role,
                        facilityCode: user.facilityCode,
                    };
                } catch (error) {
                    console.error("Login critical error:", error);
                    throw error;
                }
            },
        }),
    ],
});
