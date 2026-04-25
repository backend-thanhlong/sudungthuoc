"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import { AlertCircle, Camera, Loader2, QrCode, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

const LOOKUP_PATH = "/dashboard/dutru-dat-hang/tra-cuu";
const TOKEN_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const NO_VIDEO_FRAME_ERROR = "NO_VIDEO_FRAME";
const BLACK_VIDEO_FRAME_ERROR = "BLACK_VIDEO_FRAME";
const VIDEO_FRAME_TIMEOUT_MS = 5000;
const BLACK_FRAME_BRIGHTNESS_THRESHOLD = 3;

const BASE_VIDEO_CONSTRAINTS = {
    width: { ideal: 1280 },
    height: { ideal: 720 },
} satisfies MediaTrackConstraints;

const DEFAULT_CAMERA_CONSTRAINTS: MediaStreamConstraints[] = [
    {
        audio: false,
        video: {
            ...BASE_VIDEO_CONSTRAINTS,
            facingMode: { ideal: "environment" },
        },
    },
    {
        audio: false,
        video: BASE_VIDEO_CONSTRAINTS,
    },
    {
        audio: false,
        video: true,
    },
];

type ScannerStatus = "idle" | "starting" | "scanning" | "success" | "error";
type CameraDevice = {
    deviceId: string;
    label: string;
};
type VideoWithFrameCallback = HTMLVideoElement & {
    requestVideoFrameCallback?: (
        callback: (now: DOMHighResTimeStamp, metadata: unknown) => void,
    ) => number;
    cancelVideoFrameCallback?: (handle: number) => void;
};

function buildLookupPathFromToken(token: string) {
    const normalizedToken = token.trim();
    if (!TOKEN_PATTERN.test(normalizedToken)) {
        return null;
    }

    const params = new URLSearchParams({ t: normalizedToken });
    return `${LOOKUP_PATH}?${params.toString()}`;
}

function normalizeScannedLookupPath(rawValue: string) {
    const value = rawValue.trim();
    if (!value) {
        return null;
    }

    try {
        const parsedUrl = new URL(value, window.location.origin);
        const normalizedPathname = parsedUrl.pathname.replace(/\/+$/, "") || "/";
        if (normalizedPathname === LOOKUP_PATH) {
            return buildLookupPathFromToken(parsedUrl.searchParams.get("t") || "");
        }
    } catch {
        // Fall through and try to parse the scanned value as a raw token.
    }

    return buildLookupPathFromToken(value);
}

function getCameraErrorMessage(error: unknown) {
    if (error instanceof Error && error.message === NO_VIDEO_FRAME_ERROR) {
        return "Camera đã mở nhưng không có hình. Vui lòng thử lại, kiểm tra quyền camera trên Chrome, hoặc nhập mã đơn thủ công.";
    }

    if (error instanceof Error && error.message === BLACK_VIDEO_FRAME_ERROR) {
        return "Camera đã mở nhưng hình vẫn đen. Vui lòng thử đổi camera, đóng tab cũ rồi mở lại, hoặc nhập mã đơn thủ công.";
    }

    if (error instanceof DOMException) {
        if (["NotAllowedError", "SecurityError"].includes(error.name)) {
            return "Không thể mở camera. Vui lòng cấp quyền camera hoặc nhập mã đơn thủ công.";
        }

        if (["NotFoundError", "DevicesNotFoundError"].includes(error.name)) {
            return "Không tìm thấy camera trên thiết bị này.";
        }

        if (["NotReadableError", "TrackStartError"].includes(error.name)) {
            return "Camera đang được ứng dụng khác sử dụng. Vui lòng thử lại sau.";
        }
    }

    return "Không thể khởi động camera. Vui lòng thử lại hoặc nhập mã đơn thủ công.";
}

function stopMediaStream(stream: MediaStream | null) {
    stream?.getTracks().forEach((track) => track.stop());
}

function prepareVideoElement(video: HTMLVideoElement) {
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.setAttribute("autoplay", "true");
    video.setAttribute("muted", "true");
    video.setAttribute("playsinline", "true");
}

function clearVideoElement(video: HTMLVideoElement | null) {
    if (!video) {
        return;
    }

    video.pause();
    video.srcObject = null;
    video.removeAttribute("src");
}

function videoHasFrame(video: HTMLVideoElement) {
    return (
        video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        video.videoWidth > 0 &&
        video.videoHeight > 0
    );
}

