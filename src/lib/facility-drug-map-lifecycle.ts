import { compareReportMonths, isValidReportMonth } from "@/lib/report-month";

type FacilityDrugMapLifecycle = {
    isActive?: boolean;
    inactiveFromMonth?: string | null;
    reactivatedFromMonth?: string | null;
};

export const isFacilityDrugMapActiveForReportMonth = (
    mapping: FacilityDrugMapLifecycle,
    reportMonth: string
) => {
    if (!isValidReportMonth(reportMonth)) return false;

    const inactiveFromMonth = mapping.inactiveFromMonth;
    if (!inactiveFromMonth || !isValidReportMonth(inactiveFromMonth)) {
        return mapping.isActive !== false;
    }

    const reactivatedFromMonth = mapping.reactivatedFromMonth;
    const isAfterInactiveStart = compareReportMonths(reportMonth, inactiveFromMonth) >= 0;
    const isBeforeReactivation = !reactivatedFromMonth
        || !isValidReportMonth(reactivatedFromMonth)
        || compareReportMonths(reportMonth, reactivatedFromMonth) < 0;

    return !(isAfterInactiveStart && isBeforeReactivation);
};
