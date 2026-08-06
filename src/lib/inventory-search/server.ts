import { prisma } from "@/lib/prisma";
import { Prisma } from "../../../prisma/generated/client";
import type {
    CompareFacilityValue,
    CompareMetric,
    DrugFacilityStock,
    DrugOption,
    DrugSearchItem,
    DrugSearchResponse,
    DrugSortOption,
    FacilityInventoryItem,
    FacilitySearchResponse,
    FacilitySortOption,
    FacilityCompareResponse,
    InventoryFacilityOption,
    InventorySnapshotRow,
} from "./types";

interface LatestInventoryReportRow {
    facility_id: string;
    map_id: string;
    report_month: string;
    ton_cuoi: number;
    gia_vat: number;
}

interface PaginationArgs {
    page: number;
    limit: number;
}

interface SearchableDrugFields {
    drugCode?: string;
    drugName?: string;
    activeIngredient?: string;
    dosage?: string;
    maChung?: string;
    tenThuoc?: string;
    hoatChat?: string;
    hamLuong?: string;
}

const normalizeSearchValue = (value: string) =>
    value
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        .trim();

const compareText = (left: string, right: string) => left.localeCompare(right, "vi");

const mergeUniqueDisplayValue = (current: string, next: string) => {
    const trimmedNext = next.trim();
    if (!trimmedNext) return current;

    const values = current
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

    if (values.includes(trimmedNext)) {
        return current;
    }

    return [...values, trimmedNext].join(", ");
};

const isControlledSpecialDrug = (value: string) => {
    const normalized = normalizeSearchValue(value);
    return Boolean(normalized && normalized !== "khong" && normalized !== "false" && normalized !== "0");
};

const matchesDrugTypeFilters = (
    row: InventorySnapshotRow,
    filters: { controlledSpecial?: boolean; rareDrug?: boolean }
) => {
    if (!filters.controlledSpecial && !filters.rareDrug) {
        return true;
    }

    return Boolean(
        (filters.controlledSpecial && isControlledSpecialDrug(row.kiemSoatDacBiet))
        || (filters.rareDrug && row.isThuocHiem)
    );
};

export const getReportMonthSortValue = (reportMonth: string | null | undefined) => {
    if (!reportMonth) return 0;

    if (/^\d{2}\/\d{4}$/.test(reportMonth)) {
        const [month, year] = reportMonth.split("/").map(Number);
        return year * 100 + month;
    }

    if (/^\d{4}-\d{2}$/.test(reportMonth)) {
        const [year, month] = reportMonth.split("-").map(Number);
        return year * 100 + month;
    }

    if (/^\d{4}\/\d{2}$/.test(reportMonth)) {
        const [year, month] = reportMonth.split("/").map(Number);
        return year * 100 + month;
    }

    return 0;
};

const paginate = <T>(items: T[], { page, limit }: PaginationArgs) => {
    const offset = (page - 1) * limit;
    return {
        total: items.length,
        results: items.slice(offset, offset + limit),
    };
};

const matchesDrugQuery = (row: SearchableDrugFields, query: string) => {
    const normalizedQuery = normalizeSearchValue(query);
    if (!normalizedQuery) return true;

    const searchableFields = "drugCode" in row
        ? [row.drugCode, row.drugName, row.activeIngredient, row.dosage]
        : [row.maChung, row.tenThuoc, row.hoatChat, row.hamLuong];

    return searchableFields.some((field) => normalizeSearchValue(field || "").includes(normalizedQuery));
};

const sortDrugFacilities = (facilities: DrugFacilityStock[]) =>
    facilities.sort((left, right) => {
        if (right.currentStock !== left.currentStock) {
            return right.currentStock - left.currentStock;
        }
        return compareText(left.facilityName, right.facilityName);
    });

const getDrugGroupKey = (row: { masterDrugId: string | null; drugCode: string }) =>
    row.masterDrugId ? `master:${row.masterDrugId}` : `local:${row.drugCode}`;

