const DATE_INPUT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

type DateRangeValue = string | Date | null | undefined;

function parseDateInputParts(value: string | null | undefined) {
    const normalized = typeof value === "string" ? value.trim() : "";
    const match = DATE_INPUT_PATTERN.exec(normalized);

    if (!match) {
        return null;
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));

    if (
        Number.isNaN(date.getTime()) ||
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day
    ) {
        return null;
    }

    return { year, month, day };
}

function parseDateValue(value: DateRangeValue) {
    if (!value) {
        return null;
    }

    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }

    const normalized = value.trim();
    if (!normalized) {
        return null;
    }

    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
}

export function buildUtcDateFromDateInput(
    value: string | null | undefined,
    endOfDay = false
) {
    const parts = parseDateInputParts(value);
    if (!parts) {
        return null;
    }

    return new Date(
        Date.UTC(
            parts.year,
            parts.month - 1,
            parts.day,
            endOfDay ? 23 : 0,
            endOfDay ? 59 : 0,
            endOfDay ? 59 : 0,
            endOfDay ? 999 : 0
        )
    );
}

export function formatDateInputValue(value: Date = new Date()) {
    const offset = value.getTimezoneOffset();
    const local = new Date(value.getTime() - offset * 60_000);
    return local.toISOString().slice(0, 10);
}

export function formatDateOnly(value: DateRangeValue) {
    const date = parseDateValue(value);
    if (!date) {
        return "—";
    }

    return new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "UTC",
    }).format(date);
}

function formatDateOnlyOrNull(value: DateRangeValue) {
    const date = parseDateValue(value);
    if (!date) {
        return null;
    }

    return formatDateOnly(date);
}

export function formatShipmentDateRangeLabel(params: {
    shippedFromDate?: DateRangeValue;
    shippedToDate?: DateRangeValue;
    shippedAt?: DateRangeValue;
}) {
    const fromLabel = formatDateOnlyOrNull(params.shippedFromDate);
    const toLabel = formatDateOnlyOrNull(params.shippedToDate);

    if (fromLabel && toLabel) {
        return fromLabel === toLabel ? fromLabel : `${fromLabel} - ${toLabel}`;
    }

    if (fromLabel) {
        return fromLabel;
    }

    if (toLabel) {
        return toLabel;
    }

    return formatDateOnly(params.shippedAt);
}
