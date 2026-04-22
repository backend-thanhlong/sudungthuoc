import "dotenv/config";
import prisma from "@/lib/prisma";

async function main() {
    const reportGroups = await prisma.inventoryReport.groupBy({
        by: ["facilityId", "reportMonth"],
        _count: { id: true },
        _min: { createdAt: true },
        _max: { updatedAt: true },
    });

    let createdCount = 0;

    for (const group of reportGroups) {
        await prisma.facilityReportSubmission.upsert({
            where: {
                facilityId_reportMonth: {
                    facilityId: group.facilityId,
                    reportMonth: group.reportMonth,
                },
            },
            update: {
                submittedAt: group._min.createdAt ?? group._max.updatedAt ?? new Date(),
                reportedRowCount: group._count.id,
                skippedRowCount: 0,
            },
            create: {
                facilityId: group.facilityId,
                reportMonth: group.reportMonth,
                submittedAt: group._min.createdAt ?? group._max.updatedAt ?? new Date(),
                reportedRowCount: group._count.id,
                skippedRowCount: 0,
            },
        });

        createdCount += 1;
    }

    console.log(`Backfilled ${createdCount} facility report submission header(s).`);
}

main()
    .catch((error) => {
        console.error("Failed to backfill facility report submissions:", error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
