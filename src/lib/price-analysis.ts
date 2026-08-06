import {
    MappingStatus,
    Prisma,
    Role,
} from "@/../prisma/generated/client";
import prisma from "@/lib/prisma";
import { normalizeOptionalText, toNumber } from "@/lib/drug-orders/utils";
import { RouteError, type ActiveUserRecord } from "@/lib/server-authz";

const PRICE_ANALYSIS_MAPPING_STATUSES = [
    MappingStatus.APPROVED,
    MappingStatus.AUTO_MAPPED,
] as const;

const PRICE_ANALYSIS_SELECT = {
    id: true,
    facilityId: true,
    maNoiBo: true,
    tenThuocNoiBo: true,
    hoatChatNoiBo: true,
    donViTinhNoiBo: true,
    giaVat: true,
    soQdTrungThau: true,
    tenCongTy: true,
    nhomTckt: true,
    facility: {
        select: {
            username: true,
            facilityName: true,
            facilityCode: true,
            facilityType: true,
        },
    },
    masterDrug: {
        select: {
            id: true,
            maChung: true,
            tenThuoc: true,
            hoatChat: true,
            hamLuong: true,
            dangBaoChe: true,
            soDangKy: true,
            quyCach: true,
            donViTinh: true,
        },
    },
} satisfies Prisma.FacilityDrugMapSelect;

type PriceAnalysisMapRecord = Prisma.FacilityDrugMapGetPayload<{
    select: typeof PRICE_ANALYSIS_SELECT;
}>;

type PricePointAccumulator = {
    facilityId: string;
    facilityName: string;
    facilityCode: string | null;
    facilityType: string | null;
    giaVat: number;
    mapIds: Set<string>;
    maNoiBos: Set<string>;
    internalDrugNames: Set<string>;
    units: Set<string>;
    companies: Set<string>;
    tenderNos: Set<string>;
    nhomTckts: Set<string>;
};

function assertCanViewPriceAnalysis(user: ActiveUserRecord) {
    if (user.role !== Role.ADMIN && user.role !== Role.FACILITY) {
        throw new RouteError(403, "Forbidden");
    }
}

function uniqueSorted(values: Iterable<string>) {
    return Array.from(new Set(Array.from(values).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b, "vi")
    );
}

function roundPercent(value: number) {
    return Math.round(value * 100) / 100;
}

function getFacilityName(row: PriceAnalysisMapRecord) {
    return (
        normalizeOptionalText(row.facility.facilityName) ||
        normalizeOptionalText(row.facility.facilityCode) ||
        row.facility.username
    );
}

function getDisplayUnit(row: PriceAnalysisMapRecord) {
    return (
        normalizeOptionalText(row.donViTinhNoiBo) ||
        normalizeOptionalText(row.masterDrug?.donViTinh) ||
        "Không rõ"
    );
}

function buildPricePoint(row: PriceAnalysisMapRecord): PricePointAccumulator {
    return {
        facilityId: row.facilityId,
        facilityName: getFacilityName(row),
        facilityCode: row.facility.facilityCode,
        facilityType: row.facility.facilityType,
        giaVat: toNumber(row.giaVat),
        mapIds: new Set([row.id]),
        maNoiBos: new Set([row.maNoiBo]),
        internalDrugNames: new Set([row.tenThuocNoiBo]),
        units: new Set([getDisplayUnit(row)]),
        companies: new Set(normalizeOptionalText(row.tenCongTy) ? [row.tenCongTy!] : []),
        tenderNos: new Set(normalizeOptionalText(row.soQdTrungThau) ? [row.soQdTrungThau!] : []),
        nhomTckts: new Set(normalizeOptionalText(row.nhomTckt) ? [row.nhomTckt!] : []),
    };
}

function mergePricePoint(point: PricePointAccumulator, row: PriceAnalysisMapRecord) {
    point.mapIds.add(row.id);
    point.maNoiBos.add(row.maNoiBo);
    point.internalDrugNames.add(row.tenThuocNoiBo);
    point.units.add(getDisplayUnit(row));
    const company = normalizeOptionalText(row.tenCongTy);
    const tenderNo = normalizeOptionalText(row.soQdTrungThau);
    const nhomTckt = normalizeOptionalText(row.nhomTckt);
    if (company) point.companies.add(company);
    if (tenderNo) point.tenderNos.add(tenderNo);
    if (nhomTckt) point.nhomTckts.add(nhomTckt);
}