export async function listInventoryFacilities(): Promise<InventoryFacilityOption[]> {
    const facilities = await prisma.user.findMany({
        where: {
            role: "FACILITY",
            isActive: true,
        },
        select: {
            id: true,
            facilityCode: true,
            facilityName: true,
            facilityType: true,
        },
        orderBy: {
            facilityName: "asc",
        },
    });

    return facilities.map((facility) => ({
        id: facility.id,
        facilityCode: facility.facilityCode || "",
        facilityName: facility.facilityName || facility.facilityCode || "Không rõ cơ sở",
        facilityType: facility.facilityType || "",
    }));
}

export async function getInventorySnapshot(params?: {
    facilityIds?: string[];
}): Promise<InventorySnapshotRow[]> {
    const facilityIds = params?.facilityIds?.filter(Boolean) || [];
    const facilityFilter = facilityIds.length > 0
        ? Prisma.sql`AND ir.facility_id IN (${Prisma.join(facilityIds)})`
        : Prisma.empty;

    const latestReports = await prisma.$queryRaw<LatestInventoryReportRow[]>(Prisma.sql`
        SELECT DISTINCT ON (ir.facility_id, ir.map_id)
            ir.facility_id,
            ir.map_id,
            ir.report_month,
            ir.ton_cuoi,
            ir.gia_vat
        FROM inventory_reports ir
        WHERE ir.status = 'APPROVED'
          AND ir.ton_cuoi > 0
          ${facilityFilter}
        ORDER BY ir.facility_id, ir.map_id, ir.report_month DESC
    `);

    if (latestReports.length === 0) {
        return [];
    }

    const mappings = await prisma.facilityDrugMap.findMany({
        where: {
            id: {
                in: latestReports.map((report) => report.map_id),
            },
        },
        include: {
            masterDrug: true,
            facility: {
                select: {
                    id: true,
                    facilityCode: true,
                    facilityName: true,
                    facilityType: true,
                },
            },
        },
    });

    const mappingById = new Map(mappings.map((mapping) => [mapping.id, mapping]));

    return latestReports.flatMap((report) => {
        const mapping = mappingById.get(report.map_id);
        if (!mapping) return [];

        return [{
            facilityId: mapping.facility.id,
            facilityCode: mapping.facility.facilityCode || "",
            facilityName: mapping.facility.facilityName || mapping.facility.facilityCode || "Không rõ cơ sở",
            facilityType: mapping.facility.facilityType || "",
            mapId: mapping.id,
            masterDrugId: mapping.masterDrugId,
            drugCode: mapping.masterDrug?.maChung || mapping.maNoiBo,
            drugName: mapping.masterDrug?.tenThuoc || mapping.tenThuocNoiBo,
            activeIngredient: mapping.masterDrug?.hoatChat || mapping.hoatChatNoiBo || "",
            dosage: mapping.masterDrug?.hamLuong || "",
            nhomTckt: mapping.nhomTckt || "",
            kiemSoatDacBiet: mapping.masterDrug?.kiemSoatDacBiet || "",
            isThuocHiem: Boolean(mapping.masterDrug?.isThuocHiem),
            soDangKy: mapping.masterDrug?.soDangKy || mapping.soDangKyNoiBo || "",
            unit: mapping.masterDrug?.donViTinh || mapping.donViTinhNoiBo || "",
            currentStock: Number(report.ton_cuoi),
            priceVAT: Number(report.gia_vat),
            reportMonth: report.report_month,
        }];
    });
}

