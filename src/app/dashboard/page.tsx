import { redirect } from "next/navigation";
import { isRouteError, requireActiveSessionUser } from "@/lib/server-authz";

export default async function DashboardPage() {
    try {
        const { user } = await requireActiveSessionUser();

        if (user.role === "ADMIN") {
            redirect("/dashboard/admin");
        } else {
            redirect("/dashboard/facility");
        }
    } catch (error: unknown) {
        if (isRouteError(error) && (error.status === 401 || error.status === 403)) {
            redirect("/login?reauth=1");
        }

        throw error;
    }
}
