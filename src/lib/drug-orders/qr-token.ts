import { createHmac, timingSafeEqual } from "crypto";

export const DRUG_ORDER_QR_TOKEN_VERSION = 1;
export const DRUG_ORDER_LOOKUP_PATH = "/dashboard/dutru-dat-hang/tra-cuu";

export interface DrugOrderQrTokenPayload {
    orderId: string;
    version: number;
}

const getSigningSecret = () => {
    const secret = process.env.DRUG_ORDER_QR_SIGNING_SECRET;
    if (!secret) {
        throw new Error("DRUG_ORDER_QR_SIGNING_SECRET is not configured");
    }

    return secret;
};

const signPayload = (payload: string) => {
    const secret = getSigningSecret();
    return createHmac("sha256", secret).update(payload).digest("base64url");
};

const parsePayload = (encodedPayload: string): DrugOrderQrTokenPayload => {
    const decoded = Buffer.from(encodedPayload, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded);

    if (
        !parsed ||
        typeof parsed !== "object" ||
        typeof parsed.orderId !== "string" ||
        typeof parsed.version !== "number"
    ) {
        throw new Error("Invalid drug order QR token payload");
    }

    return parsed as DrugOrderQrTokenPayload;
};

export const createDrugOrderQrToken = (orderId: string) => {
    const normalizedOrderId = orderId.trim();
    if (!normalizedOrderId) {
        throw new Error("Drug order id is required");
    }

    const encodedPayload = Buffer.from(JSON.stringify({
        orderId: normalizedOrderId,
        version: DRUG_ORDER_QR_TOKEN_VERSION,
    } satisfies DrugOrderQrTokenPayload)).toString("base64url");
    const signature = signPayload(encodedPayload);

    return `${encodedPayload}.${signature}`;
};

export const verifyDrugOrderQrToken = (token: string): DrugOrderQrTokenPayload => {
    const trimmedToken = token.trim();
    const parts = trimmedToken.split(".");

    if (parts.length !== 2) {
        throw new Error("Invalid drug order QR token format");
    }

    const [encodedPayload, signature] = parts;
    if (!encodedPayload || !signature) {
        throw new Error("Invalid drug order QR token format");
    }

    const expectedSignature = signPayload(encodedPayload);
    const providedBuffer = Buffer.from(signature, "utf8");
    const expectedBuffer = Buffer.from(expectedSignature, "utf8");

    if (
        providedBuffer.length !== expectedBuffer.length ||
        !timingSafeEqual(providedBuffer, expectedBuffer)
    ) {
        throw new Error("Invalid drug order QR token signature");
    }

    const payload = parsePayload(encodedPayload);
    if (payload.version !== DRUG_ORDER_QR_TOKEN_VERSION) {
        throw new Error("Unsupported drug order QR token version");
    }

    if (!payload.orderId.trim()) {
        throw new Error("Invalid drug order QR token order id");
    }

    return {
        orderId: payload.orderId.trim(),
        version: payload.version,
    };
};

export const buildDrugOrderLookupPathFromToken = (token: string) => {
    const normalizedToken = token.trim();
    if (!normalizedToken) {
        throw new Error("Drug order QR token is required");
    }

    const params = new URLSearchParams({ t: normalizedToken });
    return `${DRUG_ORDER_LOOKUP_PATH}?${params.toString()}`;
};

export const buildDrugOrderLookupPath = (orderId: string) => {
    const token = createDrugOrderQrToken(orderId);
    return buildDrugOrderLookupPathFromToken(token);
};

export const buildDrugOrderLookupUrl = (orderId: string, origin: string) => {
    const normalizedOrigin = origin.trim().replace(/\/+$/, "");
    if (!normalizedOrigin) {
        throw new Error("Origin is required");
    }

    return `${normalizedOrigin}${buildDrugOrderLookupPath(orderId)}`;
};
