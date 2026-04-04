import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import FacilityDashboardShell from "@/components/dashboard/FacilityDashboardShell";

export default async function FacilityDashboard() {
    const session = await auth();
    if (!session?.user?.id) return null;

    // Fetch available report periods for the month selector
    const reportPeriods = await prisma.reportPeriod.findMany({
        orderBy: [
            { year: 'desc' },
            { periodMonth: 'desc' }
        ],
        select: {
            month: true,
        },
    });

    return (
        <FacilityDashboardShell
            reportPeriods={reportPeriods.map(p => p.month)}
            facilityName={session.user.name || "Đơn vị"}
        />
    );
}
