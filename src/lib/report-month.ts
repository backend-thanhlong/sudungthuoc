const REPORT_MONTH_PATTERN = /^(0[1-9]|1[0-2])\/\d{4}$/;

export const isValidReportMonth = (value: unknown): value is string =>
    typeof value === "string" && REPORT_MONTH_PATTERN.test(value);

export const getReportMonthSortValue = (reportMonth: string) => {
    if (!isValidReportMonth(reportMonth)) return 0;
    const [month, year] = reportMonth.split("/").map(Number);
    return year * 100 + month;
};

export const compareReportMonths = (left: string, right: string) =>
    getReportMonthSortValue(left) - getReportMonthSortValue(right);

export const getPreviousReportMonth = (reportMonth: string) => {
    if (!isValidReportMonth(reportMonth)) return null;
    const [month, year] = reportMonth.split("/").map(Number);
    const previous = new Date(year, month - 2, 1);
    return `${String(previous.getMonth() + 1).padStart(2, "0")}/${previous.getFullYear()}`;
};
