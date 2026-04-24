import {
    DrugOrderLineSourceType,
    DrugOrderLineStatus,
    DrugOrderShipmentStatus,
    DrugOrderStatus,
    Prisma,
} from "@/../prisma/generated/client";
import prisma from "@/lib/prisma";
import { listReportMonthSummaries } from "@/lib/report-submissions";
import { RouteError } from "@/lib/server-authz";
import { buildDrugOrderLookupPath } from "@/lib/drug-orders/qr-token";
import { buildDrugOrderSuggestionSnapshotMap } from "@/lib/drug-orders/suggestions";
import {
    buildDrugOrderNo,
    DRUG_ORDER_SERIALIZABLE_TRANSACTION,
    normalizeOptionalText,
    normalizeText,
    parseReportMonthValue,
    rethrowDrugOrderConcurrencyError,
    toNumber,
} from "@/lib/drug-orders/utils";

const COMPANY_OPTION_SELECT = {
    id: true,
    code: true,
    name: true,
} satisfies Prisma.CompanySelect;

const FACILITY_PRINT_SELECT = {
    id: true,
    username: true,
    facilityName: true,
    facilityCode: true,
    facilityType: true,
    contactPerson: true,
    phoneNumber: true,
    address: true,
} satisfies Prisma.UserSelect;

const COMPANY_DRUG_OPTION_SELECT = {
    id: true,
    companyDrugCode: true,
    companyDrugName: true,
    activeIngredient: true,
    quyCach: true,
    unit: true,
    masterDrugId: true,
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
} satisfies Prisma.CompanyDrugSelect;

const DRUG_ORDER_SUMMARY_SELECT = {
    id: true,
    orderNo: true,
    companyId: true,
    status: true,
    baseReportMonth: true,
    note: true,
    submittedAt: true,
    createdAt: true,
    updatedAt: true,
    company: {
        select: COMPANY_OPTION_SELECT,
    },
    lines: {
        select: {
            requestedQty: true,
            lineStatus: true,
        },
    },
} satisfies Prisma.DrugOrderSelect;

const MASTER_DRUG_LINE_SELECT = {
    id: true,
    maChung: true,
    tenThuoc: true,
    hoatChat: true,
    hamLuong: true,
    dangBaoChe: true,
    soDangKy: true,
    quyCach: true,
    donViTinh: true,
} satisfies Prisma.MasterDrugSelect;

const DRUG_ORDER_DETAIL_SELECT = {
    id: true,
    orderNo: true,
    companyId: true,
    status: true,
    baseReportMonth: true,
    note: true,
    submittedAt: true,
    closedAt: true,
    createdAt: true,
    updatedAt: true,
    company: {
        select: COMPANY_OPTION_SELECT,
    },
    lines: {
        orderBy: { createdAt: "asc" },
        select: {
            id: true,
            sourceType: true,
            masterDrugId: true,
            companyDrugId: true,
            displayName: true,
            unit: true,
            requestedQty: true,
            acceptedQty: true,
            suggestedQty: true,
            lineStatus: true,
            companyResponseReason: true,
            suggestionBasis: true,
            suggestionReportMonth: true,
            suggestionRuleVersion: true,
            masterDrug: {
                select: MASTER_DRUG_LINE_SELECT,
            },
            companyDrug: {
                select: COMPANY_DRUG_OPTION_SELECT,
            },
            shipmentLines: {
                orderBy: [
                    { shipment: { shipmentNo: "asc" } },
                    { createdAt: "asc" },
                ],
                select: {
                    id: true,
                    shipmentId: true,
                    shippedQty: true,
                    reason: true,
                    shipment: {
                        select: {
                            id: true,
                            shipmentNo: true,
                            shippedAt: true,
                            shippedFromDate: true,
                            shippedToDate: true,
                            status: true,
                        },
                    },
                    receiptLines: {
                        select: {
                            receivedQty: true,
                        },
                    },
                },
            },
            receiptLines: {
                select: {
                    receivedQty: true,
                },
            },
        },
    },
    shipments: {
        orderBy: [
            { shipmentNo: "desc" },
            { createdAt: "desc" },
        ],
        select: {
            id: true,
            shipmentNo: true,
            status: true,
            shippedAt: true,
            shippedFromDate: true,
            shippedToDate: true,
            companyNote: true,
            createdAt: true,
            lines: {
                orderBy: { createdAt: "asc" },
                select: {
                    id: true,
                    orderLineId: true,
                    shippedQty: true,
                    reason: true,
                    orderLine: {
                        select: {
                            displayName: true,
                            unit: true,
                            acceptedQty: true,
                            requestedQty: true,
                            lineStatus: true,
                        },
                    },
                    receiptLines: {
                        select: {
                            receivedQty: true,
                        },
                    },
                },
            },
            receipts: {
                orderBy: { confirmedAt: "desc" },
                select: {
                    id: true,
                    confirmedAt: true,
                    note: true,
                    lines: {
                        select: {
                            shipmentLineId: true,
                            receivedQty: true,
                            differenceReason: true,
                        },
                    },
                },
            },
        },
    },
    _count: {
        select: {
            shipments: true,
            receipts: true,
        },
    },
} satisfies Prisma.DrugOrderSelect;

