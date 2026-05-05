import type { Role } from "@/../prisma/generated/client";

export type AIPolicyRole = Extract<Role, "ADMIN" | "FACILITY">;

export const AI_TOOL_REGISTRY = [
    {
        name: "getDashboardOverview",
        label: "Tong quan dashboard",
        description: "Tong hop gia tri ton kho, so dong bao cao, co so active va cac thang gan day.",
        roles: ["ADMIN"],
        modes: ["chat"],
        surfaces: ["dashboard"],
    },
    {
        name: "getSupplyRisk",
        label: "Rui ro cung ung",
        description: "Phan tich nguy co dut hang, ton chet va nhu cau dua tren bao cao ton kho.",
        roles: ["ADMIN"],
        modes: ["chat"],
        surfaces: ["dashboard"],
    },
    {
        name: "getReportSubmissionStatus",
        label: "Trang thai nop bao cao",
        description: "Kiem tra co so da nop/chua nop bao cao theo thang duoc chon.",
        roles: ["ADMIN"],
        modes: ["chat"],
        surfaces: ["dashboard"],
    },
    {
        name: "getMappingBacklog",
        label: "Ton dong anh xa",
        description: "Dem cac dong danh muc dang cho anh xa, cho duyet, bi tu choi hoac ngoai danh muc.",
        roles: ["ADMIN"],
        modes: ["chat"],
        surfaces: ["dashboard"],
    },
    {
        name: "getFacilityReportAnomalies",
        label: "Bat thuong bao cao",
        description: "Tim cac dong ton kho lech can doi, xuat vuot ton, chua anh xa hoac gia bang 0.",
        roles: ["ADMIN"],
        modes: ["chat"],
        surfaces: ["dashboard"],
    },
    {
        name: "querySafeDatabase",
        label: "Truy van database an toan",
        description: "Tra loi cau hoi linh hoat cua admin bang SELECT gioi han tren cac ai_* safe views.",
        roles: ["ADMIN"],
        modes: ["chat"],
        surfaces: ["dashboard"],
    },
    {
        name: "getMyReportSummary",
        label: "Bao cao cua co so",
        description: "Tong hop so dong, gia tri ton kho va lan nop bao cao gan nhat cua co so dang dang nhap.",
        roles: ["FACILITY"],
        modes: ["chat"],
        surfaces: ["dashboard"],
    },
    {
        name: "getMyReportAnomalies",
        label: "Bat thuong cua co so",
        description: "Tim cac bat thuong trong bao cao ton kho cua co so dang dang nhap.",
        roles: ["FACILITY"],
        modes: ["chat"],
        surfaces: ["dashboard"],
    },
    {
        name: "getMyMappingIssues",
        label: "Van de anh xa cua co so",
        description: "Tong hop dong cho anh xa, thieu thong tin, bi tu choi va ngoai danh muc cua co so.",
        roles: ["FACILITY"],
        modes: ["chat"],
        surfaces: ["dashboard"],
    },
    {
        name: "getMySupplyRisks",
        label: "Rui ro cung ung cua co so",
        description: "Phan tich nguy co dut hang va ton chet trong pham vi co so dang dang nhap.",
        roles: ["FACILITY"],
        modes: ["chat"],
        surfaces: ["dashboard"],
    },
    {
        name: "reviewFacilityReportEvidence",
        label: "Kiem tra evidence bao cao",
        description: "Kiem tra nhanh du lieu bao cao tu client truoc khi doi chieu ban ghi da luu.",
        roles: ["FACILITY"],
        modes: ["review"],
        surfaces: ["facility_reports"],
    },
    {
        name: "reviewStoredFacilityReport",
        label: "Kiem tra bao cao da luu",
        description: "Kiem tra bat thuong tren bao cao ton kho da luu cua co so theo thang.",
        roles: ["FACILITY"],
        modes: ["review"],
        surfaces: ["facility_reports"],
    },
    {
        name: "reviewFacilityMappings",
        label: "Kiem tra anh xa danh muc",
        description: "Kiem tra dong anh xa thieu thong tin, trung ten va bi tu choi cua co so.",
        roles: ["FACILITY"],
        modes: ["review"],
        surfaces: ["facility_mappings"],
    },
] as const;

export type AIToolName = (typeof AI_TOOL_REGISTRY)[number]["name"];
export type AIToolDefinition = (typeof AI_TOOL_REGISTRY)[number];

const TOOL_NAME_SET = new Set<string>(AI_TOOL_REGISTRY.map(tool => tool.name));

export function isKnownAIToolName(name: string): name is AIToolName {
    return TOOL_NAME_SET.has(name);
}

export function getAIToolDefinitionsForRole(role: Role) {
    if (role !== "ADMIN" && role !== "FACILITY") {
        return [];
    }

    return AI_TOOL_REGISTRY.filter(tool => (tool.roles as readonly AIPolicyRole[]).includes(role));
}
