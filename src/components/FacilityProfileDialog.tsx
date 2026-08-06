"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LocateFixed } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const FACILITY_TYPES = [
    "Bệnh viện trực thuộc",
    "Trung tâm y tế khu vực trực thuộc",
    "Bệnh viện trực thuộc Bộ/Ngành",
    "Bệnh viện tư nhân",
    "Phòng khám tư nhân",
];

const AUTONOMY_GROUPS = [
    "Nhóm 1",
    "Nhóm 2",
    "Nhóm 3",
    "Nhóm 4",
    "Tư nhân",
];

export interface FacilityProfile {
    id: string;
    username: string;
    facilityName: string | null;
    facilityCode: string | null;
    autonomyGroup: string | null;
    facilityType: string | null;
    contactPerson: string | null;
    phoneNumber: string | null;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
}

interface FacilityProfileDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSaved?: (profile: FacilityProfile) => void;
}

interface FacilityProfileForm {
    facilityName: string;
    facilityCode: string;
    autonomyGroup: string;
    facilityType: string;
    contactPerson: string;
    phoneNumber: string;
    address: string;
    latitude: string;
    longitude: string;
}

const EMPTY_FORM: FacilityProfileForm = {
    facilityName: "",
    facilityCode: "",
    autonomyGroup: "",
    facilityType: "",
    contactPerson: "",
    phoneNumber: "",
    address: "",
    latitude: "",
    longitude: "",
};

function profileToForm(profile: FacilityProfile): FacilityProfileForm {
    return {
        facilityName: profile.facilityName || "",
        facilityCode: profile.facilityCode || "",
        autonomyGroup: profile.autonomyGroup || "",
        facilityType: profile.facilityType || "",
        contactPerson: profile.contactPerson || "",
        phoneNumber: profile.phoneNumber || "",
        address: profile.address || "",
        latitude: profile.latitude?.toString() || "",
        longitude: profile.longitude?.toString() || "",
    };
}

async function readErrorMessage(response: Response, fallback: string) {
    const body = await response.json().catch(() => null);
    return typeof body?.message === "string" ? body.message : fallback;
}

function getGeolocationErrorMessage(error: GeolocationPositionError) {
    if (error.code === error.PERMISSION_DENIED) {
        return "Trình duyệt chưa được cấp quyền truy cập vị trí";
    }

    if (error.code === error.POSITION_UNAVAILABLE) {
        return "Không thể xác định vị trí hiện tại";
    }

    if (error.code === error.TIMEOUT) {
        return "Quá thời gian chờ lấy vị trí hiện tại";
    }

    return "Không thể lấy vị trí hiện tại";
}