const DRUG_ORDER_PRINT_SELECT = {
    ...DRUG_ORDER_DETAIL_SELECT,
    facility: {
        select: FACILITY_PRINT_SELECT,
    },
} satisfies Prisma.DrugOrderSelect;

type CompanyOptionRecord = Prisma.CompanyGetPayload<{
    select: typeof COMPANY_OPTION_SELECT;
}>;

type FacilityPrintRecord = Prisma.UserGetPayload<{
    select: typeof FACILITY_PRINT_SELECT;
}>;

type CompanyDrugOptionRecord = Prisma.CompanyDrugGetPayload<{
    select: typeof COMPANY_DRUG_OPTION_SELECT;
}>;

type DrugOrderSummaryRecord = Prisma.DrugOrderGetPayload<{
    select: typeof DRUG_ORDER_SUMMARY_SELECT;
}>;

type DrugOrderDetailRecord = Prisma.DrugOrderGetPayload<{
    select: typeof DRUG_ORDER_DETAIL_SELECT;
}>;

type DrugOrderPrintRecord = Prisma.DrugOrderGetPayload<{
    select: typeof DRUG_ORDER_PRINT_SELECT;
}>;

export interface DraftLineInput {
    sourceType: DrugOrderLineSourceType;
    sourceId: string;
    requestedQty: number;
}

export interface ReceiptLineInput {
    shipmentLineId: string;
    receivedQty: number;
    differenceReason: string | null;
}

function serializeCompanyOption(company: CompanyOptionRecord) {
    return {
        id: company.id,
        code: company.code,
        name: company.name,
    };
}

function serializeFacilityPrintOption(facility: FacilityPrintRecord) {
    return {
        id: facility.id,
        username: facility.username,
        facilityName: facility.facilityName || facility.username,
        facilityCode: facility.facilityCode || facility.username,
        facilityType: facility.facilityType,
        contactPerson: facility.contactPerson,
        phoneNumber: facility.phoneNumber,
        address: facility.address,
    };
}

function serializeCompanyDrugOption(drug: CompanyDrugOptionRecord) {
    return {
        id: drug.id,
        companyDrugCode: drug.companyDrugCode,
        companyDrugName: drug.companyDrugName,
        activeIngredient: drug.activeIngredient,
        quyCach: drug.quyCach,
        unit: drug.unit,
        masterDrugId: drug.masterDrugId,
        masterDrug: drug.masterDrug,
    };
}

function buildReportMonthOptions(reportMonths: string[]) {
    return reportMonths.map((month) => ({
        value: month,
        label: `Tháng ${month}`,
    }));
}

function serializeOrderSummary(order: DrugOrderSummaryRecord) {
    const totalRequestedQty = order.lines.reduce(
        (sum, line) => sum + toNumber(line.requestedQty),
        0
    );
    const pendingCatalogCount = order.lines.filter(
        (line) => line.lineStatus === DrugOrderLineStatus.PENDING_CATALOG_CONFIRMATION
    ).length;

    return {
        id: order.id,
        orderNo: order.orderNo,
        lookupUrl: buildDrugOrderLookupPath(order.id),
        companyId: order.companyId,
        company: serializeCompanyOption(order.company),
        status: order.status,
        baseReportMonth: order.baseReportMonth,
        note: order.note,
        submittedAt: order.submittedAt,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        lineCount: order.lines.length,
        totalRequestedQty,
        pendingCatalogCount,
    };
}

