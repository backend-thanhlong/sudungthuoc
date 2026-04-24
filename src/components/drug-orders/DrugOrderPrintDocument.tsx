import { QRCodeSVG } from "qrcode.react";
import DrugOrderPrintActions from "@/components/drug-orders/DrugOrderPrintActions";
import type { FacilityDrugOrderPrintPayload } from "@/lib/drug-orders/facility";

type PrintOrder = FacilityDrugOrderPrintPayload["order"];
type PrintLine = PrintOrder["lines"][number];

const ORDER_STATUS_LABELS: Record<string, string> = {
    DRAFT: "Nháp",
    SUBMITTED: "Đã gửi",
    REJECTED: "Bị từ chối",
    READY_FOR_SHIPMENT: "Sẵn sàng giao",
    IN_DELIVERY: "Đang giao",
    COMPLETED: "Hoàn tất",
};

const LINE_STATUS_LABELS: Record<string, string> = {
    PENDING: "Chờ phản hồi",
    PENDING_CATALOG_CONFIRMATION: "Chờ xác nhận danh mục",
    CONFIRMED: "Xác nhận đủ",
    PARTIAL: "Xác nhận một phần",
    REJECTED: "Từ chối",
    COMPLETED: "Hoàn tất",
};

function formatDateTime(value: string | Date | null | undefined) {
    if (!value) {
        return "-";
    }

    return new Date(value).toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}

