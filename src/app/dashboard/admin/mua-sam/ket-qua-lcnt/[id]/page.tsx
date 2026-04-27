"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface FacilityInfo {
    facilityName: string | null;
    username: string;
}

interface KetQuaLCNTDetail {
    id: string;
    soQdPheDuyetKQLCNT: string;
    ngayPheDuyetKQLCNT: string;
    soMatHangMoiThau: number;
    soMatHangTrungThau: number;
    tongGiaTriTrungThau: number | string;
    goiThau?: {
        tenGoiThau?: string | null;
        giaGoiThau?: number | string | null;
        hinhThucLCNT?: string | null;
        phuongThucLCNT?: string | null;
        keHoach?: {
            maKHLCNT?: string | null;
            tenKHLCNT?: string | null;
            facility?: FacilityInfo | null;
        } | null;
    } | null;
    thongBaoMoiThau?: {
        maTBMT?: string | null;
        ngayDangTai?: string | null;
        soQdPheDuyetHSMT?: string | null;
        ngayPheDuyetHSMT?: string | null;
        ngayDongThau?: string | null;
    } | null;
    ketQuaPhanLos?: Array<{
        id?: string;
        ketQua?: string | null;
        donGiaTrungThau?: number | string | null;
        nhaThauTrungThau?: string | null;
        phanLoGoiThau?: {
            stt?: number | null;
            tenPhanLo?: string | null;
            donViTinh?: string | null;
            soLuong?: number | string | null;
            donGia?: number | string | null;
            thanhTien?: number | string | null;
        } | null;
    }>;
}

const formatDate = (value?: string | null) => (
    value ? new Date(value).toLocaleDateString("vi-VN") : "—"
);

const formatNumber = (value?: number | string | null) => (
    value === null || value === undefined || value === ""
        ? "—"
        : new Intl.NumberFormat("vi-VN").format(Number(value))
);

const formatCurrency = (value?: number | string | null) => (
    new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
    }).format(Number(value || 0))
);

function getFacilityName(detail: KetQuaLCNTDetail) {
    const facility = detail.goiThau?.keHoach?.facility;
    return facility?.facilityName || facility?.username || "—";
}