function serializeOrderDetail(
    order: DrugOrderDetailRecord,
    companyDrugs: CompanyDrugOptionRecord[]
) {
    const canEdit = order.status === DrugOrderStatus.DRAFT;
    const canSubmit =
        canEdit &&
        order.lines.length > 0 &&
        order.lines.every((line) => toNumber(line.requestedQty) > 0);
    const canRecall =
        order.status === DrugOrderStatus.SUBMITTED &&
        order._count.shipments === 0 &&
        order.lines.every((line) =>
            line.lineStatus === DrugOrderLineStatus.PENDING ||
            line.lineStatus === DrugOrderLineStatus.PENDING_CATALOG_CONFIRMATION
        );
    const lines = order.lines.map((line) => {
        const totalShippedQty = line.shipmentLines.reduce(
            (sum, shipmentLine) => sum + toNumber(shipmentLine.shippedQty),
            0
        );
        const totalReceivedQty = line.receiptLines.reduce(
            (sum, receiptLine) => sum + toNumber(receiptLine.receivedQty),
            0
        );
        const acceptedQty = toNumber(line.acceptedQty);

        return {
            id: line.id,
            sourceType: line.sourceType,
            masterDrugId: line.masterDrugId,
            companyDrugId: line.companyDrugId,
            displayName: line.displayName,
            unit: line.unit,
            requestedQty: toNumber(line.requestedQty),
            acceptedQty,
            suggestedQty:
                line.suggestedQty === null ? null : toNumber(line.suggestedQty),
            lineStatus: line.lineStatus,
            companyResponseReason: line.companyResponseReason,
            suggestionBasis: line.suggestionBasis,
            suggestionReportMonth: line.suggestionReportMonth,
            suggestionRuleVersion: line.suggestionRuleVersion,
            totalShippedQty,
            totalReceivedQty,
            remainingAcceptedQty: Math.max(acceptedQty - totalReceivedQty, 0),
            masterDrug: line.masterDrug,
            companyDrug: line.companyDrug
                ? serializeCompanyDrugOption(line.companyDrug)
                : null,
            shipmentHistory: line.shipmentLines.map((shipmentLine) => ({
                id: shipmentLine.id,
                shipmentId: shipmentLine.shipmentId,
                shipmentNo: shipmentLine.shipment.shipmentNo,
                shippedAt: shipmentLine.shipment.shippedAt,
                shippedFromDate: shipmentLine.shipment.shippedFromDate,
                shippedToDate: shipmentLine.shipment.shippedToDate,
                shipmentStatus: shipmentLine.shipment.status,
                shippedQty: toNumber(shipmentLine.shippedQty),
                reason: shipmentLine.reason,
                receivedQty: shipmentLine.receiptLines.reduce(
                    (sum, receiptLine) => sum + toNumber(receiptLine.receivedQty),
                    0
                ),
            })),
        };
    });
    const canConfirmReceipt =
        order.status === DrugOrderStatus.IN_DELIVERY &&
        order.shipments.some((shipment) => shipment.receipts.length === 0);

    return {
        id: order.id,
        orderNo: order.orderNo,
        lookupUrl: buildDrugOrderLookupPath(order.id),
        companyId: order.companyId,
        company: serializeCompanyOption(order.company),
        status: order.status,
        baseReportMonth: order.baseReportMonth,
        note: order.note,
        submittedAt: order.submittedAt,
        closedAt: order.closedAt,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        permissions: {
            canEdit,
            canSubmit,
            canRecall,
            canConfirmReceipt,
        },
        lines,
        shipments: order.shipments.map((shipment) => ({
            id: shipment.id,
            shipmentNo: shipment.shipmentNo,
            status: shipment.status,
            shippedAt: shipment.shippedAt,
            shippedFromDate: shipment.shippedFromDate,
            shippedToDate: shipment.shippedToDate,
            companyNote: shipment.companyNote,
            createdAt: shipment.createdAt,
            lines: shipment.lines.map((line) => ({
                id: line.id,
                orderLineId: line.orderLineId,
                displayName: line.orderLine.displayName,
                unit: line.orderLine.unit,
                requestedQty: toNumber(line.orderLine.requestedQty),
                acceptedQty: toNumber(line.orderLine.acceptedQty),
                shippedQty: toNumber(line.shippedQty),
                receivedQty: line.receiptLines.reduce(
                    (sum, receiptLine) => sum + toNumber(receiptLine.receivedQty),
                    0
                ),
                reason: line.reason,
            })),
            receipts: shipment.receipts.map((receipt) => ({
                id: receipt.id,
                confirmedAt: receipt.confirmedAt,
                note: receipt.note,
                lines: receipt.lines.map((line) => ({
                    shipmentLineId: line.shipmentLineId,
                    receivedQty: toNumber(line.receivedQty),
                    differenceReason: line.differenceReason,
                })),
            })),
        })),
        options: {
            companyDrugs: companyDrugs.map(serializeCompanyDrugOption),
        },
    };
}

function serializeOrderPrint(order: DrugOrderPrintRecord) {
    return {
        ...serializeOrderDetail(order, []),
        facility: serializeFacilityPrintOption(order.facility),
    };
}

async function listAvailableReportMonths(facilityId: string) {
    const summaries = await listReportMonthSummaries({ facilityId });
    return summaries.map((summary) => summary.month);
}

async function getActiveCompanyOrThrow(companyId: string) {
    const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: {
            id: true,
            code: true,
            name: true,
            isActive: true,
        },
    });

    if (!company || !company.isActive) {
        throw new RouteError(400, "Công ty không tồn tại hoặc đã bị vô hiệu hóa");
    }

    return company;
}

async function listActiveCompanyDrugOptions(companyId: string) {
    return prisma.companyDrug.findMany({
        where: {
            companyId,
            isActive: true,
        },
        select: COMPANY_DRUG_OPTION_SELECT,
        orderBy: [
            { companyDrugName: "asc" },
            { companyDrugCode: "asc" },
        ],
    });
}

export async function loadFacilityCompanyDrugCatalogPayload(companyId: string) {
    await getActiveCompanyOrThrow(companyId);

    const companyDrugs = await listActiveCompanyDrugOptions(companyId);
    return {
        items: companyDrugs.map(serializeCompanyDrugOption),
    };
}

