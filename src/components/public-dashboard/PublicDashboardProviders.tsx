"use client";

import { SessionProvider } from "next-auth/react";
import { ChartColorProvider } from "@/components/dashboard/ChartColorProvider";

export default function PublicDashboardProviders({
    children,
    session,
}: {
    children: React.ReactNode;
    session: any;
}) {
    return (
        <SessionProvider session={session}>
            <ChartColorProvider apiUrl="/api/public/chart-colors">
                {children}
            </ChartColorProvider>
        </SessionProvider>
    );
}