export async function loadPriceAnalysisPayload(user: ActiveUserRecord) {
    assertCanViewPriceAnalysis(user);

    const mappings = await prisma.facilityDrugMap.findMany({
        where: {
            isActive: true,
            status: { in: [...PRICE_ANALYSIS_MAPPING_STATUSES] },
            masterDrugId: { not: null },
            giaVat: { gt: 0 },
        },
        select: PRICE_ANALYSIS_SELECT,
        orderBy: [
            { masterDrugId: "asc" },
            { facility: { facilityName: "asc" } },
            { giaVat: "asc" },
        ],
    });

    const groups = new Map<string, PriceAnalysisMapRecord[]>();
    for (const row of mappings) {
        if (!row.masterDrug?.id) continue;
        const rows = groups.get(row.masterDrug.id) || [];
        rows.push(row);
        groups.set(row.masterDrug.id, rows);
    }

    const items = Array.from(groups.values())
        .map((rows) => {
            const first = rows[0];
            const masterDrug = first.masterDrug!;
            const pointMap = new Map<string, PricePointAccumulator>();

            for (const row of rows) {
                const price = toNumber(row.giaVat);
                const key = `${row.facilityId}|||${price}`;
                const existing = pointMap.get(key);
                if (existing) {
                    mergePricePoint(existing, row);
                } else {
                    pointMap.set(key, buildPricePoint(row));
                }
            }

            const pricePoints = Array.from(pointMap.values())
                .map((point) => ({
                    facilityId: point.facilityId,
                    facilityName: point.facilityName,
                    facilityCode: point.facilityCode,
                    facilityType: point.facilityType,
                    giaVat: point.giaVat,
                    mapCount: point.mapIds.size,
                    maNoiBos: uniqueSorted(point.maNoiBos),
                    internalDrugNames: uniqueSorted(point.internalDrugNames),
                    units: uniqueSorted(point.units),
                    companies: uniqueSorted(point.companies),
                    tenderNos: uniqueSorted(point.tenderNos),
                    nhomTckts: uniqueSorted(point.nhomTckts),
                }))
                .sort((left, right) =>
                    left.giaVat - right.giaVat ||
                    left.facilityName.localeCompare(right.facilityName, "vi")
                );

            const distinctPrices = uniqueSorted(
                pricePoints.map((point) => String(point.giaVat))
            ).map(Number);

            if (distinctPrices.length < 2) {
                return null;
            }

            const minPrice = Math.min(...distinctPrices);
            const maxPrice = Math.max(...distinctPrices);
            const variancePercent = minPrice > 0
                ? roundPercent(((maxPrice - minPrice) / minPrice) * 100)
                : 0;
            const allUnits = uniqueSorted(pricePoints.flatMap((point) => point.units));
            const facilityIds = new Set(pricePoints.map((point) => point.facilityId));

            return {
                masterDrugId: masterDrug.id,
                maChung: masterDrug.maChung,
                tenThuoc: masterDrug.tenThuoc,
                hoatChat: masterDrug.hoatChat,
                hamLuong: masterDrug.hamLuong,
                dangBaoChe: masterDrug.dangBaoChe,
                soDangKy: masterDrug.soDangKy,
                quyCach: masterDrug.quyCach,
                donViTinh: masterDrug.donViTinh,
                minPrice,
                maxPrice,
                priceSpread: maxPrice - minPrice,
                variancePercent,
                priceLevelCount: distinctPrices.length,
                facilityCount: facilityIds.size,
                lineCount: pricePoints.reduce((sum, point) => sum + point.mapCount, 0),
                unitMismatch: allUnits.length > 1,
                units: allUnits,
                pricePoints,
            };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
        .sort((left, right) =>
            right.variancePercent - left.variancePercent ||
            right.priceSpread - left.priceSpread ||
            left.maChung.localeCompare(right.maChung, "vi")
        );

    const facilityIds = new Set(
        items.flatMap((item) => item.pricePoints.map((point) => point.facilityId))
    );
    const maxVarianceItem = items[0] || null;

    return {
        kpis: {
            drugCount: items.length,
            facilityCount: facilityIds.size,
            priceLineCount: items.reduce((sum, item) => sum + item.pricePoints.length, 0),
            maxVariancePercent: maxVarianceItem?.variancePercent || 0,
            maxPriceSpread: maxVarianceItem?.priceSpread || 0,
        },
        items,
        meta: {
            source: "facility_drug_maps",
            statuses: [...PRICE_ANALYSIS_MAPPING_STATUSES],
            excludesZeroPrice: true,
        },
    };
}