function waitForNextPaint() {
    return new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => resolve());
        });
    });
}

function waitForVideoFrame(video: HTMLVideoElement, timeoutMs = VIDEO_FRAME_TIMEOUT_MS) {
    if (videoHasFrame(video)) {
        return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
        const videoWithFrameCallback = video as VideoWithFrameCallback;
        const events = ["loadedmetadata", "loadeddata", "canplay", "playing", "timeupdate"];
        let frameCallbackHandle: number | null = null;

        const cleanup = () => {
            window.clearTimeout(timeoutId);
            events.forEach((eventName) => video.removeEventListener(eventName, onVideoReady));

            if (
                frameCallbackHandle !== null &&
                videoWithFrameCallback.cancelVideoFrameCallback
            ) {
                videoWithFrameCallback.cancelVideoFrameCallback(frameCallbackHandle);
            }
        };

        const resolveIfReady = () => {
            if (!videoHasFrame(video)) {
                return;
            }

            cleanup();
            resolve();
        };

        const onVideoReady = () => resolveIfReady();

        const timeoutId = window.setTimeout(() => {
            cleanup();
            reject(new Error(NO_VIDEO_FRAME_ERROR));
        }, timeoutMs);

        events.forEach((eventName) => video.addEventListener(eventName, onVideoReady));

        if (videoWithFrameCallback.requestVideoFrameCallback) {
            frameCallbackHandle = videoWithFrameCallback.requestVideoFrameCallback(() => {
                resolveIfReady();
            });
        }

        resolveIfReady();
    });
}

function wait(ms: number) {
    return new Promise<void>((resolve) => {
        window.setTimeout(resolve, ms);
    });
}

function getVideoFrameAverageBrightness(video: HTMLVideoElement) {
    if (!videoHasFrame(video)) {
        return null;
    }

    const canvas = document.createElement("canvas");
    canvas.width = 16;
    canvas.height = 12;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
        return null;
    }

    try {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
        let totalBrightness = 0;
        for (let index = 0; index < data.length; index += 4) {
            totalBrightness += (data[index] + data[index + 1] + data[index + 2]) / 3;
        }

        return totalBrightness / (data.length / 4);
    } catch {
        return null;
    }
}

async function waitForVisibleVideoFrame(video: HTMLVideoElement) {
    await waitForVideoFrame(video);

    let brightestFrame = 0;
    for (let attempt = 0; attempt < 4; attempt += 1) {
        await wait(150);
        const brightness = getVideoFrameAverageBrightness(video);
        if (brightness === null) {
            return;
        }

        brightestFrame = Math.max(brightestFrame, brightness);
        if (brightestFrame > BLACK_FRAME_BRIGHTNESS_THRESHOLD) {
            return;
        }
    }

    throw new Error(BLACK_VIDEO_FRAME_ERROR);
}

function shouldTryNextCamera(error: unknown) {
    if (error instanceof DOMException) {
        return [
            "AbortError",
            "NotFoundError",
            "DevicesNotFoundError",
            "NotReadableError",
            "OverconstrainedError",
            "TrackStartError",
            "ConstraintNotSatisfiedError",
        ].includes(error.name);
    }

    if (error instanceof Error) {
        return [NO_VIDEO_FRAME_ERROR, BLACK_VIDEO_FRAME_ERROR].includes(error.message);
    }

    return false;
}

async function attachPreviewStream(video: HTMLVideoElement, stream: MediaStream) {
    prepareVideoElement(video);
    video.srcObject = stream;
    await video.play();
    await waitForVisibleVideoFrame(video);
}

function normalizeCameraLabel(device: MediaDeviceInfo, index: number) {
    return device.label || `Camera ${index + 1}`;
}

function isBackCamera(device: CameraDevice) {
    return /back|rear|environment|sau/i.test(device.label);
}

function getDeviceConstraint(deviceId: string): MediaStreamConstraints {
    return {
        audio: false,
        video: {
            ...BASE_VIDEO_CONSTRAINTS,
            deviceId: { exact: deviceId },
        },
    };
}