export async function searchInventoryByDrug(params: {
    query: string;
    page: number;
    limit: number;
    sort: DrugSortOption;
    controlledSpecial?: boolean;
    rareDrug?: boolean;
}): Promise<DrugSearchResponse> {
    const snapshot = await getInventorySnapshot();
    const filteredRows = snapshot.filter((row) =>
        matchesDrugQuery(row, params.query)
        && matchesDrugTypeFilters(row, {
            controlledSpecial: params.controlledSpecial,
            rareDrug: params.rareDrug,
        })
    );
    const grouped = new Map<string, DrugSearchItem>();

    filteredRows.forEach((row) => {
        const key = getDrugGroupKey(row);
        const existing = grouped.get(key);

        if (!existing) {
            grouped.set(key, {
                masterDrugId: row.masterDrugId,
                drugCode: row.drugCode,
                drugName: row.drugName,
                activeIngredient: row.activeIngredient,
                dosage: row.dosage,
                nhomTckt: row.nhomTckt,
                kiemSoatDacBiet: row.kiemSoatDacBiet,
                isThuocHiem: row.isThuocHiem,
                soDangKy: row.soDangKy,
                unit: row.unit,
                facilities: [{
                    facilityId: row.facilityId,
                    facilityCode: row.facilityCode,
                    facilityName: row.facilityName,
                    facilityType: row.facilityType,
                    nhomTckt: row.nhomTckt,
                    currentStock: row.currentStock,
                    priceVAT: row.priceVAT,
                    reportMonth: row.reportMonth,
                }],
                totalStock: row.currentStock,
                facilityCount: 1,
            });
            return;
        }

        existing.totalStock += row.currentStock;
        if (!existing.soDangKy && row.soDangKy) {
            existing.soDangKy = row.soDangKy;
        }
        existing.nhomTckt = mergeUniqueDisplayValue(existing.nhomTckt, row.nhomTckt);
        existing.kiemSoatDacBiet = mergeUniqueDisplayValue(existing.kiemSoatDacBiet, row.kiemSoatDacBiet);
        existing.isThuocHiem = existing.isThuocHiem || row.isThuocHiem;

        const existingFacility = existing.facilities.find((facility) => facility.facilityId === row.facilityId);
        if (!existingFacility) {
            existing.facilities.push({
                facilityId: row.facilityId,
                facilityCode: row.facilityCode,
                facilityName: row.facilityName,
                facilityType: row.facilityType,
                nhomTckt: row.nhomTckt,
                currentStock: row.currentStock,
                priceVAT: row.priceVAT,
                reportMonth: row.reportMonth,
            });
            existing.facilityCount = existing.facilities.length;
            return;
        }

        existingFacility.currentStock += row.currentStock;
        if (getReportMonthSortValue(row.reportMonth) >= getReportMonthSortValue(existingFacility.reportMonth)) {
            existingFacility.reportMonth = row.reportMonth;
            existingFacility.priceVAT = row.priceVAT;
        }
    });

    const results = Array.from(grouped.values()).map((item) => ({
        ...item,
        facilityCount: item.facilities.length,
        facilities: sortDrugFacilities(item.facilities),
    }));

    results.sort((left, right) => {
        switch (params.sort) {
            case "totalStockDesc":
                if (right.totalStock !== left.totalStock) {
                    return right.totalStock - left.totalStock;
                }
                return compareText(left.drugName, right.drugName);
            case "facilityCountDesc":
                if (right.facilityCount !== left.facilityCount) {
                    return right.facilityCount - left.facilityCount;
                }
                return compareText(left.drugName, right.drugName);
            case "drugNameAsc":
            default:
                return compareText(left.drugName, right.drugName);
        }
    });

    const paginated = paginate(results, params);
    return {
        results: paginated.results,
        total: paginated.total,
        page: params.page,
        limit: params.limit,
    };
}

