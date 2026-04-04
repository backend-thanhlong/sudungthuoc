import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
    const { pathname } = req.nextUrl;
    const isLoggedIn = !!req.auth;
    const userRole = (req.auth?.user as any)?.role;

    // Public routes
    const publicRoutes = ["/login", "/"];

    // Check if route is public
    if (publicRoutes.includes(pathname)) {
        if (isLoggedIn && pathname === "/login") {
            // Redirect logged in users away from login page
            const redirectUrl = userRole === "ADMIN" ? "/dashboard/admin" : "/dashboard/facility";
            return NextResponse.redirect(new URL(redirectUrl, req.url));
        }
        return NextResponse.next();
    }

    // Protected routes - require authentication
    if (!isLoggedIn) {
        return NextResponse.redirect(new URL("/login", req.url));
    }

    // Admin routes protection (with exception for master-drugs which is shared)
    if (pathname.startsWith("/dashboard/admin") && userRole !== "ADMIN") {
        // Allow facility users to view master-drugs (read-only)
        if (pathname.startsWith("/dashboard/admin/master-drugs")) {
            return NextResponse.next();
        }
        return NextResponse.redirect(new URL("/dashboard/facility", req.url));
    }

    // Facility routes protection
    if (pathname.startsWith("/dashboard/facility") && userRole !== "FACILITY") {
        return NextResponse.redirect(new URL("/dashboard/admin", req.url));
    }

    return NextResponse.next();
});

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg)$).*)"],
};
