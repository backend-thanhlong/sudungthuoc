import type { SupplyDataCoverage } from "@/lib/dashboard/supply-insights";

interface SupplyCoverageSectionProps {
    data: SupplyDataCoverage | null;
}

const LOW_COVERAGE_THRESHOLD = 0.7;

function formatRatio(count: number, total: number) {
    return `${new Intl.NumberFormat("vi-VN").format(count)}/${new Intl.NumberFormat("vi-VN").format(total)}`;
}

function formatPercent(count: number, total: number) {
    if (total === 0) {
        return "0%";
    }

    return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format((count * 100) / total)}%`;
}

function CoverageCard({
    label,
    value,
    meta,
    ratio,
}: {
    label: string;
    value: string;
    meta: string;
    ratio: number;
}) {
    const isLowCoverage = ratio < LOW_COVERAGE_THRESHOLD;

    return (
        <div className="rounded-xl border border-border bg-muted/40 p-4">
            <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-foreground">{label}</p>
                {isLowCoverage && (
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
                        Độ phủ dữ liệu thấp
                    </span>
                )}
            </div>
            <p className="mt-3 text-2xl font-bold text-foreground">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{meta}</p>
        </div>
    );
}

export default function SupplyCoverageSection({ data }: SupplyCoverageSectionProps) {
    if (!data) {
        return null;
    }

    const cards = [
        {
            label: "Cơ sở có dữ liệu",
            value: formatRatio(data.reportingFacilityCount, data.activeFacilityCount),
            meta: `${formatPercent(data.reportingFacilityCount, data.activeFacilityCount)} cơ sở active đã có dữ liệu kỳ này`,
            ratio: data.activeFacilityCount > 0 ? data.reportingFacilityCount / data.activeFacilityCount : 0,
        },
        {
            label: "Dòng có giá",
            value: formatRatio(data.rowsWithPrice, data.snapshotRowCount),
            meta: `${formatPercent(data.rowsWithPrice, data.snapshotRowCount)} snapshot có giá VAT`,
            ratio: data.snapshotRowCount > 0 ? data.rowsWithPrice / data.snapshotRowCount : 0,
        },
        {
            label: "Dòng có thông tin hợp đồng",
            value: formatRatio(data.rowsWithContractInfo, data.snapshotRowCount),
            meta: `${formatPercent(data.rowsWithContractInfo, data.snapshotRowCount)} snapshot có QĐ, NCC và ngày kết thúc HĐ`,
            ratio: data.snapshotRowCount > 0 ? data.rowsWithContractInfo / data.snapshotRowCount : 0,
        },
        {
            label: "Dòng map được master drug",
            value: formatRatio(data.rowsMappedMasterDrug, data.snapshotRowCount),
            meta: `${formatPercent(data.rowsMappedMasterDrug, data.snapshotRowCount)} snapshot đã nối master drug`,
            ratio: data.snapshotRowCount > 0 ? data.rowsMappedMasterDrug / data.snapshotRowCount : 0,
        },
        {
            label: "Dòng có phân loại nội/ngoại",
            value: formatRatio(data.rowsWithDomesticClassification, data.snapshotRowCount),
            meta: `${formatPercent(data.rowsWithDomesticClassification, data.snapshotRowCount)} snapshot có phân loại trong nước / nước ngoài`,
            ratio: data.snapshotRowCount > 0 ? data.rowsWithDomesticClassification / data.snapshotRowCount : 0,
        },
    ];

    return (
        <div className="rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm">
            <h3 className="font-semibold text-foreground mb-1">Độ phủ dữ liệu báo cáo</h3>
            <p className="text-xs text-muted-foreground mb-4">
                Khối này giúp admin hiểu dashboard hiện đang phản ánh bao nhiêu cơ sở và bao nhiêu dòng dữ liệu thực sự đủ điều kiện phân tích.
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {cards.map(card => (
                    <CoverageCard
                        key={card.label}
                        label={card.label}
                        value={card.value}
                        meta={card.meta}
                        ratio={card.ratio}
                    />
                ))}
            </div>
        </div>
    );
}