export async function searchInventoryByFacility(params: {
    facilityId: string;
    query: string;
    page: number;
    limit: number;
    sort: FacilitySortOption;
}): Promise<FacilitySearchResponse> {
    const [facilities, snapshot] = await Promise.all([
        listInventoryFacilities(),
        getInventorySnapshot({ facilityIds: [params.facilityId] }),
    ]);

    const facility = facilities.find((item) => item.id === params.facilityId) || null;

    const groupedAll = new Map<string, FacilityInventoryItem>();
    snapshot.forEach((row) => {
        const key = getDrugGroupKey(row);
        const existing = groupedAll.get(key);

        if (!existing) {
            groupedAll.set(key, {
                masterDrugId: row.masterDrugId,
                drugCode: row.drugCode,
                drugName: row.drugName,
                activeIngredient: row.activeIngredient,
                dosage: row.dosage,
                nhomTckt: row.nhomTckt,
                isThuocHiem: row.isThuocHiem,
                soDangKy: row.soDangKy,
                unit: row.unit,
                currentStock: row.currentStock,
                priceVAT: row.priceVAT,
                reportMonth: row.reportMonth,
            });
            return;
        }

        existing.currentStock += row.currentStock;
        if (!existing.soDangKy && row.soDangKy) {
            existing.soDangKy = row.soDangKy;
        }
        existing.nhomTckt = mergeUniqueDisplayValue(existing.nhomTckt, row.nhomTckt);
        existing.isThuocHiem = existing.isThuocHiem || row.isThuocHiem;
        if (getReportMonthSortValue(row.reportMonth) >= getReportMonthSortValue(existing.reportMonth)) {
            existing.reportMonth = row.reportMonth;
            existing.priceVAT = row.priceVAT;
        }
    });

    const allResults = Array.from(groupedAll.values());
    const summary = {
        drugCount: allResults.length,
        totalStock: allResults.reduce((sum, item) => sum + item.currentStock, 0),
    };

    const filteredResults = allResults.filter((item) =>
        matchesDrugQuery({
            maChung: item.drugCode,
            tenThuoc: item.drugName,
            hoatChat: item.activeIngredient,
            hamLuong: item.dosage,
        }, params.query)
    );

    filteredResults.sort((left, right) => {
        switch (params.sort) {
            case "currentStockDesc":
                if (right.currentStock !== left.currentStock) {
                    return right.currentStock - left.currentStock;
                }
                return compareText(left.drugName, right.drugName);
            case "priceVATAsc":
                if (left.priceVAT !== right.priceVAT) {
                    return left.priceVAT - right.priceVAT;
                }
                return compareText(left.drugName, right.drugName);
            case "drugNameAsc":
            default:
                return compareText(left.drugName, right.drugName);
        }
    });

    const paginated = paginate(filteredResults, params);

    return {
        facility,
        summary,
        results: paginated.results,
        total: paginated.total,
        page: params.page,
        limit: params.limit,
    };
}

export async function searchDrugOptions(params: {
    query: string;
    limit: number;
}): Promise<DrugOption[]> {
    const snapshot = await getInventorySnapshot();
    const grouped = new Map<string, DrugOption>();

    snapshot.forEach((row) => {
        if (!row.masterDrugId) return;
        if (grouped.has(row.masterDrugId)) return;

        grouped.set(row.masterDrugId, {
            masterDrugId: row.masterDrugId,
            maChung: row.drugCode,
            tenThuoc: row.drugName,
            hoatChat: row.activeIngredient,
            hamLuong: row.dosage,
            unit: row.unit,
        });
    });

    return Array.from(grouped.values())
        .filter((row) => matchesDrugQuery(row, params.query))
        .sort((left, right) => compareText(left.tenThuoc, right.tenThuoc))
        .slice(0, params.limit);
}