export default function AdminKetQuaLCNTDetailPage() {
    const params = useParams<{ id: string }>();
    const resultId = params.id;
    const [detailData, setDetailData] = useState<KetQuaLCNTDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const loadDetail = useCallback(async () => {
        setLoading(true);
        setErrorMessage(null);

        try {
            const res = await fetch(`/api/admin/ket-qua-lcnt/${encodeURIComponent(resultId)}`);
            const payload = await res.json().catch(() => null);

            if (!res.ok) {
                throw new Error(payload?.message || "Không thể tải chi tiết Kết quả LCNT");
            }

            setDetailData(payload);
        } catch (error) {
            console.error(error);
            setDetailData(null);
            setErrorMessage(error instanceof Error ? error.message : "Lỗi kết nối");
        } finally {
            setLoading(false);
        }
    }, [resultId]);

    useEffect(() => {
        void loadDetail();
    }, [loadDetail]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800">Chi tiết Kết quả LCNT</h2>
                    <p className="mt-1 text-gray-500">
                        {detailData
                            ? `${getFacilityName(detailData)} | ${detailData.goiThau?.tenGoiThau || "Gói thầu"}`
                            : "Thông tin kết quả lựa chọn nhà thầu"}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline">
                        <Link href="/dashboard/admin/mua-sam/ket-qua-lcnt">
                            <ArrowLeft className="h-4 w-4" />
                            Danh sách
                        </Link>
                    </Button>
                    <Button variant="outline" onClick={loadDetail} disabled={loading}>
                        {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <RefreshCw className="h-4 w-4" />
                        )}
                        Tải lại
                    </Button>
                </div>
            </div>

            {loading ? (
                <Card className="border-0 shadow-lg">
                    <CardContent className="flex h-64 items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    </CardContent>
                </Card>
            ) : errorMessage ? (
                <Card className="border-0 shadow-lg">
                    <CardContent className="py-12 text-center">
                        <p className="font-semibold text-gray-800">{errorMessage}</p>
                        <p className="mt-1 text-sm text-gray-500">Mã kết quả: {resultId}</p>
                    </CardContent>
                </Card>
            ) : detailData ? (
                <>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <Card className="border-0 shadow-lg">
                            <CardContent className="p-5">
                                <p className="text-sm text-gray-500">Số QĐ phê duyệt KQLCNT</p>
                                <p className="mt-2 font-mono text-lg font-semibold text-gray-900">
                                    {detailData.soQdPheDuyetKQLCNT}
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-0 shadow-lg">
                            <CardContent className="p-5">
                                <p className="text-sm text-gray-500">Ngày phê duyệt</p>
                                <p className="mt-2 text-lg font-semibold text-gray-900">
                                    {formatDate(detailData.ngayPheDuyetKQLCNT)}
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-0 shadow-lg">
                            <CardContent className="p-5">
                                <p className="text-sm text-gray-500">Số MH mời thầu / trúng thầu</p>
                                <p className="mt-2 text-lg font-semibold text-gray-900">
                                    {detailData.soMatHangMoiThau} / {detailData.soMatHangTrungThau}
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-0 shadow-lg">
                            <CardContent className="p-5">
                                <p className="text-sm text-gray-500">Tổng giá trị trúng thầu</p>
                                <p className="mt-2 text-lg font-semibold text-indigo-600">
                                    {formatCurrency(detailData.tongGiaTriTrungThau)}
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="border-0 shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-xl">Thông tin liên quan</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                <div>
                                    <p className="text-xs text-gray-500">Đơn vị</p>
                                    <p className="mt-1 font-semibold">{getFacilityName(detailData)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Mã KHLCNT</p>
                                    <p className="mt-1 font-semibold">
                                        {detailData.goiThau?.keHoach?.maKHLCNT || "—"}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Tên KHLCNT</p>
                                    <p className="mt-1 font-semibold">
                                        {detailData.goiThau?.keHoach?.tenKHLCNT || "—"}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Tên gói thầu</p>
                                    <p className="mt-1 font-semibold">
                                        {detailData.goiThau?.tenGoiThau || "—"}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Mã TBMT</p>
                                    <p className="mt-1 font-semibold">
                                        {detailData.thongBaoMoiThau?.maTBMT || "—"}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Ngày đăng tải TBMT</p>
                                    <p className="mt-1 font-semibold">
                                        {formatDate(detailData.thongBaoMoiThau?.ngayDangTai)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Hình thức LCNT</p>
                                    <p className="mt-1 font-semibold">
                                        {detailData.goiThau?.hinhThucLCNT || "—"}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Phương thức LCNT</p>
                                    <p className="mt-1 font-semibold">
                                        {detailData.goiThau?.phuongThucLCNT || "—"}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Giá gói thầu</p>
                                    <p className="mt-1 font-semibold">
                                        {detailData.goiThau?.giaGoiThau
                                            ? formatCurrency(detailData.goiThau.giaGoiThau)
                                            : "—"}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-xl">
                                Kết quả từng phần lô ({detailData.ketQuaPhanLos?.length || 0} phần lô)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-hidden rounded-xl border">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-gray-100">
                                            <TableHead>STT</TableHead>
                                            <TableHead>Tên phần lô</TableHead>
                                            <TableHead>Đơn vị tính</TableHead>
                                            <TableHead className="text-right">Số lượng</TableHead>
                                            <TableHead className="text-right">Đơn giá</TableHead>
                                            <TableHead className="text-right">Thành tiền</TableHead>
                                            <TableHead>Kết quả</TableHead>
                                            <TableHead className="text-right">Đơn giá trúng thầu</TableHead>
                                            <TableHead>Nhà thầu trúng thầu</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(detailData.ketQuaPhanLos || []).map((kqpl, idx) => (
                                            <TableRow key={kqpl.id || idx}>
                                                <TableCell>{kqpl.phanLoGoiThau?.stt || idx + 1}</TableCell>
                                                <TableCell className="max-w-xs truncate">
                                                    {kqpl.phanLoGoiThau?.tenPhanLo || "—"}
                                                </TableCell>
                                                <TableCell>{kqpl.phanLoGoiThau?.donViTinh || "—"}</TableCell>
                                                <TableCell className="text-right">
                                                    {formatNumber(kqpl.phanLoGoiThau?.soLuong)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {formatNumber(kqpl.phanLoGoiThau?.donGia)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {formatNumber(kqpl.phanLoGoiThau?.thanhTien)}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        className={
                                                            kqpl.ketQua === "Trúng thầu"
                                                                ? "border-0 bg-emerald-100 text-emerald-700"
                                                                : "border-0 bg-gray-100 text-gray-700"
                                                        }
                                                    >
                                                        {kqpl.ketQua || "—"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right font-medium text-emerald-600">
                                                    {formatNumber(kqpl.donGiaTrungThau)}
                                                </TableCell>
                                                <TableCell className="max-w-xs truncate">
                                                    {kqpl.nhaThauTrungThau || "—"}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </>
            ) : null}
        </div>
    );
}
