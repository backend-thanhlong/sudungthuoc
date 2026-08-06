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
import { getSystemMaintenanceState } from "@/lib/system-maintenance";

async function getDashboardSessionOrRedirect() {
    try {
        const { session, user } = await requireActiveSessionUser();
        const requestHeaders = await headers();
        const pathname = requestHeaders.get("x-pathname") || "/dashboard";
        const redirectPath = getDashboardRedirectPath(user.role, pathname);

        if (redirectPath) {
            redirect(redirectPath);
        }

        return {
            session: buildFreshSession(session, user),
            user,
        };
    } catch (error: unknown) {
        if (isRouteError(error) && (error.status === 401 || error.status === 403)) {
            redirect("/login?reauth=1");
        }

        throw error;
    }
}

function MaintenanceScreen({ message }: { message: string }) {
    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
            <section className="w-full max-w-lg rounded-lg border bg-white p-8 text-center shadow-sm">
                <h1 className="text-2xl font-semibold text-slate-900">Hệ thống đang bảo trì</h1>
                <p className="mt-3 text-base text-slate-600">{message}</p>
            </section>
        </main>
    );
}

export default async function Layout({ children }: { children: React.ReactNode }) {
    const { session: freshSession, user } = await getDashboardSessionOrRedirect();
    const maintenance = await getSystemMaintenanceState();

    if (maintenance.enabled && user.role !== "ADMIN") {
        return <MaintenanceScreen message={maintenance.message} />;
    }

    return (
        <SessionProviderWrapper session={freshSession}>
            <DashboardLayout>{children}</DashboardLayout>
        </SessionProviderWrapper>
    );
}