async function buildDraftLineCreateInputs(params: {
    facilityId: string;
    companyId: string;
    baseReportMonth: string | null;
    lines: DraftLineInput[];
}): Promise<Array<Omit<Prisma.DrugOrderLineCreateManyInput, "orderId">>> {
    const uniqueMasterDrugIds = [
        ...new Set(
            params.lines
                .filter((line) => line.sourceType === DrugOrderLineSourceType.MASTER_DRUG)
                .map((line) => line.sourceId)
        ),
    ];
    const uniqueCompanyDrugIds = [
        ...new Set(
            params.lines
                .filter((line) => line.sourceType === DrugOrderLineSourceType.COMPANY_DRUG)
                .map((line) => line.sourceId)
        ),
    ];

    const duplicateKeys = new Set<string>();
    const seenKeys = new Set<string>();
    for (const line of params.lines) {
        const key = `${line.sourceType}:${line.sourceId}`;
        if (seenKeys.has(key)) {
            duplicateKeys.add(key);
        }
        seenKeys.add(key);
    }

    if (duplicateKeys.size > 0) {
        throw new RouteError(400, "Đơn nháp đang có dòng thuốc trùng lặp");
    }

    const [masterDrugs, companyDrugs, declaredMasterDrugIds] = await Promise.all([
        uniqueMasterDrugIds.length > 0
            ? prisma.masterDrug.findMany({
                  where: {
                      id: { in: uniqueMasterDrugIds },
                      isActive: true,
                  },
                  select: MASTER_DRUG_LINE_SELECT,
              })
            : Promise.resolve([]),
        uniqueCompanyDrugIds.length > 0
            ? prisma.companyDrug.findMany({
                  where: {
                      id: { in: uniqueCompanyDrugIds },
                      companyId: params.companyId,
                      isActive: true,
                  },
                  select: COMPANY_DRUG_OPTION_SELECT,
              })
            : Promise.resolve([]),
        uniqueMasterDrugIds.length > 0
            ? prisma.companyDrug.findMany({
                  where: {
                      companyId: params.companyId,
                      isActive: true,
                      masterDrugId: { in: uniqueMasterDrugIds },
                  },
                  select: { masterDrugId: true },
                  distinct: ["masterDrugId"],
              })
            : Promise.resolve([]),
    ]);

    const masterDrugById = new Map(masterDrugs.map((drug) => [drug.id, drug]));
    const companyDrugById = new Map(companyDrugs.map((drug) => [drug.id, drug]));
    const declaredMasterDrugIdSet = new Set(
        declaredMasterDrugIds
            .map((drug) => drug.masterDrugId)
            .filter((value): value is string => Boolean(value))
    );

    if (masterDrugById.size !== uniqueMasterDrugIds.length) {
        throw new RouteError(400, "Có thuốc danh mục chung không còn hợp lệ");
    }

    if (companyDrugById.size !== uniqueCompanyDrugIds.length) {
        throw new RouteError(400, "Có thuốc công ty không tồn tại hoặc không thuộc công ty đã chọn");
    }

    const duplicateMasterDrugIds = new Set<string>();
    const seenMasterDrugIds = new Set<string>();
    for (const line of params.lines) {
        const resolvedMasterDrugId =
            line.sourceType === DrugOrderLineSourceType.MASTER_DRUG
                ? line.sourceId
                : companyDrugById.get(line.sourceId)?.masterDrugId || null;

        if (!resolvedMasterDrugId) {
            continue;
        }

        if (seenMasterDrugIds.has(resolvedMasterDrugId)) {
            duplicateMasterDrugIds.add(resolvedMasterDrugId);
        }

        seenMasterDrugIds.add(resolvedMasterDrugId);
    }

    if (duplicateMasterDrugIds.size > 0) {
        throw new RouteError(
            400,
            "Đơn nháp không được chứa nhiều dòng cùng một thuốc chuẩn"
        );
    }

    const { suggestions: suggestionSnapshots } =
        await buildDrugOrderSuggestionSnapshotMap({
        facilityId: params.facilityId,
        masterDrugIds: [
            ...uniqueMasterDrugIds,
            ...companyDrugs
                .map((drug) => drug.masterDrugId)
                .filter((value): value is string => Boolean(value)),
        ],
        baseReportMonth: params.baseReportMonth,
    });

    return params.lines.map((line) => {
        if (line.sourceType === DrugOrderLineSourceType.MASTER_DRUG) {
            const masterDrug = masterDrugById.get(line.sourceId);
            if (!masterDrug) {
                throw new RouteError(400, "Thuốc danh mục chung không tồn tại");
            }

            const suggestion = suggestionSnapshots.get(masterDrug.id);

            return {
                sourceType: DrugOrderLineSourceType.MASTER_DRUG,
                masterDrugId: masterDrug.id,
                companyDrugId: null,
                displayName: masterDrug.tenThuoc,
                unit: masterDrug.donViTinh,
                requestedQty: line.requestedQty,
                acceptedQty: 0,
                suggestedQty: suggestion?.recommendedQty ?? null,
                lineStatus: declaredMasterDrugIdSet.has(masterDrug.id)
                    ? DrugOrderLineStatus.PENDING
                    : DrugOrderLineStatus.PENDING_CATALOG_CONFIRMATION,
                companyResponseReason: null,
                suggestionBasis: suggestion?.suggestionBasis ?? null,
                suggestionReportMonth: suggestion?.suggestionReportMonth ?? null,
                suggestionRuleVersion: suggestion?.suggestionRuleVersion ?? null,
            } satisfies Omit<Prisma.DrugOrderLineCreateManyInput, "orderId">;
        }

        const companyDrug = companyDrugById.get(line.sourceId);
        if (!companyDrug) {
            throw new RouteError(400, "Thuốc công ty không tồn tại");
        }

        const suggestion = companyDrug.masterDrugId
            ? suggestionSnapshots.get(companyDrug.masterDrugId)
            : undefined;

        return {
            sourceType: DrugOrderLineSourceType.COMPANY_DRUG,
            masterDrugId: companyDrug.masterDrugId,
            companyDrugId: companyDrug.id,
            displayName: companyDrug.companyDrugName,
            unit: companyDrug.unit,
            requestedQty: line.requestedQty,
            acceptedQty: 0,
            suggestedQty: suggestion?.recommendedQty ?? null,
            lineStatus: DrugOrderLineStatus.PENDING,
            companyResponseReason: null,
            suggestionBasis:
                suggestion?.suggestionBasis ||
                "Thuốc công ty này chưa liên kết thuốc chuẩn nên chưa có gợi ý.",
            suggestionReportMonth: suggestion?.suggestionReportMonth ?? null,
            suggestionRuleVersion: suggestion?.suggestionRuleVersion ?? null,
        } satisfies Omit<Prisma.DrugOrderLineCreateManyInput, "orderId">;
    });
}