export async function compareDrugAcrossFacilities(params: {
    masterDrugId?: string;
    maChung?: string;
    facilityIds: string[];
}): Promise<FacilityCompareResponse | null> {
    const selectedIds = params.facilityIds.filter(Boolean);
    if (selectedIds.length < 2) {
        return null;
    }

    const [masterDrug, allFacilities, snapshot] = await Promise.all([
        prisma.masterDrug.findFirst({
            where: params.masterDrugId
                ? { id: params.masterDrugId }
                : { maChung: params.maChung },
            select: {
                id: true,
                maChung: true,
                tenThuoc: true,
                hoatChat: true,
                hamLuong: true,
                donViTinh: true,
            },
        }),
        listInventoryFacilities(),
        getInventorySnapshot({ facilityIds: selectedIds }),
    ]);

    if (!masterDrug) {
        return null;
    }

    const facilities = selectedIds
        .map((facilityId) => allFacilities.find((facility) => facility.id === facilityId))
        .filter((facility): facility is InventoryFacilityOption => Boolean(facility));

    if (facilities.length < 2) {
        return null;
    }

    const filteredRows = snapshot.filter((row) => row.masterDrugId === masterDrug.id);
    const compareFacilities: CompareFacilityValue[] = facilities.map((facility) => {
        const facilityRows = filteredRows
            .filter((row) => row.facilityId === facility.id)
            .sort((left, right) => getReportMonthSortValue(right.reportMonth) - getReportMonthSortValue(left.reportMonth));

        if (facilityRows.length === 0) {
            return {
                ...facility,
                currentStock: null,
                priceVAT: null,
                reportMonth: null,
                hasData: false,
            };
        }

        const latestRow = facilityRows[0];
        return {
            ...facility,
            currentStock: facilityRows.reduce((sum, row) => sum + row.currentStock, 0),
            priceVAT: latestRow.priceVAT,
            reportMonth: latestRow.reportMonth,
            hasData: true,
        };
    });

    const stockValues = compareFacilities
        .map((facility) => facility.currentStock)
        .filter((value): value is number => value !== null);
    const priceValues = compareFacilities
        .map((facility) => facility.priceVAT)
        .filter((value): value is number => value !== null);
    const reportValues = compareFacilities
        .map((facility) => getReportMonthSortValue(facility.reportMonth))
        .filter((value) => value > 0);

    const maxStock = stockValues.length > 0 ? Math.max(...stockValues) : null;
    const minPrice = priceValues.length > 0 ? Math.min(...priceValues) : null;
    const maxReport = reportValues.length > 0 ? Math.max(...reportValues) : null;

    const metrics: CompareMetric[] = [
        {
            key: "currentStock",
            label: "Tồn kho",
            values: compareFacilities.map((facility) => ({
                facilityId: facility.id,
                display: facility.currentStock === null
                    ? "Không có dữ liệu"
                    : new Intl.NumberFormat("vi-VN").format(facility.currentStock),
                highlighted: facility.currentStock !== null && maxStock !== null && facility.currentStock === maxStock,
                missing: facility.currentStock === null,
            })),
        },
        {
            key: "priceVAT",
            label: "Giá VAT",
            values: compareFacilities.map((facility) => ({
                facilityId: facility.id,
                display: facility.priceVAT === null
                    ? "Không có dữ liệu"
                    : new Intl.NumberFormat("vi-VN").format(facility.priceVAT),
                highlighted: facility.priceVAT !== null && minPrice !== null && facility.priceVAT === minPrice,
                missing: facility.priceVAT === null,
            })),
        },
        {
            key: "reportMonth",
            label: "Kỳ báo cáo",
            values: compareFacilities.map((facility) => {
                const sortValue = getReportMonthSortValue(facility.reportMonth);
                return {
                    facilityId: facility.id,
                    display: facility.reportMonth || "Không có dữ liệu",
                    highlighted: sortValue > 0 && maxReport !== null && sortValue < maxReport,
                    missing: !facility.reportMonth,
                };
            }),
        },
    ];

    const uniqueReportMonths = new Set(compareFacilities.map((facility) => facility.reportMonth).filter(Boolean));

    return {
        drug: {
            masterDrugId: masterDrug.id,
            maChung: masterDrug.maChung,
            tenThuoc: masterDrug.tenThuoc,
            hoatChat: masterDrug.hoatChat || "",
            hamLuong: masterDrug.hamLuong || "",
            unit: masterDrug.donViTinh || "",
        },
        facilities: compareFacilities,
        metrics,
        reportMonthMismatch: uniqueReportMonths.size > 1,
    };
}