function formatQuantity(value: number | null | undefined) {
    if (value === null || value === undefined) {
        return "-";
    }

    return new Intl.NumberFormat("vi-VN", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(value);
}

function formatText(value: string | null | undefined) {
    const normalized = value?.trim();
    return normalized ? normalized : "-";
}

function lineCode(line: PrintLine) {
    return line.companyDrug?.companyDrugCode || line.masterDrug?.maChung || "-";
}

function lineDescription(line: PrintLine) {
    const activeIngredient =
        line.companyDrug?.activeIngredient || line.masterDrug?.hoatChat || null;
    const strength = line.masterDrug?.hamLuong || null;
    const dosage = line.masterDrug?.dangBaoChe || null;
    const specification = line.companyDrug?.quyCach || line.masterDrug?.quyCach || null;
    const registration = line.masterDrug?.soDangKy || null;

    return [activeIngredient, strength, dosage, specification, registration]
        .filter((item): item is string => Boolean(item?.trim()))
        .join(" | ");
}

function InfoItem(props: { label: string; value: string }) {
    return (
        <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase text-slate-500">
                {props.label}
            </p>
            <p className="mt-1 break-words text-[12px] font-semibold text-slate-950">
                {props.value}
            </p>
        </div>
    );
}

export default function DrugOrderPrintDocument({
    payload,
    lookupUrl,
}: {
    payload: FacilityDrugOrderPrintPayload;
    lookupUrl: string;
}) {
    const { order } = payload;
    const totalRequestedQty = order.lines.reduce(
        (sum, line) => sum + line.requestedQty,
        0
    );
    const totalAcceptedQty = order.lines.reduce((sum, line) => sum + line.acceptedQty, 0);

    return (
        <div className="min-h-screen bg-slate-100 text-slate-950 print:bg-white">
            <style
                dangerouslySetInnerHTML={{
                    __html: `
                        @page {
                            size: A4 portrait;
                            margin: 12mm;
                        }

                        @media print {
                            html, body {
                                background: #fff !important;
                            }

                            .print-hidden {
                                display: none !important;
                            }

                            .print-sheet {
                                width: auto !important;
                                min-height: 0 !important;
                                margin: 0 !important;
                                padding: 0 !important;
                                border: 0 !important;
                                box-shadow: none !important;
                            }

                            .avoid-break {
                                break-inside: avoid;
                                page-break-inside: avoid;
                            }

                            thead {
                                display: table-header-group;
                            }

                            tr {
                                break-inside: avoid;
                                page-break-inside: avoid;
                            }
                        }
                    `,
                }}
            />
            <DrugOrderPrintActions />

            <main className="print-sheet mx-auto my-6 min-h-[297mm] w-[210mm] bg-white px-10 py-8 shadow-sm">
                <header className="avoid-break border-b border-slate-900 pb-4">
                    <div className="grid grid-cols-[1fr_auto] gap-6">
                        <div>
                            <p className="text-[12px] font-semibold uppercase">
                                {order.facility.facilityName}
                            </p>
                            <p className="mt-1 text-[11px] text-slate-700">
                                Mã cơ sở: {order.facility.facilityCode}
                            </p>
                            <p className="mt-1 text-[11px] text-slate-700">
                                Địa chỉ: {formatText(order.facility.address)}
                            </p>
                            <p className="mt-1 text-[11px] text-slate-700">
                                Liên hệ: {formatText(order.facility.contactPerson)} |{" "}
                                {formatText(order.facility.phoneNumber)}
                            </p>
                        </div>
                        <div className="text-right text-[11px] text-slate-700">
                            <p className="font-semibold text-slate-950">
                                Mã đơn: {order.orderNo}
                            </p>
                            <p>Ngày in: {formatDateTime(new Date())}</p>
                        </div>
                    </div>

                    <div className="mt-6 text-center">
                        <h1 className="text-[20px] font-bold uppercase tracking-normal">
                            Phiếu dự trù đặt hàng
                        </h1>
                        <p className="mt-2 text-[12px] text-slate-700">
                            Trạng thái:{" "}
                            <span className="font-semibold text-slate-950">
                                {ORDER_STATUS_LABELS[order.status] || order.status}
                            </span>
                        </p>
                    </div>
                </header>

                <section className="avoid-break mt-5 grid grid-cols-2 gap-x-8 gap-y-3 border-b border-slate-200 pb-5">
                    <InfoItem label="Công ty cung ứng" value={order.company.name} />
                    <InfoItem label="Mã công ty" value={order.company.code} />
                    <InfoItem
                        label="Tháng XNT tham chiếu"
                        value={order.baseReportMonth || "-"}
                    />
                    <InfoItem label="Ngày tạo" value={formatDateTime(order.createdAt)} />
                    <InfoItem label="Ngày gửi" value={formatDateTime(order.submittedAt)} />
                    <InfoItem label="Cập nhật" value={formatDateTime(order.updatedAt)} />
                </section>

                <section className="avoid-break mt-5 grid grid-cols-[1fr_104px] gap-5">
                    <div className="rounded-md border border-slate-300 p-3">
                        <p className="text-[10px] font-semibold uppercase text-slate-500">
                            Ghi chú
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-[12px] text-slate-900">
                            {formatText(order.note)}
                        </p>
                        <p className="mt-3 break-all text-[10px] text-slate-500">
                            Link tra cứu: {lookupUrl}
                        </p>
                    </div>
                    <div className="flex flex-col items-center justify-start">
                        <div className="border border-slate-300 p-1">
                            <QRCodeSVG value={lookupUrl} size={92} level="M" marginSize={1} />
                        </div>
                        <p className="mt-2 text-center text-[10px] text-slate-500">
                            QR tra cứu đơn
                        </p>
                    </div>
                </section>

                <section className="mt-6">
                    <div className="mb-2 flex items-end justify-between gap-4">
                        <h2 className="text-[13px] font-bold uppercase">Danh sách thuốc</h2>
                        <p className="text-[11px] text-slate-600">
                            Tổng số dòng: {order.lines.length} | Tổng yêu cầu:{" "}
                            {formatQuantity(totalRequestedQty)} | Tổng xác nhận:{" "}
                            {formatQuantity(totalAcceptedQty)}
                        </p>
                    </div>

                    <table className="w-full border-collapse text-[10.5px]">
                        <thead>
                            <tr className="bg-slate-100">
                                <th className="w-[28px] border border-slate-400 px-1.5 py-2 text-center">
                                    STT
                                </th>
                                <th className="w-[82px] border border-slate-400 px-1.5 py-2 text-left">
                                    Mã thuốc
                                </th>
                                <th className="border border-slate-400 px-1.5 py-2 text-left">
                                    Tên thuốc / mô tả
                                </th>
                                <th className="w-[48px] border border-slate-400 px-1.5 py-2 text-left">
                                    ĐVT
                                </th>
                                <th className="w-[66px] border border-slate-400 px-1.5 py-2 text-right">
                                    SL yêu cầu
                                </th>
                                <th className="w-[68px] border border-slate-400 px-1.5 py-2 text-right">
                                    SL xác nhận
                                </th>
                                <th className="w-[112px] border border-slate-400 px-1.5 py-2 text-left">
                                    Trạng thái
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {order.lines.map((line, index) => {
                                const description = lineDescription(line);

                                return (
                                    <tr key={line.id}>
                                        <td className="border border-slate-400 px-1.5 py-2 text-center align-top">
                                            {index + 1}
                                        </td>
                                        <td className="border border-slate-400 px-1.5 py-2 align-top font-semibold">
                                            {lineCode(line)}
                                        </td>
                                        <td className="border border-slate-400 px-1.5 py-2 align-top">
                                            <p className="font-semibold">{line.displayName}</p>
                                            {description ? (
                                                <p className="mt-1 text-[10px] text-slate-600">
                                                    {description}
                                                </p>
                                            ) : null}
                                            {line.masterDrug ? (
                                                <p className="mt-1 text-[10px] text-slate-500">
                                                    Thuốc chuẩn: {line.masterDrug.maChung} -{" "}
                                                    {line.masterDrug.tenThuoc}
                                                </p>
                                            ) : null}
                                            {line.companyResponseReason ? (
                                                <p className="mt-1 text-[10px] text-slate-600">
                                                    Lý do: {line.companyResponseReason}
                                                </p>
                                            ) : null}
                                        </td>
                                        <td className="border border-slate-400 px-1.5 py-2 align-top">
                                            {formatText(line.unit)}
                                        </td>
                                        <td className="border border-slate-400 px-1.5 py-2 text-right align-top font-semibold">
                                            {formatQuantity(line.requestedQty)}
                                        </td>
                                        <td className="border border-slate-400 px-1.5 py-2 text-right align-top font-semibold">
                                            {formatQuantity(line.acceptedQty)}
                                        </td>
                                        <td className="border border-slate-400 px-1.5 py-2 align-top">
                                            {LINE_STATUS_LABELS[line.lineStatus] ||
                                                line.lineStatus}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </section>

                <section className="avoid-break mt-10 grid grid-cols-3 gap-8 text-center text-[12px]">
                    <div>
                        <p className="font-semibold">Người lập</p>
                        <p className="mt-1 text-[11px] italic text-slate-600">
                            Ký, ghi rõ họ tên
                        </p>
                        <div className="h-20" />
                    </div>
                    <div>
                        <p className="font-semibold">Khoa Dược</p>
                        <p className="mt-1 text-[11px] italic text-slate-600">
                            Ký, ghi rõ họ tên
                        </p>
                        <div className="h-20" />
                    </div>
                    <div>
                        <p className="font-semibold">Đại diện cơ sở</p>
                        <p className="mt-1 text-[11px] italic text-slate-600">
                            Ký, đóng dấu
                        </p>
                        <div className="h-20" />
                    </div>
                </section>
            </main>
        </div>
    );
}