type ParseDraftLineInputOptions = {
    allowZero?: boolean;
    allowedSourceTypes?: DrugOrderLineSourceType[];
};

function parseDraftLineInputsWithOptions(
    value: unknown,
    options?: ParseDraftLineInputOptions
): DraftLineInput[] {
    if (value === undefined || value === null) {
        return [];
    }

    if (!Array.isArray(value)) {
        throw new RouteError(400, "Danh sách dòng thuốc không hợp lệ");
    }

    const allowZero = options?.allowZero ?? false;
    const allowedSourceTypes = options?.allowedSourceTypes;

    return value.map((line, index) => {
        const sourceType =
            typeof line === "object" &&
            line !== null &&
            "sourceType" in line &&
            typeof line.sourceType === "string"
                ? line.sourceType
                : "";
        const sourceId =
            typeof line === "object" &&
            line !== null &&
            "sourceId" in line
                ? normalizeText(line.sourceId)
                : "";
        const requestedQtyRaw =
            typeof line === "object" &&
            line !== null &&
            "requestedQty" in line
                ? line.requestedQty
                : null;
        const hasExplicitRequestedQty =
            requestedQtyRaw !== null && requestedQtyRaw !== undefined && requestedQtyRaw !== "";
        const requestedQty = Number(requestedQtyRaw);

        if (
            sourceType !== DrugOrderLineSourceType.MASTER_DRUG &&
            sourceType !== DrugOrderLineSourceType.COMPANY_DRUG
        ) {
            throw new RouteError(400, `Loại dòng thuốc tại vị trí ${index + 1} không hợp lệ`);
        }

        if (!sourceId) {
            throw new RouteError(400, `Thiếu mã thuốc tại vị trí ${index + 1}`);
        }

        if (
            allowedSourceTypes &&
            !allowedSourceTypes.includes(sourceType)
        ) {
            throw new RouteError(
                400,
                `Loại dòng thuốc tại vị trí ${index + 1} không được phép trong thao tác này`
            );
        }

        if (
            !hasExplicitRequestedQty ||
            !Number.isFinite(requestedQty) ||
            requestedQty < 0 ||
            (!allowZero && requestedQty <= 0)
        ) {
            throw new RouteError(
                400,
                allowZero
                    ? `Số lượng yêu cầu tại vị trí ${index + 1} phải lớn hơn hoặc bằng 0`
                    : `Số lượng yêu cầu tại vị trí ${index + 1} phải lớn hơn 0`
            );
        }

        return {
            sourceType,
            sourceId,
            requestedQty,
        };
    });
}

export function parseDraftLineInputs(
    value: unknown,
    options?: ParseDraftLineInputOptions
) {
    return parseDraftLineInputsWithOptions(value, options);
}

export function parseCreateDraftLineInputs(value: unknown) {
    return parseDraftLineInputsWithOptions(value, {
        allowZero: true,
        allowedSourceTypes: [DrugOrderLineSourceType.COMPANY_DRUG],
    });
}

export function parseBaseReportMonth(value: unknown) {
    const normalized = normalizeText(value);
    if (!normalized) {
        return null;
    }

    if (parseReportMonthValue(normalized) === null) {
        throw new RouteError(400, "Tháng gốc XNT phải theo định dạng MM/YYYY");
    }

    return normalized;
}

export function parseDraftNote(value: unknown) {
    return normalizeOptionalText(value);
}

export function parseReceiptShipmentId(value: unknown) {
    const shipmentId = normalizeText(value);
    if (!shipmentId) {
        throw new RouteError(400, "Vui lòng chọn đợt giao cần xác nhận");
    }

    return shipmentId;
}

export function parseReceiptNote(value: unknown) {
    return normalizeOptionalText(value);
}

export function parseReceiptLineInputs(value: unknown): ReceiptLineInput[] {
    if (!Array.isArray(value) || value.length === 0) {
        throw new RouteError(400, "Danh sách dòng thực nhận không hợp lệ");
    }

    return value.map((line, index) => {
        const shipmentLineId =
            typeof line === "object" &&
            line !== null &&
            "shipmentLineId" in line
                ? normalizeText(line.shipmentLineId)
                : "";
        const receivedQtyRaw =
            typeof line === "object" &&
            line !== null &&
            "receivedQty" in line
                ? line.receivedQty
                : null;
        const receivedQty = Number(receivedQtyRaw);
        const differenceReason =
            typeof line === "object" &&
            line !== null &&
            "differenceReason" in line
                ? normalizeOptionalText(line.differenceReason)
                : null;

        if (!shipmentLineId) {
            throw new RouteError(400, `Thiếu dòng giao hàng tại vị trí ${index + 1}`);
        }

        if (!Number.isFinite(receivedQty) || receivedQty < 0) {
            throw new RouteError(
                400,
                `Số lượng thực nhận tại vị trí ${index + 1} phải lớn hơn hoặc bằng 0`
            );
        }

        return {
            shipmentLineId,
            receivedQty,
            differenceReason,
        };
    });
}

