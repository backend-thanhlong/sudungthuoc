import type { ActiveSessionContext } from "@/lib/server-authz";
import prisma from "@/lib/prisma";
import type { AIAgentRequest, AIToolResult } from "@/lib/ai/types";

function normalizeComparable(value: string | null | undefined) {
    return (value || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ");
}

export async function reviewFacilityReportEvidence(request: AIAgentRequest): Promise<AIToolResult> {
    const rows = request.evidence?.rows || [];
    const findings = rows.flatMap((row) => {
        const item = row as Record<string, unknown>;
        const tonDau = Number(item.tonDau || 0);
        const nhap = Number(item.nhap || 0);
        const nhapHoanTra = Number(item.nhapHoanTra || 0);
        const xuat = Number(item.xuat || 0);
        const tonCuoi = Number(item.tonCuoi || 0);
        const giaVat = Number(item.giaVat || 0);
        const thanhTienTonCuoi = Number(item.thanhTienTonCuoi || 0);
        const expectedTonCuoi = tonDau + nhap + nhapHoanTra - xuat;
        const base = {
            stt: item.stt,
            maNoiBo: item.maNoiBo,
            drugName: item.drugName,
        };
        const rowFindings = [];
        if (Math.abs(expectedTonCuoi - tonCuoi) > 0.01) {
            rowFindings.push({ ...base, type: "BALANCE_MISMATCH", expectedTonCuoi, actualTonCuoi: tonCuoi });
        }
        if (xuat > tonDau + nhap + nhapHoanTra) {
            rowFindings.push({ ...base, type: "EXPORT_EXCEEDS_AVAILABLE", tonDau, nhap, nhapHoanTra, xuat });
        }
        if (giaVat === 0 && (tonCuoi > 0 || thanhTienTonCuoi > 0)) {
            rowFindings.push({ ...base, type: "ZERO_PRICE_WITH_STOCK" });
        }
        if (Array.isArray(item.warnings) && item.warnings.length > 0) {
            rowFindings.push({ ...base, type: "CLIENT_VALIDATION_WARNING", warnings: item.warnings });
        }
        return rowFindings;
    }).slice(0, 30);

    return {
        name: "reviewFacilityReportEvidence",
        status: "success",
        data: {
            summary: request.evidence?.summary || {},
            findingCount: findings.length,
            findings,
        },
    };
}

export async function reviewStoredFacilityReport(
    sessionContext: ActiveSessionContext,
    request: AIAgentRequest
): Promise<AIToolResult> {
    const reportMonth = request.context?.reportMonth?.trim();
    if (!reportMonth) {
        return {
            name: "reviewStoredFacilityReport",
            status: "skipped",
            warning: "Không có reportMonth để kiểm tra báo cáo đã nộp",
        };
    }

    const reports = await prisma.inventoryReport.findMany({
        where: {
            facilityId: sessionContext.user.id,
            reportMonth,
        },
        select: {
            tonDau: true,
            nhap: true,
            nhapHoanTra: true,
            xuat: true,
            tonCuoi: true,
            giaVat: true,
            thanhTienTonCuoi: true,
            drugMap: {
                select: {
                    maNoiBo: true,
                    tenThuocNoiBo: true,
                    masterDrugId: true,
                    masterDrug: {
                        select: { tenThuoc: true },
                    },
                },
            },
        },
        take: 1000,
    });

    const findings = reports.flatMap(report => {
        const tonDau = Number(report.tonDau);
        const nhap = Number(report.nhap);
        const nhapHoanTra = Number(report.nhapHoanTra);
        const xuat = Number(report.xuat);
        const tonCuoi = Number(report.tonCuoi);
        const expectedTonCuoi = tonDau + nhap + nhapHoanTra - xuat;
        const base = {
            maNoiBo: report.drugMap.maNoiBo,
            drugName: report.drugMap.masterDrug?.tenThuoc || report.drugMap.tenThuocNoiBo,
        };
        const items = [];
        if (Math.abs(expectedTonCuoi - tonCuoi) > 0.01) {
            items.push({ ...base, type: "BALANCE_MISMATCH", expectedTonCuoi, actualTonCuoi: tonCuoi });
        }
        if (xuat > tonDau + nhap + nhapHoanTra) {
            items.push({ ...base, type: "EXPORT_EXCEEDS_AVAILABLE", tonDau, nhap, nhapHoanTra, xuat });
        }
        if (!report.drugMap.masterDrugId) {
            items.push({ ...base, type: "UNMAPPED_DRUG" });
        }
        if (Number(report.giaVat) === 0 && (tonCuoi > 0 || Number(report.thanhTienTonCuoi) > 0)) {
            items.push({ ...base, type: "ZERO_PRICE_WITH_STOCK" });
        }
        return items;
    }).slice(0, 30);

    return {
        name: "reviewStoredFacilityReport",
        status: "success",
        data: {
            reportMonth,
            rowCount: reports.length,
            findingCount: findings.length,
            findings,
        },
    };
}

export async function reviewFacilityMappings(sessionContext: ActiveSessionContext): Promise<AIToolResult> {
    const mappings = await prisma.facilityDrugMap.findMany({
        where: { facilityId: sessionContext.user.id },
        select: {
            maNoiBo: true,
            tenThuocNoiBo: true,
            hoatChatNoiBo: true,
            soDangKyNoiBo: true,
            donViTinhNoiBo: true,
            status: true,
            adminNote: true,
            isOutOfCatalog: true,
            masterDrugId: true,
        },
        orderBy: { updatedAt: "desc" },
        take: 500,
    });

    const nameGroups = new Map<string, typeof mappings>();
    for (const mapping of mappings) {
        const key = normalizeComparable(mapping.tenThuocNoiBo);
        if (!key) continue;
        nameGroups.set(key, [...(nameGroups.get(key) || []), mapping]);
    }

    const duplicateNames = Array.from(nameGroups.entries())
        .filter(([, group]) => group.length > 1)
        .slice(0, 10)
        .map(([normalizedName, group]) => ({
            normalizedName,
            rows: group.map(item => ({
                maNoiBo: item.maNoiBo,
                tenThuocNoiBo: item.tenThuocNoiBo,
                status: item.status,
            })),
        }));

    const missingInfo = mappings
        .filter(mapping => !mapping.hoatChatNoiBo || !mapping.soDangKyNoiBo || !mapping.donViTinhNoiBo)
        .slice(0, 30)
        .map(mapping => ({
            maNoiBo: mapping.maNoiBo,
            tenThuocNoiBo: mapping.tenThuocNoiBo,
            missing: [
                !mapping.hoatChatNoiBo ? "hoatChatNoiBo" : null,
                !mapping.soDangKyNoiBo ? "soDangKyNoiBo" : null,
                !mapping.donViTinhNoiBo ? "donViTinhNoiBo" : null,
            ].filter(Boolean),
            status: mapping.status,
        }));

    return {
        name: "reviewFacilityMappings",
        status: "success",
        data: {
            total: mappings.length,
            statusCounts: {
                pending: mappings.filter(mapping => mapping.status === "PENDING_MAPPING").length,
                waitingApproval: mappings.filter(mapping => mapping.status === "WAITING_APPROVAL").length,
                approved: mappings.filter(mapping => mapping.status === "APPROVED").length,
                rejected: mappings.filter(mapping => mapping.status === "REJECTED").length,
                outOfCatalog: mappings.filter(mapping => mapping.isOutOfCatalog).length,
            },
            missingInfo,
            duplicateNames,
            rejected: mappings
                .filter(mapping => mapping.status === "REJECTED")
                .slice(0, 30)
                .map(mapping => ({
                    maNoiBo: mapping.maNoiBo,
                    tenThuocNoiBo: mapping.tenThuocNoiBo,
                    adminNote: mapping.adminNote,
                })),
        },
    };
}