function buildCameraConstraints(devices: CameraDevice[], selectedDeviceId: string | null) {
    const constraints: MediaStreamConstraints[] = [];
    const addedDeviceIds = new Set<string>();

    const addDevice = (deviceId: string | null) => {
        if (!deviceId || addedDeviceIds.has(deviceId)) {
            return false;
        }

        addedDeviceIds.add(deviceId);
        constraints.push(getDeviceConstraint(deviceId));
        return true;
    };

    addDevice(selectedDeviceId);
    devices.filter(isBackCamera).forEach((device) => addDevice(device.deviceId));

    const remainingDeviceConstraints = devices
        .filter((device) => !addedDeviceIds.has(device.deviceId))
        .map((device) => getDeviceConstraint(device.deviceId));

    return [...constraints, ...DEFAULT_CAMERA_CONSTRAINTS, ...remainingDeviceConstraints];
}

function areSameCameraDevices(first: CameraDevice[], second: CameraDevice[]) {
    return (
        first.length === second.length &&
        first.every((device, index) => {
            const nextDevice = second[index];
            return device.deviceId === nextDevice.deviceId && device.label === nextDevice.label;
        })
    );
}

export default function DrugOrderQrScannerDialog() {
    const router = useRouter();
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const controlsRef = useRef<IScannerControls | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const cameraDevicesRef = useRef<CameraDevice[]>([]);
    const handledResultRef = useRef(false);
    const [open, setOpen] = useState(false);
    const [status, setStatus] = useState<ScannerStatus>("idle");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [cameraDevices, setCameraDevices] = useState<CameraDevice[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
    const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null);
    const [retryKey, setRetryKey] = useState(0);

    const stopScanner = useCallback(() => {
        controlsRef.current?.stop();
        controlsRef.current = null;

        stopMediaStream(streamRef.current);
        streamRef.current = null;
        setActiveDeviceId(null);
        clearVideoElement(videoRef.current);
    }, []);

    const refreshCameraDevices = useCallback(async () => {
        if (!navigator.mediaDevices?.enumerateDevices) {
            return [];
        }

        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices
            .filter((device) => device.kind === "videoinput" && device.deviceId)
            .map((device, index) => ({
                deviceId: device.deviceId,
                label: normalizeCameraLabel(device, index),
            }));

        cameraDevicesRef.current = videoDevices;
        setCameraDevices((currentDevices) =>
            areSameCameraDevices(currentDevices, videoDevices) ? currentDevices : videoDevices,
        );
        return videoDevices;
    }, []);

    useEffect(() => {
        if (!open) {
            stopScanner();
            handledResultRef.current = false;
            setStatus("idle");
            setErrorMessage(null);
            return;
        }

        const video = videoRef.current;
        if (!video) {
            return;
        }
        const videoElement: HTMLVideoElement = video;

        if (!navigator.mediaDevices?.getUserMedia) {
            setStatus("error");
            setErrorMessage("Trình duyệt không hỗ trợ mở camera để quét QR.");
            return;
        }

        if (!window.isSecureContext) {
            setStatus("error");
            setErrorMessage("Chrome chỉ cho phép mở camera trên HTTPS hoặc localhost.");
            return;
        }

        let cancelled = false;
        const reader = new BrowserQRCodeReader(undefined, {
            delayBetweenScanAttempts: 250,
            delayBetweenScanSuccess: 500,
            tryPlayVideoTimeout: VIDEO_FRAME_TIMEOUT_MS,
        });

        handledResultRef.current = false;
        setStatus("starting");
        setErrorMessage(null);

        const scanCallback = (
            result: { getText: () => string } | undefined,
            _decodeError: unknown,
            controls: IScannerControls,
        ) => {
            if (cancelled || handledResultRef.current || !result) {
                return;
            }

            const nextPath = normalizeScannedLookupPath(result.getText());
            if (!nextPath) {
                setStatus("scanning");
                setErrorMessage("QR không đúng định dạng tra cứu đơn.");
                return;
            }

            handledResultRef.current = true;
            controls.stop();
            controlsRef.current = null;
            stopMediaStream(streamRef.current);
            streamRef.current = null;
            clearVideoElement(videoRef.current);
            setStatus("success");
            setErrorMessage(null);
            setOpen(false);
            router.push(nextPath);
        };

        async function startScanner() {
            let lastError: unknown = null;

            await waitForNextPaint();

            const knownDevices =
                cameraDevicesRef.current.length > 0
                    ? cameraDevicesRef.current
                    : await refreshCameraDevices().catch(() => []);
            const constraintsToTry = buildCameraConstraints(knownDevices, selectedDeviceId);

            for (const constraints of constraintsToTry) {
                if (cancelled) {
                    return;
                }

                try {
                    stopScanner();
                    setStatus("starting");
                    setErrorMessage(null);

                    const stream = await navigator.mediaDevices.getUserMedia(constraints);
                    if (cancelled || handledResultRef.current) {
                        stopMediaStream(stream);
                        return;
                    }

                    streamRef.current = stream;
                    const track = stream.getVideoTracks()[0];
                    const streamDeviceId = track?.getSettings().deviceId || null;
                    setActiveDeviceId(streamDeviceId);
                    refreshCameraDevices().catch(() => undefined);

                    await attachPreviewStream(videoElement, stream);
                    if (cancelled || handledResultRef.current) {
                        stopMediaStream(stream);
                        if (streamRef.current === stream) {
                            streamRef.current = null;
                        }
                        clearVideoElement(videoElement);
                        return;
                    }

                    const controls = reader.scan(videoElement, scanCallback, () => {
                        stopMediaStream(stream);
                        if (streamRef.current === stream) {
                            streamRef.current = null;
                        }
                        clearVideoElement(videoRef.current);
                    });
                    controlsRef.current = controls;

                    setStatus("scanning");
                    setErrorMessage(null);
                    return;
                } catch (error: unknown) {
                    lastError = error;
                    stopScanner();

                    if (!shouldTryNextCamera(error)) {
                        break;
                    }
                }
            }

            if (!cancelled) {
                setStatus("error");
                setErrorMessage(getCameraErrorMessage(lastError));
            }
        }

        startScanner();

        return () => {
            cancelled = true;
            stopScanner();
        };
    }, [
        open,
        refreshCameraDevices,
        retryKey,
        router,
        selectedDeviceId,
        stopScanner,
    ]);

    const handleRetry = () => {
        stopScanner();
        handledResultRef.current = false;
        setStatus("starting");
        setErrorMessage(null);
        setRetryKey((currentRetryKey) => currentRetryKey + 1);
    };

    const handleSwitchCamera = async () => {
        const currentDeviceId = activeDeviceId || selectedDeviceId;
        stopScanner();
        handledResultRef.current = false;
        setStatus("starting");
        setErrorMessage(null);

        const devices = cameraDevices.length > 0 ? cameraDevices : await refreshCameraDevices();
        if (devices.length > 1) {
            const currentIndex = devices.findIndex((device) => device.deviceId === currentDeviceId);
            const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % devices.length : 0;
            setSelectedDeviceId(devices[nextIndex].deviceId);
            return;
        }

        setSelectedDeviceId(null);
        setRetryKey((currentRetryKey) => currentRetryKey + 1);
    };

    const statusText =
        status === "starting"
            ? "Đang mở camera..."
            : status === "success"
                ? "Đã quét QR, đang mở tra cứu..."
                : "Đưa mã QR vào vùng camera để quét.";

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button type="button" variant="outline">
                    <QrCode className="size-4" />
                    Quét QR
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Quét QR đơn dự trù</DialogTitle>
                    <DialogDescription>
                        Camera chỉ dùng để đọc mã QR và mở trang tra cứu đơn.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3">
                    <div className="relative aspect-video overflow-hidden rounded-lg border border-slate-200 bg-slate-950">
                        <video
                            ref={videoRef}
                            className="h-full w-full object-cover"
                            autoPlay
                            muted
                            playsInline
                        />

                        {status === "starting" ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 text-sm font-medium text-white">
                                <Loader2 className="mr-2 size-4 animate-spin" />
                                Đang mở camera
                            </div>
                        ) : null}

                        {status === "error" ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/80 px-6 text-center text-sm font-medium text-white">
                                <Camera className="size-8 text-slate-300" />
                                Không thể quét QR bằng camera
                            </div>
                        ) : null}
                    </div>

                    <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                        {errorMessage ? (
                            <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                        ) : (
                            <Camera className="mt-0.5 size-4 shrink-0 text-slate-500" />
                        )}
                        <p>{errorMessage || statusText}</p>
                    </div>

                    {status !== "success" ? (
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <Button type="button" variant="outline" onClick={handleSwitchCamera}>
                                <Camera className="size-4" />
                                Đổi camera
                            </Button>

                            {status === "error" ? (
                                <Button type="button" variant="outline" onClick={handleRetry}>
                                    <RotateCcw className="size-4" />
                                    Thử lại camera
                                </Button>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            </DialogContent>
        </Dialog>
    );
}