export async function loadFacilityDrugOrderListPayload(facilityId: string) {
    const [orders, companies, reportMonths] = await Promise.all([
        prisma.drugOrder.findMany({
            where: { facilityId },
            select: DRUG_ORDER_SUMMARY_SELECT,
            orderBy: [
                { updatedAt: "desc" },
                { createdAt: "desc" },
            ],
        }),
        prisma.company.findMany({
            where: { isActive: true },
            select: COMPANY_OPTION_SELECT,
            orderBy: { name: "asc" },
        }),
        listAvailableReportMonths(facilityId),
    ]);

    return {
        orders: orders.map(serializeOrderSummary),
        options: {
            companies: companies.map(serializeCompanyOption),
            reportMonths: buildReportMonthOptions(reportMonths),
            defaultBaseReportMonth: reportMonths[0] || null,
        },
    };
}

export async function loadFacilityDrugOrderDetailPayload(params: {
    facilityId: string;
    orderId: string;
}) {
    const order = await prisma.drugOrder.findFirst({
        where: {
            id: params.orderId,
            facilityId: params.facilityId,
        },
        select: DRUG_ORDER_DETAIL_SELECT,
    });

    if (!order) {
        throw new RouteError(404, "Đơn đặt hàng không tồn tại");
    }

    const companyDrugs = await listActiveCompanyDrugOptions(order.companyId);
    return {
        order: serializeOrderDetail(order, companyDrugs),
    };
}

export async function loadFacilityDrugOrderPrintPayload(params: {
    facilityId: string;
    orderId: string;
}) {
    const order = await prisma.drugOrder.findFirst({
        where: {
            id: params.orderId,
            facilityId: params.facilityId,
        },
        select: DRUG_ORDER_PRINT_SELECT,
    });

    if (!order) {
        throw new RouteError(404, "Đơn đặt hàng không tồn tại");
    }

    return {
        order: serializeOrderPrint(order),
    };
}

export type FacilityDrugOrderPrintPayload = Awaited<
    ReturnType<typeof loadFacilityDrugOrderPrintPayload>
>;

export async function createFacilityDrugOrderDraft(params: {
    facilityId: string;
    companyId: string;
    baseReportMonth: string | null;
    note: string | null;
    lines: DraftLineInput[];
}) {
    await getActiveCompanyOrThrow(params.companyId);

    const lineData = await buildDraftLineCreateInputs({
        facilityId: params.facilityId,
        companyId: params.companyId,
        baseReportMonth: params.baseReportMonth,
        lines: params.lines,
    });

    const created = await prisma.$transaction(async (tx) => {
        const order = await tx.drugOrder.create({
            data: {
                orderNo: buildDrugOrderNo(),
                facilityId: params.facilityId,
                companyId: params.companyId,
                status: DrugOrderStatus.DRAFT,
                baseReportMonth: params.baseReportMonth,
                note: params.note,
            },
            select: { id: true },
        });

        if (lineData.length > 0) {
            await tx.drugOrderLine.createMany({
                data: lineData.map((line) => ({
                    ...line,
                    orderId: order.id,
                })),
            });
        }

        return order;
    });

    return loadFacilityDrugOrderDetailPayload({
        facilityId: params.facilityId,
        orderId: created.id,
    });
}

export async function updateFacilityDrugOrderDraft(params: {
    facilityId: string;
    orderId: string;
    baseReportMonth: string | null;
    note: string | null;
    lines: DraftLineInput[];
}) {
    const order = await prisma.drugOrder.findFirst({
        where: {
            id: params.orderId,
            facilityId: params.facilityId,
        },
        select: {
            id: true,
            companyId: true,
            status: true,
            lines: {
                select: {
                    sourceType: true,
                    masterDrugId: true,
                },
            },
        },
    });

    if (!order) {
        throw new RouteError(404, "Đơn đặt hàng không tồn tại");
    }

    if (order.status !== DrugOrderStatus.DRAFT) {
        throw new RouteError(400, "Chỉ có thể cập nhật đơn ở trạng thái nháp");
    }

    const existingMasterDrugIds = new Set(
        order.lines
            .filter(
                (line) =>
                    line.sourceType === DrugOrderLineSourceType.MASTER_DRUG &&
                    Boolean(line.masterDrugId)
            )
            .map((line) => line.masterDrugId as string)
    );
    const hasNewMasterDrugLine = params.lines.some(
        (line) =>
            line.sourceType === DrugOrderLineSourceType.MASTER_DRUG &&
            !existingMasterDrugIds.has(line.sourceId)
    );
    if (hasNewMasterDrugLine) {
        throw new RouteError(400, "Đơn nháp chỉ được thêm thuốc từ danh mục công ty");
    }

    await getActiveCompanyOrThrow(order.companyId);

    const lineData = await buildDraftLineCreateInputs({
        facilityId: params.facilityId,
        companyId: order.companyId,
        baseReportMonth: params.baseReportMonth,
        lines: params.lines,
    });

    await prisma.$transaction(async (tx) => {
        await tx.drugOrder.update({
            where: { id: order.id },
            data: {
                baseReportMonth: params.baseReportMonth,
                note: params.note,
            },
        });

        await tx.drugOrderLine.deleteMany({
            where: { orderId: order.id },
        });

        if (lineData.length > 0) {
            await tx.drugOrderLine.createMany({
                data: lineData.map((line) => ({
                    ...line,
                    orderId: order.id,
                })),
            });
        }
    });

    return loadFacilityDrugOrderDetailPayload({
        facilityId: params.facilityId,
        orderId: order.id,
    });
}

