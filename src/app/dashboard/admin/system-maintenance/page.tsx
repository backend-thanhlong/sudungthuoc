"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, DatabaseZap, ImageIcon, Palette, Power, PowerOff, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface MaintenanceState {
    enabled: boolean;
    message: string;
    updatedAt: string | null;
    updatedById: string | null;
}

interface ResetCounts {
    reportReviewLogs: number;
    reportSubmissions: number;
    inventoryReports: number;
    facilityDrugMaps: number;
}

interface ResetSummary {
    confirmation: string;
    maintenanceEnabled: boolean;
    counts: ResetCounts;
}

interface HomepageSettings {
    backgroundColor: string;
    watermark: HomepageWatermarkSettings;
    header: HomepageHeaderSettings;
    footer: HomepageFooterSettings;
    updatedAt: string | null;
    updatedById: string | null;
}

interface HomepageSettingsResponse {
    settings: {
        backgroundColor: string;
        watermark?: HomepageWatermarkSettings;
        header?: HomepageHeaderSettings;
        footer?: HomepageFooterSettings;
    };
    defaults: {
        backgroundColor: string;
        watermark?: HomepageWatermarkSettings;
        header?: HomepageHeaderSettings;
        footer?: HomepageFooterSettings;
    };
    updatedAt: string | null;
    updatedById: string | null;
}

type HomepageWatermarkPosition = "center" | "bottom-right" | "bottom-left";

interface HomepageWatermarkSettings {
    enabled: boolean;
    opacity: number;
    size: number;
    position: HomepageWatermarkPosition;
}

interface HomepageHeaderSettings {
    backgroundColor: string;
    textColor: string;
    subTextColor: string;
    title: string;
    subtitle: string;
    logoEnabled: boolean;
}

interface HomepageFooterSettings {
    backgroundColor: string;
    textColor: string;
    title: string;
    address: string;
}

const DEFAULT_MESSAGE = "Hệ thống đang bảo trì. Vui lòng mở lại sau";
const DEFAULT_HOMEPAGE_BACKGROUND_COLOR = "#FFCC33";
const DEFAULT_HOMEPAGE_WATERMARK: HomepageWatermarkSettings = {
    enabled: true,
    opacity: 0.06,
    size: 460,
    position: "center",
};
const WATERMARK_POSITION_LABELS: Record<HomepageWatermarkPosition, string> = {
    center: "Giữa màn hình",
    "bottom-right": "Góc phải dưới",
    "bottom-left": "Góc trái dưới",
};
const DEFAULT_HOMEPAGE_HEADER: HomepageHeaderSettings = {
    backgroundColor: "#1D4ED8",
    textColor: "#FFFFFF",
    subTextColor: "#DBEAFE",
    title: "DASHBOARD THỐNG KÊ SỬ DỤNG THUỐC",
    subtitle: "PHÒNG NGHIỆP VỤ DƯỢC-SỞ Y TẾ TP CẦN THƠ",
    logoEnabled: true,
};
const DEFAULT_HOMEPAGE_FOOTER: HomepageFooterSettings = {
    backgroundColor: "#FFFFFF",
    textColor: "#334155",
    title: "PHÒNG NGHIỆP VỤ DƯỢC - SỞ Y TẾ THÀNH PHỐ CẦN THƠ",
    address: "Địa chỉ: 71 Lý Tự Trọng, Phường Ninh Kiều, Thành phố Cần Thơ",
};
const EMPTY_COUNTS: ResetCounts = {
    reportReviewLogs: 0,
    reportSubmissions: 0,
    inventoryReports: 0,
    facilityDrugMaps: 0,
};

function normalizeHexColor(value: string) {
    const color = value.trim();
    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
        return null;
    }

    return color.toUpperCase();
}

function formatDateTime(value: string | null) {
    if (!value) {
        return "Chưa lưu cấu hình";
    }

    return new Date(value).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function getPayloadMessage(payload: unknown) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        return null;
    }

    const maybePayload = payload as { message?: unknown };
    return typeof maybePayload.message === "string" ? maybePayload.message : null;
}

