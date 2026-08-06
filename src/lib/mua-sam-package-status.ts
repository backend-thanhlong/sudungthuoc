export const PACKAGE_STATUS_ORDER = [
    "chuaCoTbmt",
    "daCoTbmtChuaCoKqlcnt",
    "khongYeuCauTbmt",
    "daCoKqlcnt",
] as const;

export type PackageStatusKey = (typeof PACKAGE_STATUS_ORDER)[number];

export const PACKAGE_STATUS_LABELS: Record<PackageStatusKey, string> = {
    chuaCoTbmt: "Chưa có TBMT",
    daCoTbmtChuaCoKqlcnt: "Đã có TBMT chưa có KQLCNT",
    khongYeuCauTbmt: "Không yêu cầu TBMT",
    daCoKqlcnt: "Đã có KQLCNT",
};

export type PackageStatusSourceItem = {
    goiThauId: string;
    tenGoiThau: string;
    keHoachId: string;
    tenKHLCNT: string | null;
    maKHLCNT: string | null;
    quyTrinh: number;
    yeuCauTBMT: boolean;
    tbmtCount: number;
    kqlcntCount: number;
    facilityId?: string;
    facilityName?: string | null;
};

export type PackageStatusBreakdownItem = Omit<PackageStatusSourceItem, "quyTrinh"> & {
    hasTbmt: boolean;
    hasKqlcnt: boolean;
    statusKey: PackageStatusKey;
};

export type PackageStatusChartItem = {
    key: PackageStatusKey;
    name: string;
    value: number;
};

export type PackageStatusBreakdown = Record<PackageStatusKey, PackageStatusBreakdownItem[]>;

export type PackageStatusSummary = {
    totalTrackedPackages: number;
};

const collator = new Intl.Collator("vi", { sensitivity: "base" });

export function createEmptyPackageStatusBreakdown(): PackageStatusBreakdown {
    return {
        chuaCoTbmt: [],
        daCoTbmtChuaCoKqlcnt: [],
        khongYeuCauTbmt: [],
        daCoKqlcnt: [],
    };
}

export function classifyPackageStatus(
    item: Pick<PackageStatusSourceItem, "quyTrinh" | "yeuCauTBMT" | "tbmtCount" | "kqlcntCount">
): PackageStatusKey | null {
    if (item.quyTrinh !== 1) {
        return null;
    }

    if (item.kqlcntCount > 0) {
        return "daCoKqlcnt";
    }

    if (item.tbmtCount > 0) {
        return "daCoTbmtChuaCoKqlcnt";
    }

    if (!item.yeuCauTBMT) {
        return "khongYeuCauTbmt";
    }

    return "chuaCoTbmt";
}

function getFacilityLabel(item: Pick<PackageStatusBreakdownItem, "facilityName">) {
    return item.facilityName?.trim() || "";
}

function getPlanLabel(item: Pick<PackageStatusBreakdownItem, "tenKHLCNT" | "maKHLCNT">) {
    return item.tenKHLCNT?.trim() || item.maKHLCNT?.trim() || "";
}

function comparePackageStatusItems(a: PackageStatusBreakdownItem, b: PackageStatusBreakdownItem) {
    const facilityCompare = collator.compare(getFacilityLabel(a), getFacilityLabel(b));
    if (facilityCompare !== 0) {
        return facilityCompare;
    }

    const planCompare = collator.compare(getPlanLabel(a), getPlanLabel(b));
    if (planCompare !== 0) {
        return planCompare;
    }

    return collator.compare(a.tenGoiThau, b.tenGoiThau);
}

export function buildPackageStatusData(items: PackageStatusSourceItem[]) {
    const statusBreakdown = createEmptyPackageStatusBreakdown();

    for (const item of items) {
        const statusKey = classifyPackageStatus(item);
        if (!statusKey) {
            continue;
        }

        statusBreakdown[statusKey].push({
            goiThauId: item.goiThauId,
            tenGoiThau: item.tenGoiThau,
            keHoachId: item.keHoachId,
            tenKHLCNT: item.tenKHLCNT,
            maKHLCNT: item.maKHLCNT,
            yeuCauTBMT: item.yeuCauTBMT,
            tbmtCount: item.tbmtCount,
            kqlcntCount: item.kqlcntCount,
            facilityId: item.facilityId,
            facilityName: item.facilityName,
            hasTbmt: item.tbmtCount > 0,
            hasKqlcnt: item.kqlcntCount > 0,
            statusKey,
        });
    }

    for (const key of PACKAGE_STATUS_ORDER) {
        statusBreakdown[key].sort(comparePackageStatusItems);
    }

    const statusData: PackageStatusChartItem[] = PACKAGE_STATUS_ORDER.map((key) => ({
        key,
        name: PACKAGE_STATUS_LABELS[key],
        value: statusBreakdown[key].length,
    }));

    const statusSummary: PackageStatusSummary = {
        totalTrackedPackages: statusData.reduce((sum, item) => sum + item.value, 0),
    };

    return {
        statusData,
        statusBreakdown,
        statusSummary,
    };
}
