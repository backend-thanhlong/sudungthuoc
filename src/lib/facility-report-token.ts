import { createHmac, timingSafeEqual } from "crypto";

export const FACILITY_REPORT_TOKEN_VERSION = 1;

export interface FacilityReportRowTokenPayload {
    facilityId: string;
    reportMonth: string;
    mapId: string;
    version: number;
}

const getSigningSecret = () => {
    const secret = process.env.REPORT_UPLOAD_SIGNING_SECRET;
    if (!secret) {
        throw new Error("REPORT_UPLOAD_SIGNING_SECRET is not configured");
    }
    return secret;
};

const signPayload = (payload: string) => {
    const secret = getSigningSecret();
    return createHmac("sha256", secret).update(payload).digest("base64url");
};

const parsePayload = (encodedPayload: string): FacilityReportRowTokenPayload => {
    const decoded = Buffer.from(encodedPayload, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded);

    if (
        !parsed
        || typeof parsed !== "object"
        || typeof parsed.facilityId !== "string"
        || typeof parsed.reportMonth !== "string"
        || typeof parsed.mapId !== "string"
        || typeof parsed.version !== "number"
    ) {
        throw new Error("Invalid report row token payload");
    }

    return parsed as FacilityReportRowTokenPayload;
};

export const createFacilityReportRowToken = (
    payload: Omit<FacilityReportRowTokenPayload, "version">
) => {
    const encodedPayload = Buffer.from(JSON.stringify({
        ...payload,
        version: FACILITY_REPORT_TOKEN_VERSION,
    } satisfies FacilityReportRowTokenPayload)).toString("base64url");
    const signature = signPayload(encodedPayload);

    return `${encodedPayload}.${signature}`;
};

export const verifyFacilityReportRowToken = (token: string): FacilityReportRowTokenPayload => {
    const trimmedToken = token.trim();
    const [encodedPayload, signature] = trimmedToken.split(".");

    if (!encodedPayload || !signature) {
        throw new Error("Invalid report row token format");
    }

    const expectedSignature = signPayload(encodedPayload);
    const providedBuffer = Buffer.from(signature, "utf8");
    const expectedBuffer = Buffer.from(expectedSignature, "utf8");

    if (
        providedBuffer.length !== expectedBuffer.length
        || !timingSafeEqual(providedBuffer, expectedBuffer)
    ) {
        throw new Error("Invalid report row token signature");
    }

    const payload = parsePayload(encodedPayload);
    if (payload.version !== FACILITY_REPORT_TOKEN_VERSION) {
        throw new Error("Unsupported report row token version");
    }

    return payload;
};
