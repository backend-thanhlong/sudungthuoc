import prisma from "@/lib/prisma";
import DashboardShell from "@/components/dashboard/DashboardShell";

export default async function AdminDashboard() {
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

    // Fetch facility list for filter dropdown
    const facilities = await prisma.user.findMany({
        where: { role: 'FACILITY', isActive: true },
        select: { id: true, facilityName: true, facilityType: true },
        orderBy: { facilityName: 'asc' },
    });

    return (
        <DashboardShell
            reportPeriods={reportPeriods.map(p => p.month)}
            facilities={facilities.map(f => ({
                id: f.id,
                name: f.facilityName || "Unknown",
                type: f.facilityType || "",
            }))}
        />
    );
}
