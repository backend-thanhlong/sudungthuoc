import { auth } from "@/auth";
import DashboardLayout from "@/components/DashboardLayout";
import SessionProviderWrapper from "@/components/SessionProviderWrapper";

export default async function Layout({ children }: { children: React.ReactNode }) {
    const session = await auth();

    return (
        <SessionProviderWrapper session={session}>
            <DashboardLayout>{children}</DashboardLayout>
        </SessionProviderWrapper>
    );
}