export async function submitFacilityDrugOrder(params: {
    facilityId: string;
    orderId: string;
}) {
    const order = await prisma.drugOrder.findFirst({
        where: {
            id: params.orderId,
            facilityId: params.facilityId,
        },
        select: {
            id: true,
            companyId: true,
            status: true,
            lines: {
                select: {
                    id: true,
                    requestedQty: true,
                },
            },
        },
    });

    if (!order) {
        throw new RouteError(404, "Đơn đặt hàng không tồn tại");
    }

    if (order.status !== DrugOrderStatus.DRAFT) {
        throw new RouteError(400, "Chỉ có thể gửi đơn ở trạng thái nháp");
    }

    if (order.lines.length === 0) {
        throw new RouteError(400, "Đơn nháp phải có ít nhất một dòng thuốc trước khi gửi");
    }

    const invalidLineCount = order.lines.filter(
        (line) => toNumber(line.requestedQty) <= 0
    ).length;
    if (invalidLineCount > 0) {
        throw new RouteError(
            400,
            invalidLineCount === 1
                ? "Còn 1 dòng chưa nhập số lượng hợp lệ"
                : `Còn ${invalidLineCount} dòng chưa nhập số lượng hợp lệ`
        );
    }

    await getActiveCompanyOrThrow(order.companyId);

    await prisma.drugOrder.update({
        where: { id: order.id },
        data: {
            status: DrugOrderStatus.SUBMITTED,
            submittedAt: new Date(),
        },
    });

    return loadFacilityDrugOrderDetailPayload({
        facilityId: params.facilityId,
        orderId: order.id,
    });
}

export async function recallFacilityDrugOrder(params: {
    facilityId: string;
    orderId: string;
}) {
    const order = await prisma.drugOrder.findFirst({
        where: {
            id: params.orderId,
            facilityId: params.facilityId,
        },
        select: {
            id: true,
            status: true,
            lines: {
                select: {
                    lineStatus: true,
                },
            },
            _count: {
                select: {
                    shipments: true,
                },
            },
        },
    });

    if (!order) {
        throw new RouteError(404, "Đơn đặt hàng không tồn tại");
    }

    if (order.status !== DrugOrderStatus.SUBMITTED) {
        throw new RouteError(400, "Chỉ có thể thu hồi đơn đã gửi");
    }

    if (order._count.shipments > 0) {
        throw new RouteError(400, "Không thể thu hồi đơn đã phát sinh đợt giao");
    }

    const canRecall = order.lines.every((line) =>
        line.lineStatus === DrugOrderLineStatus.PENDING ||
        line.lineStatus === DrugOrderLineStatus.PENDING_CATALOG_CONFIRMATION
    );
    if (!canRecall) {
        throw new RouteError(400, "Không thể thu hồi đơn đã được công ty xử lý");
    }

    await prisma.drugOrder.update({
        where: { id: order.id },
        data: {
            status: DrugOrderStatus.DRAFT,
            submittedAt: null,
        },
    });

    return loadFacilityDrugOrderDetailPayload({
        facilityId: params.facilityId,
        orderId: order.id,
    });
}