export default function SystemMaintenancePage() {
    const [maintenance, setMaintenance] = useState<MaintenanceState | null>(null);
    const [homepageSettings, setHomepageSettings] = useState<HomepageSettings>({
        backgroundColor: DEFAULT_HOMEPAGE_BACKGROUND_COLOR,
        watermark: DEFAULT_HOMEPAGE_WATERMARK,
        header: DEFAULT_HOMEPAGE_HEADER,
        footer: DEFAULT_HOMEPAGE_FOOTER,
        updatedAt: null,
        updatedById: null,
    });
    const [homepageBackgroundInput, setHomepageBackgroundInput] = useState(DEFAULT_HOMEPAGE_BACKGROUND_COLOR);
    const [homepageWatermarkInput, setHomepageWatermarkInput] = useState<HomepageWatermarkSettings>(DEFAULT_HOMEPAGE_WATERMARK);
    const [homepageHeaderInput, setHomepageHeaderInput] = useState<HomepageHeaderSettings>(DEFAULT_HOMEPAGE_HEADER);
    const [homepageFooterInput, setHomepageFooterInput] = useState<HomepageFooterSettings>(DEFAULT_HOMEPAGE_FOOTER);
    const [resetSummary, setResetSummary] = useState<ResetSummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isHomepageSettingsLoading, setIsHomepageSettingsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isHomepageSettingsSaving, setIsHomepageSettingsSaving] = useState(false);
    const [isResetLoading, setIsResetLoading] = useState(true);
    const [isResetting, setIsResetting] = useState(false);

    const loadMaintenance = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch("/api/admin/system-maintenance");
            const payload = await response.json().catch(() => null);

            if (!response.ok || !payload?.maintenance) {
                throw new Error(payload?.message || "Không thể tải trạng thái bảo trì");
            }

            setMaintenance(payload.maintenance);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Không thể tải trạng thái bảo trì";
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const loadHomepageSettings = useCallback(async () => {
        setIsHomepageSettingsLoading(true);
        try {
            const response = await fetch("/api/admin/public-homepage-settings", { cache: "no-store" });
            const payload = await response.json().catch(() => null) as HomepageSettingsResponse | { message?: string } | null;

            if (!response.ok || !payload || !("settings" in payload)) {
                throw new Error(getPayloadMessage(payload) || "Không thể tải màu nền Trang chủ");
            }

            const nextSettings = {
                backgroundColor: payload.settings.backgroundColor,
                watermark: payload.settings.watermark || payload.defaults.watermark || DEFAULT_HOMEPAGE_WATERMARK,
                header: payload.settings.header || payload.defaults.header || DEFAULT_HOMEPAGE_HEADER,
                footer: payload.settings.footer || payload.defaults.footer || DEFAULT_HOMEPAGE_FOOTER,
                updatedAt: payload.updatedAt,
                updatedById: payload.updatedById,
            };

            setHomepageSettings(nextSettings);
            setHomepageBackgroundInput(nextSettings.backgroundColor);
            setHomepageWatermarkInput(nextSettings.watermark);
            setHomepageHeaderInput(nextSettings.header);
            setHomepageFooterInput(nextSettings.footer);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Không thể tải màu nền Trang chủ";
            toast.error(message);
        } finally {
            setIsHomepageSettingsLoading(false);
        }
    }, []);

    const loadResetSummary = useCallback(async () => {
        setIsResetLoading(true);
        try {
            const response = await fetch("/api/admin/xnt-mapping-reset");
            const payload = await response.json().catch(() => null);

            if (!response.ok || !payload?.counts) {
                throw new Error(payload?.message || "Không thể tải thống kê dữ liệu XNT/ánh xạ");
            }

            setResetSummary(payload);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Không thể tải thống kê dữ liệu XNT/ánh xạ";
            toast.error(message);
        } finally {
            setIsResetLoading(false);
        }
    }, []);

    useEffect(() => {
        loadMaintenance();
        loadHomepageSettings();
        loadResetSummary();
    }, [loadHomepageSettings, loadMaintenance, loadResetSummary]);

    const updateMaintenance = async (enabled: boolean) => {
        const confirmMessage = enabled
            ? "Bật bảo trì sẽ chặn người dùng cơ sở và công ty truy cập dashboard. Admin vẫn sử dụng bình thường. Tiếp tục?"
            : "Tắt bảo trì và mở lại hệ thống cho người dùng cơ sở/công ty?";

        if (!window.confirm(confirmMessage)) return;

        setIsSaving(true);
        try {
            const response = await fetch("/api/admin/system-maintenance", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    enabled,
                    message: maintenance?.message || DEFAULT_MESSAGE,
                }),
            });
            const payload = await response.json().catch(() => null);

            if (!response.ok || !payload?.maintenance) {
                throw new Error(payload?.message || "Không thể cập nhật trạng thái bảo trì");
            }

            setMaintenance(payload.maintenance);
            toast.success(enabled ? "Đã bật chế độ bảo trì" : "Đã tắt chế độ bảo trì");
            loadResetSummary();
        } catch (error) {
            const message = error instanceof Error ? error.message : "Không thể cập nhật trạng thái bảo trì";
            toast.error(message);
        } finally {
            setIsSaving(false);
        }
    };

    const saveHomepageSettings = async () => {
        const normalizedColor = normalizeHexColor(homepageBackgroundInput);
        if (!normalizedColor) {
            toast.error("Mã màu nền Trang chủ không hợp lệ");
            return;
        }

        const normalizedHeaderBackground = normalizeHexColor(homepageHeaderInput.backgroundColor);
        const normalizedHeaderText = normalizeHexColor(homepageHeaderInput.textColor);
        const normalizedHeaderSubText = normalizeHexColor(homepageHeaderInput.subTextColor);
        const normalizedFooterBackground = normalizeHexColor(homepageFooterInput.backgroundColor);
        const normalizedFooterText = normalizeHexColor(homepageFooterInput.textColor);
        if (
            !normalizedHeaderBackground
            || !normalizedHeaderText
            || !normalizedHeaderSubText
            || !normalizedFooterBackground
            || !normalizedFooterText
        ) {
            toast.error("Mã màu Header/Footer không hợp lệ");
            return;
        }

        setIsHomepageSettingsSaving(true);
        try {
            const response = await fetch("/api/admin/public-homepage-settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    backgroundColor: normalizedColor,
                    watermark: homepageWatermarkInput,
                    header: {
                        ...homepageHeaderInput,
                        backgroundColor: normalizedHeaderBackground,
                        textColor: normalizedHeaderText,
                        subTextColor: normalizedHeaderSubText,
                    },
                    footer: {
                        ...homepageFooterInput,
                        backgroundColor: normalizedFooterBackground,
                        textColor: normalizedFooterText,
                    },
                }),
            });
            const payload = await response.json().catch(() => null) as HomepageSettingsResponse | { message?: string } | null;

            if (!response.ok || !payload || !("settings" in payload)) {
                throw new Error(getPayloadMessage(payload) || "Không thể lưu màu nền Trang chủ");
            }

            const nextSettings = {
                backgroundColor: payload.settings.backgroundColor,
                watermark: payload.settings.watermark || payload.defaults.watermark || DEFAULT_HOMEPAGE_WATERMARK,
                header: payload.settings.header || payload.defaults.header || DEFAULT_HOMEPAGE_HEADER,
                footer: payload.settings.footer || payload.defaults.footer || DEFAULT_HOMEPAGE_FOOTER,
                updatedAt: payload.updatedAt,
                updatedById: payload.updatedById,
            };

            setHomepageSettings(nextSettings);
            setHomepageBackgroundInput(nextSettings.backgroundColor);
            setHomepageWatermarkInput(nextSettings.watermark);
            setHomepageHeaderInput(nextSettings.header);
            setHomepageFooterInput(nextSettings.footer);
            toast.success("Đã lưu cấu hình Trang chủ");
        } catch (error) {
            const message = error instanceof Error ? error.message : "Không thể lưu màu nền Trang chủ";
            toast.error(message);
        } finally {
            setIsHomepageSettingsSaving(false);
        }
    };

    const resetXntMappingData = async () => {
        const confirmation = resetSummary?.confirmation || "XOA DU LIEU XNT";
        const typed = window.prompt(
            `Thao tác này sẽ xóa báo cáo XNT, kỳ nộp, log duyệt báo cáo và toàn bộ ánh xạ thuốc hiện tại.\n\nDữ liệu mua sắm và tài khoản đơn vị không bị xóa.\n\nNhập "${confirmation}" để xác nhận.`
        );

        if (typed === null) return;
        if (typed !== confirmation) {
            toast.error(`Chuỗi xác nhận không đúng. Cần nhập: ${confirmation}`);
            return;
        }

        if (!window.confirm("Xác nhận lần cuối: xóa dữ liệu XNT và ánh xạ hiện tại?")) return;

        setIsResetting(true);
        try {
            const response = await fetch("/api/admin/xnt-mapping-reset", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ confirmation }),
            });
            const payload = await response.json().catch(() => null);

            if (!response.ok || !payload?.deleted) {
                throw new Error(payload?.message || "Không thể xóa dữ liệu XNT và ánh xạ");
            }

            toast.success("Đã xóa dữ liệu XNT và ánh xạ hiện tại");
            loadResetSummary();
        } catch (error) {
            const message = error instanceof Error ? error.message : "Không thể xóa dữ liệu XNT và ánh xạ";
            toast.error(message);
        } finally {
            setIsResetting(false);
        }
    };

    const isEnabled = maintenance?.enabled ?? false;
    const counts = resetSummary?.counts || EMPTY_COUNTS;
    const totalResetRows = counts.reportReviewLogs
        + counts.reportSubmissions
        + counts.inventoryReports
        + counts.facilityDrugMaps;
    const normalizedHomepageBackgroundColor = normalizeHexColor(homepageBackgroundInput);
    const homepagePreviewColor = normalizedHomepageBackgroundColor || homepageSettings.backgroundColor || DEFAULT_HOMEPAGE_BACKGROUND_COLOR;
    const normalizedHeaderBackgroundColor = normalizeHexColor(homepageHeaderInput.backgroundColor);
    const normalizedHeaderTextColor = normalizeHexColor(homepageHeaderInput.textColor);
    const normalizedHeaderSubTextColor = normalizeHexColor(homepageHeaderInput.subTextColor);
    const normalizedFooterBackgroundColor = normalizeHexColor(homepageFooterInput.backgroundColor);
    const normalizedFooterTextColor = normalizeHexColor(homepageFooterInput.textColor);
    const hasInvalidHomepageColors = !normalizedHomepageBackgroundColor
        || !normalizedHeaderBackgroundColor
        || !normalizedHeaderTextColor
        || !normalizedHeaderSubTextColor
        || !normalizedFooterBackgroundColor
        || !normalizedFooterTextColor;
    const watermarkOpacityPercent = Math.round(homepageWatermarkInput.opacity * 100);
    const updateWatermarkInput = (updates: Partial<HomepageWatermarkSettings>) => {
        setHomepageWatermarkInput((current) => ({
            ...current,
            ...updates,
        }));
    };
    const updateHeaderInput = (updates: Partial<HomepageHeaderSettings>) => {
        setHomepageHeaderInput((current) => ({
            ...current,
            ...updates,
        }));
    };
    const updateFooterInput = (updates: Partial<HomepageFooterSettings>) => {
        setHomepageFooterInput((current) => ({
            ...current,
            ...updates,
        }));
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold text-gray-800">Cài đặt hệ thống</h2>
                <p className="mt-1 text-gray-500">Điều khiển trạng thái truy cập của cơ sở và công ty.</p>
            </div>

            <Card className="max-w-3xl">
                <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Palette className="size-5 text-amber-600" />
                                Trang chủ public
                            </CardTitle>
                            <CardDescription>
                                Cấu hình màu nền và logo chìm hiển thị sau dashboard công khai.
                            </CardDescription>
                        </div>
                        <Badge className="bg-amber-100 text-amber-800">
                            {homepageSettings.backgroundColor}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                        <div className="space-y-2">
                            <Label htmlFor="homepage-background-color">Mã màu nền</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    id="homepage-background-picker"
                                    type="color"
                                    value={homepagePreviewColor}
                                    onChange={(event) => setHomepageBackgroundInput(event.target.value.toUpperCase())}
                                    className="h-10 w-14 shrink-0 p-1"
                                    disabled={isHomepageSettingsLoading || isHomepageSettingsSaving}
                                    aria-label="Chọn màu nền Trang chủ"
                                />
                                <Input
                                    id="homepage-background-color"
                                    value={homepageBackgroundInput}
                                    onChange={(event) => setHomepageBackgroundInput(event.target.value)}
                                    className="font-mono"
                                    placeholder="#FFCC33"
                                    disabled={isHomepageSettingsLoading || isHomepageSettingsSaving}
                                    aria-invalid={!normalizedHomepageBackgroundColor}
                                />
                            </div>
                            {!normalizedHomepageBackgroundColor && (
                                <p className="text-sm text-red-600">Vui lòng nhập mã màu dạng #RRGGBB.</p>
                            )}
                            <p className="text-sm text-muted-foreground">
                                Cập nhật: {formatDateTime(homepageSettings.updatedAt)}
                            </p>
                        </div>
                        <div className="flex min-w-36 flex-col gap-2">
                            <div
                                className="h-20 rounded-md border border-border shadow-sm"
                                style={{ backgroundColor: homepagePreviewColor }}
                                aria-label="Xem trước màu nền Trang chủ"
                            />
                            <p className="text-center font-mono text-sm text-muted-foreground">{homepagePreviewColor}</p>
                        </div>
                    </div>

                    <div className="space-y-4 rounded-md border border-border bg-background p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <Label htmlFor="homepage-watermark-enabled" className="flex items-center gap-2 text-base font-semibold">
                                    <ImageIcon className="size-4 text-amber-600" />
                                    Logo chìm
                                </Label>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Dùng logo hiện tại làm watermark phía sau nội dung Trang chủ public.
                                </p>
                            </div>
                            <label className="flex items-center gap-2 text-sm font-medium">
                                <input
                                    id="homepage-watermark-enabled"
                                    type="checkbox"
                                    checked={homepageWatermarkInput.enabled}
                                    onChange={(event) => updateWatermarkInput({ enabled: event.target.checked })}
                                    disabled={isHomepageSettingsLoading || isHomepageSettingsSaving}
                                    className="size-4 rounded border-border"
                                />
                                Bật watermark
                            </label>
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="space-y-2">
                                <Label htmlFor="homepage-watermark-position">Vị trí</Label>
                                <select
                                    id="homepage-watermark-position"
                                    value={homepageWatermarkInput.position}
                                    onChange={(event) => updateWatermarkInput({ position: event.target.value as HomepageWatermarkPosition })}
                                    disabled={isHomepageSettingsLoading || isHomepageSettingsSaving}
                                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                >
                                    {Object.entries(WATERMARK_POSITION_LABELS).map(([value, label]) => (
                                        <option key={value} value={value}>{label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="homepage-watermark-size">Kích thước</Label>
                                <Input
                                    id="homepage-watermark-size"
                                    type="number"
                                    min={160}
                                    max={800}
                                    step={20}
                                    value={homepageWatermarkInput.size}
                                    onChange={(event) => updateWatermarkInput({ size: Number(event.target.value) || DEFAULT_HOMEPAGE_WATERMARK.size })}
                                    disabled={isHomepageSettingsLoading || isHomepageSettingsSaving}
                                />
                                <p className="text-xs text-muted-foreground">Từ 160 đến 800 px.</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="homepage-watermark-opacity">Độ mờ: {watermarkOpacityPercent}%</Label>
                                <Input
                                    id="homepage-watermark-opacity"
                                    type="range"
                                    min={2}
                                    max={20}
                                    step={1}
                                    value={watermarkOpacityPercent}
                                    onChange={(event) => updateWatermarkInput({ opacity: Number(event.target.value) / 100 })}
                                    disabled={isHomepageSettingsLoading || isHomepageSettingsSaving}
                                    className="px-0"
                                />
                                <p className="text-xs text-muted-foreground">Khuyến nghị 4-8% để không ảnh hưởng biểu đồ.</p>
                            </div>
                        </div>

                        <div
                            className="relative h-36 overflow-hidden rounded-md border border-border"
                            style={{ backgroundColor: homepagePreviewColor }}
                            aria-label="Xem trước logo chìm Trang chủ"
                        >
                            {homepageWatermarkInput.enabled && (
                                <div
                                    className="pointer-events-none absolute bg-contain bg-center bg-no-repeat grayscale"
                                    style={{
                                        backgroundImage: "url('/logo.png')",
                                        opacity: homepageWatermarkInput.opacity,
                                        width: Math.min(homepageWatermarkInput.size, 280),
                                        aspectRatio: "1 / 1",
                                        ...(homepageWatermarkInput.position === "center"
                                            ? { left: "50%", top: "50%", transform: "translate(-50%, -50%)" }
                                            : homepageWatermarkInput.position === "bottom-right"
                                                ? { right: 16, bottom: 12 }
                                                : { left: 16, bottom: 12 }),
                                    }}
                                />
                            )}
                            <div className="relative z-10 flex h-full items-center justify-center px-4 text-center text-sm font-medium text-slate-700">
                                Xem trước nền Trang chủ public
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 rounded-md border border-border bg-background p-4">
                        <div>
                            <p className="text-base font-semibold">Header</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Quản lý màu, logo và nội dung phần đầu Trang chủ public.
                            </p>
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="space-y-2">
                                <Label htmlFor="homepage-header-background">Màu nền header</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="homepage-header-background-picker"
                                        type="color"
                                        value={normalizedHeaderBackgroundColor || DEFAULT_HOMEPAGE_HEADER.backgroundColor}
                                        onChange={(event) => updateHeaderInput({ backgroundColor: event.target.value.toUpperCase() })}
                                        className="h-10 w-14 shrink-0 p-1"
                                        disabled={isHomepageSettingsLoading || isHomepageSettingsSaving}
                                        aria-label="Chọn màu nền Header"
                                    />
                                    <Input
                                        id="homepage-header-background"
                                        value={homepageHeaderInput.backgroundColor}
                                        onChange={(event) => updateHeaderInput({ backgroundColor: event.target.value })}
                                        className="font-mono"
                                        disabled={isHomepageSettingsLoading || isHomepageSettingsSaving}
                                        aria-invalid={!normalizedHeaderBackgroundColor}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="homepage-header-text">Màu dòng chính</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="homepage-header-text-picker"
                                        type="color"
                                        value={normalizedHeaderTextColor || DEFAULT_HOMEPAGE_HEADER.textColor}
                                        onChange={(event) => updateHeaderInput({ textColor: event.target.value.toUpperCase() })}
                                        className="h-10 w-14 shrink-0 p-1"
                                        disabled={isHomepageSettingsLoading || isHomepageSettingsSaving}
                                        aria-label="Chọn màu dòng chính Header"
                                    />
                                    <Input
                                        id="homepage-header-text"
                                        value={homepageHeaderInput.textColor}
                                        onChange={(event) => updateHeaderInput({ textColor: event.target.value })}
                                        className="font-mono"
                                        disabled={isHomepageSettingsLoading || isHomepageSettingsSaving}
                                        aria-invalid={!normalizedHeaderTextColor}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="homepage-header-subtext">Màu dòng phụ</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="homepage-header-subtext-picker"
                                        type="color"
                                        value={normalizedHeaderSubTextColor || DEFAULT_HOMEPAGE_HEADER.subTextColor}
                                        onChange={(event) => updateHeaderInput({ subTextColor: event.target.value.toUpperCase() })}
                                        className="h-10 w-14 shrink-0 p-1"
                                        disabled={isHomepageSettingsLoading || isHomepageSettingsSaving}
                                        aria-label="Chọn màu dòng phụ Header"
                                    />
                                    <Input
                                        id="homepage-header-subtext"
                                        value={homepageHeaderInput.subTextColor}
                                        onChange={(event) => updateHeaderInput({ subTextColor: event.target.value })}
                                        className="font-mono"
                                        disabled={isHomepageSettingsLoading || isHomepageSettingsSaving}
                                        aria-invalid={!normalizedHeaderSubTextColor}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="homepage-header-title">Dòng chính</Label>
                                <Input
                                    id="homepage-header-title"
                                    value={homepageHeaderInput.title}
                                    onChange={(event) => updateHeaderInput({ title: event.target.value })}
                                    disabled={isHomepageSettingsLoading || isHomepageSettingsSaving}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="homepage-header-subtitle">Dòng phụ</Label>
                                <Input
                                    id="homepage-header-subtitle"
                                    value={homepageHeaderInput.subtitle}
                                    onChange={(event) => updateHeaderInput({ subtitle: event.target.value })}
                                    disabled={isHomepageSettingsLoading || isHomepageSettingsSaving}
                                />
                            </div>
                        </div>

                        <label className="flex items-center gap-2 text-sm font-medium">
                            <input
                                type="checkbox"
                                checked={homepageHeaderInput.logoEnabled}
                                onChange={(event) => updateHeaderInput({ logoEnabled: event.target.checked })}
                                disabled={isHomepageSettingsLoading || isHomepageSettingsSaving}
                                className="size-4 rounded border-border"
                            />
                            Hiển thị logo trên header
                        </label>

                        <div
                            className="flex items-center gap-3 rounded-md border border-border p-3"
                            style={{ backgroundColor: normalizedHeaderBackgroundColor || DEFAULT_HOMEPAGE_HEADER.backgroundColor }}
                        >
                            {homepageHeaderInput.logoEnabled && (
                                <div
                                    className="size-12 shrink-0 rounded bg-white/80 bg-contain bg-center bg-no-repeat p-1 shadow-sm"
                                    style={{ backgroundImage: "url('/logo.png')" }}
                                />
                            )}
                            <div className="min-w-0">
                                <p
                                    className="truncate text-base font-bold uppercase"
                                    style={{ color: normalizedHeaderTextColor || DEFAULT_HOMEPAGE_HEADER.textColor }}
                                >
                                    {homepageHeaderInput.title || DEFAULT_HOMEPAGE_HEADER.title}
                                </p>
                                <p
                                    className="truncate text-sm font-semibold uppercase"
                                    style={{ color: normalizedHeaderSubTextColor || DEFAULT_HOMEPAGE_HEADER.subTextColor }}
                                >
                                    {homepageHeaderInput.subtitle || DEFAULT_HOMEPAGE_HEADER.subtitle}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 rounded-md border border-border bg-background p-4">
                        <div>
                            <p className="text-base font-semibold">Footer</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Quản lý màu và nội dung phần cuối Trang chủ public.
                            </p>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="homepage-footer-background">Màu nền footer</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="homepage-footer-background-picker"
                                        type="color"
                                        value={normalizedFooterBackgroundColor || DEFAULT_HOMEPAGE_FOOTER.backgroundColor}
                                        onChange={(event) => updateFooterInput({ backgroundColor: event.target.value.toUpperCase() })}
                                        className="h-10 w-14 shrink-0 p-1"
                                        disabled={isHomepageSettingsLoading || isHomepageSettingsSaving}
                                        aria-label="Chọn màu nền Footer"
                                    />
                                    <Input
                                        id="homepage-footer-background"
                                        value={homepageFooterInput.backgroundColor}
                                        onChange={(event) => updateFooterInput({ backgroundColor: event.target.value })}
                                        className="font-mono"
                                        disabled={isHomepageSettingsLoading || isHomepageSettingsSaving}
                                        aria-invalid={!normalizedFooterBackgroundColor}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="homepage-footer-text">Màu chữ footer</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="homepage-footer-text-picker"
                                        type="color"
                                        value={normalizedFooterTextColor || DEFAULT_HOMEPAGE_FOOTER.textColor}
                                        onChange={(event) => updateFooterInput({ textColor: event.target.value.toUpperCase() })}
                                        className="h-10 w-14 shrink-0 p-1"
                                        disabled={isHomepageSettingsLoading || isHomepageSettingsSaving}
                                        aria-label="Chọn màu chữ Footer"
                                    />
                                    <Input
                                        id="homepage-footer-text"
                                        value={homepageFooterInput.textColor}
                                        onChange={(event) => updateFooterInput({ textColor: event.target.value })}
                                        className="font-mono"
                                        disabled={isHomepageSettingsLoading || isHomepageSettingsSaving}
                                        aria-invalid={!normalizedFooterTextColor}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="homepage-footer-title">Dòng chính</Label>
                            <Input
                                id="homepage-footer-title"
                                value={homepageFooterInput.title}
                                onChange={(event) => updateFooterInput({ title: event.target.value })}
                                disabled={isHomepageSettingsLoading || isHomepageSettingsSaving}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="homepage-footer-address">Dòng địa chỉ</Label>
                            <Input
                                id="homepage-footer-address"
                                value={homepageFooterInput.address}
                                onChange={(event) => updateFooterInput({ address: event.target.value })}
                                disabled={isHomepageSettingsLoading || isHomepageSettingsSaving}
                            />
                        </div>

                        <div
                            className="rounded-md border border-border p-3 text-center text-sm"
                            style={{
                                backgroundColor: normalizedFooterBackgroundColor || DEFAULT_HOMEPAGE_FOOTER.backgroundColor,
                                color: normalizedFooterTextColor || DEFAULT_HOMEPAGE_FOOTER.textColor,
                            }}
                        >
                            <p className="font-bold uppercase">{homepageFooterInput.title || DEFAULT_HOMEPAGE_FOOTER.title}</p>
                            <p>{homepageFooterInput.address || DEFAULT_HOMEPAGE_FOOTER.address}</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <Button
                            type="button"
                            disabled={hasInvalidHomepageColors || isHomepageSettingsLoading || isHomepageSettingsSaving}
                            onClick={saveHomepageSettings}
                        >
                            <Save className="size-4" />
                            Lưu
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            disabled={isHomepageSettingsLoading || isHomepageSettingsSaving}
                            onClick={loadHomepageSettings}
                        >
                            <RefreshCw className="size-4" />
                            Tải lại
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card className="max-w-3xl">
                <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <AlertTriangle className="size-5 text-amber-600" />
                                Chế độ bảo trì
                            </CardTitle>
                            <CardDescription>
                                Khi bật, FACILITY và COMPANY chỉ thấy thông báo bảo trì. ADMIN vẫn truy cập bình thường.
                            </CardDescription>
                        </div>
                        <Badge className={isEnabled ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}>
                            {isEnabled ? "Đang bảo trì" : "Đang mở"}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-5">
                    <div className="rounded-md border bg-slate-50 p-4">
                        <p className="text-sm font-medium text-slate-700">Thông báo người dùng sẽ thấy</p>
                        <p className="mt-2 text-base text-slate-900">
                            {maintenance?.message || DEFAULT_MESSAGE}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <Button
                            type="button"
                            variant={isEnabled ? "outline" : "destructive"}
                            disabled={isLoading || isSaving || isEnabled}
                            onClick={() => updateMaintenance(true)}
                        >
                            <PowerOff className="size-4" />
                            Bật bảo trì
                        </Button>
                        <Button
                            type="button"
                            variant={isEnabled ? "default" : "outline"}
                            disabled={isLoading || isSaving || !isEnabled}
                            onClick={() => updateMaintenance(false)}
                        >
                            <Power className="size-4" />
                            Tắt bảo trì
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            disabled={isLoading || isSaving}
                            onClick={loadMaintenance}
                        >
                            <RefreshCw className="size-4" />
                            Tải lại
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card className="max-w-3xl border-red-200">
                <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-red-800">
                                <DatabaseZap className="size-5" />
                                Xóa dữ liệu XNT và ánh xạ
                            </CardTitle>
                            <CardDescription>
                                Chỉ xóa dữ liệu báo cáo Xuất-Nhập-Tồn và ánh xạ thuốc. Không xóa tài khoản, mua sắm, công ty hoặc danh mục dùng chung.
                            </CardDescription>
                        </div>
                        <Badge className={isEnabled ? "bg-red-100 text-red-800" : "bg-slate-100 text-slate-700"}>
                            {isEnabled ? "Có thể reset" : "Cần bật bảo trì"}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-5">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-md border bg-white p-4">
                            <p className="text-sm text-slate-500">Báo cáo XNT</p>
                            <p className="mt-1 text-2xl font-semibold text-slate-900">{counts.inventoryReports.toLocaleString("vi-VN")}</p>
                        </div>
                        <div className="rounded-md border bg-white p-4">
                            <p className="text-sm text-slate-500">Kỳ nộp báo cáo</p>
                            <p className="mt-1 text-2xl font-semibold text-slate-900">{counts.reportSubmissions.toLocaleString("vi-VN")}</p>
                        </div>
                        <div className="rounded-md border bg-white p-4">
                            <p className="text-sm text-slate-500">Log duyệt báo cáo</p>
                            <p className="mt-1 text-2xl font-semibold text-slate-900">{counts.reportReviewLogs.toLocaleString("vi-VN")}</p>
                        </div>
                        <div className="rounded-md border bg-white p-4">
                            <p className="text-sm text-slate-500">Ánh xạ thuốc</p>
                            <p className="mt-1 text-2xl font-semibold text-slate-900">{counts.facilityDrugMaps.toLocaleString("vi-VN")}</p>
                        </div>
                    </div>

                    <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                        Sau khi xóa, các đơn vị phải upload lại mẫu ánh xạ mới có 04 cột hợp đồng rồi mới báo cáo XNT lại từ đầu.
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <Button
                            type="button"
                            variant="destructive"
                            disabled={!isEnabled || isResetLoading || isResetting || totalResetRows === 0}
                            onClick={resetXntMappingData}
                        >
                            <DatabaseZap className="size-4" />
                            Xóa dữ liệu XNT và ánh xạ
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            disabled={isResetLoading || isResetting}
                            onClick={loadResetSummary}
                        >
                            <RefreshCw className="size-4" />
                            Tải lại thống kê
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
