import "dotenv/config";
import { type Prisma } from "@/../prisma/generated/client";
import prisma from "@/lib/prisma";

type GoiThauBackfillRecord = {
    id: string;
    tenGoiThau: string;
    giaGoiThau: Prisma.Decimal | null;
    phanLos: Array<{
        thanhTien: Prisma.Decimal | null;
    }>;
};

function parseArgs(argv: string[]) {
    const supportedArgs = new Set(["--dry-run"]);
    const unsupportedArgs = argv.filter((arg) => !supportedArgs.has(arg));

    if (unsupportedArgs.length > 0) {
        throw new Error(`Unsupported argument(s): ${unsupportedArgs.join(", ")}`);
    }

    return {
        dryRun: argv.includes("--dry-run"),
    };
}

function calculateGiaGoiThau(phanLos: GoiThauBackfillRecord["phanLos"]) {
    let total: Prisma.Decimal | null = null;

    for (const phanLo of phanLos) {
        if (phanLo.thanhTien === null) {
            continue;
        }

        total = total ? total.plus(phanLo.thanhTien) : phanLo.thanhTien;
    }

    return total;
}

function isSameGiaGoiThau(
    currentValue: Prisma.Decimal | null,
    nextValue: Prisma.Decimal | null
) {
    if (currentValue === null && nextValue === null) {
        return true;
    }

    if (currentValue === null || nextValue === null) {
        return false;
    }

    return currentValue.equals(nextValue);
}

function formatGiaGoiThau(value: Prisma.Decimal | null) {
    return value?.toString() ?? "null";
}

async function main() {
    const { dryRun } = parseArgs(process.argv.slice(2));

    console.log(`Starting backfill GoiThau.giaGoiThau in ${dryRun ? "dry-run" : "write"} mode...`);

    const goiThaus = await prisma.goiThau.findMany({
        select: {
            id: true,
            tenGoiThau: true,
            giaGoiThau: true,
            phanLos: {
                select: {
                    thanhTien: true,
                },
            },
        },
        orderBy: {
            createdAt: "asc",
        },
    });

    let checkedCount = 0;
    let updatedCount = 0;
    let unchangedCount = 0;
    let nullifiedCount = 0;

    for (const goiThau of goiThaus) {
        checkedCount += 1;

        const giaGoiThauMoi = calculateGiaGoiThau(goiThau.phanLos);

        if (isSameGiaGoiThau(goiThau.giaGoiThau, giaGoiThauMoi)) {
            unchangedCount += 1;
            continue;
        }

        updatedCount += 1;

        if (giaGoiThauMoi === null) {
            nullifiedCount += 1;
        }

        console.log(
            [
                dryRun ? "[DRY-RUN]" : "[UPDATE]",
                `goiThauId=${goiThau.id}`,
                `tenGoiThau=${JSON.stringify(goiThau.tenGoiThau)}`,
                `giaGoiThauCu=${formatGiaGoiThau(goiThau.giaGoiThau)}`,
                `giaGoiThauMoi=${formatGiaGoiThau(giaGoiThauMoi)}`,
            ].join(" ")
        );

        if (dryRun) {
            continue;
        }

        await prisma.goiThau.update({
            where: { id: goiThau.id },
            data: {
                giaGoiThau: giaGoiThauMoi,
            },
        });
    }

    console.log("");
    console.log("Backfill summary:");
    console.log(`- mode: ${dryRun ? "dry-run" : "write"}`);
    console.log(`- checked: ${checkedCount}`);
    console.log(`- updated: ${updatedCount}`);
    console.log(`- unchanged: ${unchangedCount}`);
    console.log(`- nullified: ${nullifiedCount}`);
}

main()
    .catch((error) => {
        console.error("Failed to backfill GoiThau.giaGoiThau:", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
