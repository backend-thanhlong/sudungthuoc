export const SPECIAL_CONTROL_OPTIONS = [
    "Thuốc gây nghiện",
    "Thuốc hướng thần",
    "Thuốc tiền chất",
    "Thuốc dạng phối hợp có chứa dược chất gây nghiện",
    "Thuốc dạng phối hợp có chứa dược chất hướng thần",
    "Thuốc dạng phối hợp có chứa tiền chất",
    "Thuốc thuộc danh mục chất bị cấm sử dụng trong một số ngành, lĩnh vực",
] as const;

export type SpecialControlOption = (typeof SPECIAL_CONTROL_OPTIONS)[number];

const EMPTY_SPECIAL_CONTROL_VALUES = new Set([
    "",
    "0",
    "false",
    "khong",
    "không",
    "khong phai",
    "không phải",
    "khong co",
    "không có",
    "no",
    "n",
]);

export const normalizeSpecialControlValue = (value: unknown) => {
    if (value === undefined || value === null) {
        return null;
    }

    const text = String(value).trim();
    if (!text) {
        return null;
    }

    const normalizedText = text.toLowerCase();
    if (EMPTY_SPECIAL_CONTROL_VALUES.has(normalizedText)) {
        return null;
    }

    const matchedOption = SPECIAL_CONTROL_OPTIONS.find((option) => option === text);
    return matchedOption ?? null;
};

export const isEmptySpecialControlValue = (value: unknown) => {
    if (value === undefined || value === null) {
        return true;
    }

    const text = String(value).trim();
    return !text || EMPTY_SPECIAL_CONTROL_VALUES.has(text.toLowerCase());
};

export const isValidSpecialControlValue = (value: unknown) => {
    if (isEmptySpecialControlValue(value)) {
        return true;
    }

    return normalizeSpecialControlValue(value) !== null;
};
