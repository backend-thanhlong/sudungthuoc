import { headers } from "next/headers";
import { redirect } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import SessionProviderWrapper from "@/components/SessionProviderWrapper";
import {
    buildFreshSession,
    getDashboardRedirectPath,
    isRouteError,
    requireActiveSessionUser,
} from "@/lib/server-authz";

async function getDashboardSessionOrRedirect() {
    try {
        const { session, user } = await requireActiveSessionUser();
        const requestHeaders = await headers();
        const pathname = requestHeaders.get("x-pathname") || "/dashboard";
        const redirectPath = getDashboardRedirectPath(user.role, pathname);

        if (redirectPath) {
            redirect(redirectPath);
        }

        return buildFreshSession(session, user);
    } catch (error: unknown) {
        if (isRouteError(error) && (error.status === 401 || error.status === 403)) {
            redirect("/login?reauth=1");
        }

        throw error;
    }
}

export default async function Layout({ children }: { children: React.ReactNode }) {
    const freshSession = await getDashboardSessionOrRedirect();

    return (
        <SessionProviderWrapper session={freshSession}>
            <DashboardLayout>{children}</DashboardLayout>
        </SessionProviderWrapper>
    );
}