export async function confirmFacilityDrugOrderReceipt(params: {
    facilityId: string;
    orderId: string;
    shipmentId: string;
    note: string | null;
    lines: ReceiptLineInput[];
}) {
    const receiptMap = new Map<string, ReceiptLineInput>();
    params.lines.forEach((line, index) => {
        if (receiptMap.has(line.shipmentLineId)) {
            throw new RouteError(
                400,
                `Dòng thực nhận tại vị trí ${index + 1} đang bị lặp`
            );
        }

        receiptMap.set(line.shipmentLineId, line);
    });

    try {
        const orderId = await prisma.$transaction(async (tx) => {
            const order = await tx.drugOrder.findFirst({
                where: {
                    id: params.orderId,
                    facilityId: params.facilityId,
                },
                select: {
                    id: true,
                    status: true,
                    shipments: {
                        where: {
                            id: params.shipmentId,
                        },
                        select: {
                            id: true,
                            shipmentNo: true,
                            status: true,
                            lines: {
                                orderBy: { createdAt: "asc" },
                                select: {
                                    id: true,
                                    orderLineId: true,
                                    shippedQty: true,
                                },
                            },
                            receipts: {
                                select: {
                                    id: true,
                                },
                            },
                        },
                    },
                    lines: {
                        select: {
                            id: true,
                            acceptedQty: true,
                            receiptLines: {
                                select: {
                                    receivedQty: true,
                                },
                            },
                        },
                    },
                },
            });

            if (!order) {
                throw new RouteError(404, "Đơn đặt hàng không tồn tại");
            }

            if (
                order.status !== DrugOrderStatus.IN_DELIVERY &&
                order.status !== DrugOrderStatus.READY_FOR_SHIPMENT
            ) {
                throw new RouteError(400, "Chỉ có thể xác nhận đợt giao của đơn đang giao");
            }

            const shipment = order.shipments[0];
            if (!shipment) {
                throw new RouteError(404, "Đợt giao không tồn tại hoặc không thuộc đơn hiện tại");
            }

            if (shipment.receipts.length > 0) {
                throw new RouteError(400, "Đợt giao này đã được xác nhận thực nhận");
            }

            if (shipment.lines.length === 0) {
                throw new RouteError(400, "Đợt giao không có dòng nào để xác nhận");
            }

            if (receiptMap.size !== shipment.lines.length) {
                throw new RouteError(
                    400,
                    "Cơ sở phải xác nhận đủ tất cả các dòng của đợt giao"
                );
            }

            const createdReceipt = await tx.drugOrderReceipt.create({
                data: {
                    orderId: order.id,
                    shipmentId: shipment.id,
                    facilityId: params.facilityId,
                    note: params.note,
                },
                select: {
                    id: true,
                },
            });

            for (const shipmentLine of shipment.lines) {
                const receiptLine = receiptMap.get(shipmentLine.id);
                if (!receiptLine) {
                    throw new RouteError(
                        400,
                        "Cơ sở phải xác nhận đủ tất cả các dòng của đợt giao"
                    );
                }

                const shippedQty = toNumber(shipmentLine.shippedQty);
                if (receiptLine.receivedQty > shippedQty) {
                    throw new RouteError(
                        400,
                        "Số lượng thực nhận không được vượt số lượng công ty đã giao"
                    );
                }

                if (
                    receiptLine.receivedQty !== shippedQty &&
                    !receiptLine.differenceReason
                ) {
                    throw new RouteError(
                        400,
                        "Vui lòng nhập lý do khi số lượng thực nhận khác số lượng giao"
                    );
                }

                await tx.drugOrderReceiptLine.create({
                    data: {
                        receiptId: createdReceipt.id,
                        shipmentLineId: shipmentLine.id,
                        orderLineId: shipmentLine.orderLineId,
                        receivedQty: receiptLine.receivedQty,
                        differenceReason: receiptLine.differenceReason,
                    },
                });
            }

            await tx.drugOrderShipment.update({
                where: {
                    id: shipment.id,
                },
                data: {
                    status: shipment.lines.every((line) => {
                        const receiptLine = receiptMap.get(line.id);
                        return receiptLine
                            ? receiptLine.receivedQty >= toNumber(line.shippedQty)
                            : false;
                    })
                        ? DrugOrderShipmentStatus.RECEIVED
                        : DrugOrderShipmentStatus.PARTIALLY_RECEIVED,
                },
            });

            for (const line of order.lines) {
                const acceptedQty = toNumber(line.acceptedQty);
                const currentReceivedQty = line.receiptLines.reduce(
                    (sum, receiptLine) => sum + toNumber(receiptLine.receivedQty),
                    0
                );
                const newlyReceivedQty = shipment.lines
                    .filter((shipmentLine) => shipmentLine.orderLineId === line.id)
                    .reduce((sum, shipmentLine) => {
                        const receiptLine = receiptMap.get(shipmentLine.id);
                        return sum + (receiptLine ? receiptLine.receivedQty : 0);
                    }, 0);
                const totalReceivedQty = currentReceivedQty + newlyReceivedQty;

                if (acceptedQty > 0 && totalReceivedQty >= acceptedQty) {
                    await tx.drugOrderLine.update({
                        where: {
                            id: line.id,
                        },
                        data: {
                            lineStatus: DrugOrderLineStatus.COMPLETED,
                        },
                    });
                }
            }

            const refreshedLines = await tx.drugOrderLine.findMany({
                where: {
                    orderId: order.id,
                },
                select: {
                    acceptedQty: true,
                    receiptLines: {
                        select: {
                            receivedQty: true,
                        },
                    },
                },
            });

            const isCompleted = refreshedLines.every((line) => {
                const acceptedQty = toNumber(line.acceptedQty);
                if (acceptedQty <= 0) {
                    return true;
                }

                const totalReceivedQty = line.receiptLines.reduce(
                    (sum, receiptLine) => sum + toNumber(receiptLine.receivedQty),
                    0
                );

                return totalReceivedQty >= acceptedQty;
            });

            await tx.drugOrder.update({
                where: {
                    id: order.id,
                },
                data: {
                    status: isCompleted
                        ? DrugOrderStatus.COMPLETED
                        : DrugOrderStatus.IN_DELIVERY,
                    closedAt: isCompleted ? new Date() : null,
                },
            });

            return order.id;
        }, DRUG_ORDER_SERIALIZABLE_TRANSACTION);

        return loadFacilityDrugOrderDetailPayload({
            facilityId: params.facilityId,
            orderId,
        });
    } catch (error) {
        rethrowDrugOrderConcurrencyError(
            error,
            "Đợt giao vừa được xử lý bởi thao tác khác. Vui lòng tải lại và thử lại."
        );
    }
}