export default function FacilityProfileDialog({
    open,
    onOpenChange,
    onSaved,
}: FacilityProfileDialogProps) {
    const router = useRouter();
    const [profile, setProfile] = useState<FacilityProfile | null>(null);
    const [form, setForm] = useState<FacilityProfileForm>(EMPTY_FORM);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLocating, setIsLocating] = useState(false);
    const locationRequestIdRef = useRef(0);

    useEffect(() => {
        if (!open) {
            return;
        }

        const controller = new AbortController();
        setIsLoading(true);
        setLoadError(null);
        setProfile(null);
        setForm(EMPTY_FORM);

        fetch("/api/facility/profile", {
            cache: "no-store",
            signal: controller.signal,
        })
            .then(async (response) => {
                if (!response.ok) {
                    throw new Error(await readErrorMessage(response, "Không thể tải thông tin cơ sở"));
                }

                return response.json() as Promise<FacilityProfile>;
            })
            .then((nextProfile) => {
                setProfile(nextProfile);
                setForm(profileToForm(nextProfile));
                setLoadError(null);
            })
            .catch((error) => {
                if (error instanceof Error && error.name === "AbortError") {
                    return;
                }

                console.error("Error loading facility profile:", error);
                const message = error instanceof Error ? error.message : "Không thể tải thông tin cơ sở";
                setLoadError(message);
                toast.error(message);
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            });

        return () => controller.abort();
    }, [open]);

    const updateForm = (field: keyof FacilityProfileForm, value: string) => {
        setForm((currentForm) => ({
            ...currentForm,
            [field]: value,
        }));
    };

    const handleUseCurrentLocation = () => {
        if (typeof navigator === "undefined" || !navigator.geolocation) {
            toast.error("Trình duyệt không hỗ trợ lấy vị trí hiện tại");
            return;
        }

        const requestId = locationRequestIdRef.current + 1;
        locationRequestIdRef.current = requestId;
        setIsLocating(true);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                if (locationRequestIdRef.current !== requestId) {
                    return;
                }

                setForm((currentForm) => ({
                    ...currentForm,
                    latitude: position.coords.latitude.toFixed(6),
                    longitude: position.coords.longitude.toFixed(6),
                }));
                toast.success("Đã điền vị trí hiện tại");
                setIsLocating(false);
            },
            (error) => {
                if (locationRequestIdRef.current !== requestId) {
                    return;
                }

                toast.error(getGeolocationErrorMessage(error));
                setIsLocating(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0,
            }
        );
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isLocating) {
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch("/api/facility/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    facilityName: form.facilityName,
                    autonomyGroup: form.autonomyGroup,
                    facilityType: form.facilityType,
                    contactPerson: form.contactPerson,
                    phoneNumber: form.phoneNumber,
                    address: form.address,
                    latitude: form.latitude,
                    longitude: form.longitude,
                }),
            });

            if (!response.ok) {
                throw new Error(await readErrorMessage(response, "Không thể cập nhật thông tin cơ sở"));
            }

            const nextProfile = await response.json() as FacilityProfile;
            setProfile(nextProfile);
            setForm(profileToForm(nextProfile));
            onSaved?.(nextProfile);
            toast.success("Đã cập nhật thông tin cơ sở");
            onOpenChange(false);
            router.refresh();
        } catch (error) {
            console.error("Error updating facility profile:", error);
            toast.error(error instanceof Error ? error.message : "Đã xảy ra lỗi");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOpenChange = (nextOpen: boolean) => {
        if (isSubmitting) {
            return;
        }

        if (!nextOpen) {
            locationRequestIdRef.current += 1;
            setIsLocating(false);
        }

        onOpenChange(nextOpen);
    };

    const controlsDisabled = isLoading || isSubmitting;
    const saveDisabled = controlsDisabled || isLocating;
    const shouldShowLoading = isLoading || (open && !profile && !loadError);

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Cập nhật thông tin cơ sở</DialogTitle>
                    <DialogDescription>
                        Cập nhật thông tin liên hệ và phân loại của cơ sở. Mã cơ sở không được phép chỉnh sửa.
                    </DialogDescription>
                </DialogHeader>

                {shouldShowLoading ? (
                    <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" />
                        Đang tải thông tin cơ sở...
                    </div>
                ) : loadError && !profile ? (
                    <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                        {loadError}
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="flex justify-end">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleUseCurrentLocation}
                                disabled={controlsDisabled || isLocating}
                            >
                                {isLocating ? (
                                    <Loader2 className="size-4 animate-spin" />
                                ) : (
                                    <LocateFixed className="size-4" />
                                )}
                                {isLocating ? "Đang lấy vị trí..." : "Chọn vị trí hiện tại"}
                            </Button>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="facility-profile-code">Mã cơ sở</Label>
                                <Input
                                    id="facility-profile-code"
                                    value={form.facilityCode}
                                    disabled
                                    className="bg-muted/60 font-mono"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="facility-profile-name">Tên cơ sở</Label>
                                <Input
                                    id="facility-profile-name"
                                    value={form.facilityName}
                                    onChange={(event) => updateForm("facilityName", event.target.value)}
                                    placeholder="Tên bệnh viện, trung tâm y tế..."
                                    disabled={controlsDisabled}
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="facility-profile-type">Loại cơ sở</Label>
                                <Select
                                    value={form.facilityType}
                                    onValueChange={(value) => updateForm("facilityType", value)}
                                    disabled={controlsDisabled}
                                >
                                    <SelectTrigger id="facility-profile-type" className="w-full">
                                        <SelectValue placeholder="Chọn loại cơ sở" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {FACILITY_TYPES.map((type) => (
                                            <SelectItem key={type} value={type}>
                                                {type}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="facility-profile-autonomy">Nhóm tự chủ</Label>
                                <Select
                                    value={form.autonomyGroup}
                                    onValueChange={(value) => updateForm("autonomyGroup", value)}
                                    disabled={controlsDisabled}
                                >
                                    <SelectTrigger id="facility-profile-autonomy" className="w-full">
                                        <SelectValue placeholder="Chọn nhóm tự chủ" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {AUTONOMY_GROUPS.map((group) => (
                                            <SelectItem key={group} value={group}>
                                                {group}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="facility-profile-contact">Người liên hệ</Label>
                                <Input
                                    id="facility-profile-contact"
                                    value={form.contactPerson}
                                    onChange={(event) => updateForm("contactPerson", event.target.value)}
                                    placeholder="Tên người liên hệ"
                                    disabled={controlsDisabled}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="facility-profile-phone">Số điện thoại</Label>
                                <Input
                                    id="facility-profile-phone"
                                    value={form.phoneNumber}
                                    onChange={(event) => updateForm("phoneNumber", event.target.value)}
                                    placeholder="SĐT liên hệ"
                                    disabled={controlsDisabled}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="facility-profile-address">Địa chỉ</Label>
                            <Textarea
                                id="facility-profile-address"
                                value={form.address}
                                onChange={(event) => updateForm("address", event.target.value)}
                                placeholder="Địa chỉ cơ sở"
                                disabled={controlsDisabled}
                            />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="facility-profile-latitude">Vĩ độ</Label>
                                <Input
                                    id="facility-profile-latitude"
                                    type="number"
                                    min="-90"
                                    max="90"
                                    step="any"
                                    value={form.latitude}
                                    onChange={(event) => updateForm("latitude", event.target.value)}
                                    placeholder="vd: 10.04516"
                                    disabled={controlsDisabled}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="facility-profile-longitude">Kinh độ</Label>
                                <Input
                                    id="facility-profile-longitude"
                                    type="number"
                                    min="-180"
                                    max="180"
                                    step="any"
                                    value={form.longitude}
                                    onChange={(event) => updateForm("longitude", event.target.value)}
                                    placeholder="vd: 105.74685"
                                    disabled={controlsDisabled}
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleOpenChange(false)}
                                disabled={isSubmitting}
                            >
                                Hủy
                            </Button>
                            <Button type="submit" disabled={saveDisabled}>
                                {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                                {isSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
