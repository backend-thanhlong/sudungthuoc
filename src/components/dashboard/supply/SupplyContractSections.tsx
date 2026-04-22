import type {
    SupplyContractRiskBucket,
    SupplyContractRiskRow,
    SupplyScope,
    SupplySupplierDependencyRow,
} from "@/lib/dashboard/supply-insights";

interface SupplyContractSectionsProps {
    scope: SupplyScope;
    contractRisk: SupplyContractRiskRow[];
    supplierDependency: SupplySupplierDependencyRow[];
}

const formatNumber = (value: number) =>
    new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(value);

const formatCurrencyCompact = (value: number) =>
    `${new Intl.NumberFormat("vi-VN", {
        notation: "compact",
        maximumFractionDigits: 1,
    }).format(value)} đ`;

const CONTRACT_BUCKET_META: Record<SupplyContractRiskBucket, { label: string; className: string }> = {
    expired: { label: "Đã hết hạn", className: "bg-red-100 text-red-700 border-red-200" },
    within_30_days: { label: "<= 30 ngày", className: "bg-orange-100 text-orange-700 border-orange-200" },
    within_60_days: { label: "31-60 ngày", className: "bg-amber-100 text-amber-700 border-amber-200" },
    within_90_days: { label: "61-90 ngày", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
};

function formatContractDate(value: string) {
    const normalized = value.trim();
    if (!/^\d{8}$/.test(normalized)) {
        return "N/A";
    }

    return `${normalized.slice(6, 8)}/${normalized.slice(4, 6)}/${normalized.slice(0, 4)}`;
}

export default function SupplyContractSections({
    scope,
    contractRisk,
    supplierDependency,
}: SupplyContractSectionsProps) {
    const bucketCounts = contractRisk.reduce<Record<SupplyContractRiskBucket, number>>(
        (accumulator, row) => ({
            ...accumulator,
            [row.bucket]: accumulator[row.bucket] + 1,
        }),
        {
            expired: 0,
            within_30_days: 0,
            within_60_days: 0,
            within_90_days: 0,
        }
    );

    return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-100">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h3 className="font-semibold text-gray-800 mb-1">Rủi ro hợp đồng sắp hết</h3>
                        <p className="text-xs text-gray-500">
                            Chỉ hiển thị các thuốc còn nhu cầu sử dụng và có ngày kết thúc hợp đồng nằm trong 90 ngày hoặc đã hết hạn.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(CONTRACT_BUCKET_META).map(([bucket, meta]) => (
                            <span
                                key={bucket}
                                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${meta.className}`}
                            >
                                {meta.label}: {bucketCounts[bucket as SupplyContractRiskBucket]}
                            </span>
                        ))}
                    </div>
                </div>
                <div className="overflow-x-auto max-h-[340px] overflow-y-auto mt-4">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0">
                            <tr className="bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white">
                                <th className="text-left p-3 font-semibold rounded-tl-lg">STT</th>
                                {scope === "admin" && <th className="text-left p-3 font-semibold">Cơ sở</th>}
                                <th className="text-left p-3 font-semibold">Thuốc</th>
                                <th className="text-left p-3 font-semibold">Nhà cung cấp</th>
                                <th className="text-right p-3 font-semibold">Kết thúc HĐ</th>
                                <th className="text-right p-3 font-semibold">Nhu cầu BQ</th>
                                <th className="text-center p-3 font-semibold rounded-tr-lg">Mức rủi ro</th>
                            </tr>
                        </thead>
                        <tbody>
                            {contractRisk.map((row, index) => (
                                <tr key={`${row.facility}-${row.drugName}-${index}`} className="border-b border-gray-50 hover:bg-fuchsia-50/40 transition-colors">
                                    <td className="p-3 text-gray-500">{index + 1}</td>
                                    {scope === "admin" && <td className="p-3 text-gray-700">{row.facility}</td>}
                                    <td className="p-3">
                                        <p className="font-medium text-gray-800">{row.drugName}</p>
                                        <p className="text-xs text-gray-500">{row.hoatChat}{row.hamLuong ? ` • ${row.hamLuong}` : ""}</p>
                                    </td>
                                    <td className="p-3">
                                        <p className="text-gray-700">{row.supplierName}</p>
                                        {row.awardDecision && <p className="text-xs text-gray-400">QĐ: {row.awardDecision}</p>}
                                    </td>
                                    <td className="p-3 text-right">
                                        <p className="font-mono text-gray-800">{formatContractDate(row.contractEndDate)}</p>
                                        <p className="text-xs text-gray-500">{row.daysToExpiry >= 0 ? `${row.daysToExpiry} ngày` : `${Math.abs(row.daysToExpiry)} ngày quá hạn`}</p>
                                    </td>
                                    <td className="p-3 text-right font-mono text-gray-700">{formatNumber(row.demandAvg)}</td>
                                    <td className="p-3 text-center">
                                        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${CONTRACT_BUCKET_META[row.bucket].className}`}>
                                            {CONTRACT_BUCKET_META[row.bucket].label}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {contractRisk.length === 0 && (
                        <p className="text-center text-gray-400 py-8">Không có thuốc nào rơi vào vùng rủi ro hợp đồng trong 90 ngày.</p>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-100">
                <h3 className="font-semibold text-gray-800 mb-1">
                    {scope === "admin" ? "Phụ thuộc nhà cung cấp" : "Cơ cấu nhà cung cấp của cơ sở"}
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                    Gom theo nhà cung cấp trên các thuốc đang còn nhu cầu để nhìn mức độ phụ thuộc và rủi ro hợp đồng.
                </p>
                <div className="overflow-x-auto max-h-[340px] overflow-y-auto">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0">
                            <tr className="bg-gradient-to-r from-slate-800 to-slate-700 text-white">
                                <th className="text-left p-3 font-semibold rounded-tl-lg">Nhà cung cấp</th>
                                {scope === "admin" && <th className="text-right p-3 font-semibold">Cơ sở</th>}
                                <th className="text-right p-3 font-semibold">Thuốc có nhu cầu</th>
                                <th className="text-right p-3 font-semibold">Giá trị tồn</th>
                                <th className="text-right p-3 font-semibold">Giá trị rủi ro</th>
                                <th className="text-right p-3 font-semibold">HĐ sắp hết</th>
                                <th className="text-right p-3 font-semibold rounded-tr-lg">HĐ hết hạn</th>
                            </tr>
                        </thead>
                        <tbody>
                            {supplierDependency.map(row => (
                                <tr key={row.supplierName} className="border-b border-gray-50 hover:bg-slate-50 transition-colors">
                                    <td className="p-3 text-gray-800 font-medium">{row.supplierName}</td>
                                    {scope === "admin" && <td className="p-3 text-right font-mono text-gray-700">{row.facilityCount}</td>}
                                    <td className="p-3 text-right font-mono text-gray-700">{row.activeDrugCount}</td>
                                    <td className="p-3 text-right font-mono text-gray-700">{formatCurrencyCompact(row.endingInventoryValue)}</td>
                                    <td className="p-3 text-right font-mono text-amber-700 font-semibold">{formatCurrencyCompact(row.riskValue)}</td>
                                    <td className="p-3 text-right font-mono text-fuchsia-700">{row.expiringContractCount}</td>
                                    <td className="p-3 text-right font-mono text-red-700">{row.expiredContractCount}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {supplierDependency.length === 0 && (
                        <p className="text-center text-gray-400 py-8">Không có nhà cung cấp nào đủ dữ liệu để tổng hợp trong bộ lọc hiện tại.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
