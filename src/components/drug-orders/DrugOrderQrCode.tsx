"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";

export default function DrugOrderQrCode({
    lookupUrl,
    orderNo,
    size = 160,
}: {
    lookupUrl?: string | null;
    orderNo: string;
    size?: number;
}) {
    const [qrValue, setQrValue] = useState<string | null>(null);

    useEffect(() => {
        if (!lookupUrl) {
            setQrValue(null);
            return;
        }

        try {
            setQrValue(new URL(lookupUrl, window.location.origin).toString());
        } catch {
            setQrValue(lookupUrl);
        }
    }, [lookupUrl]);

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div
                    className="flex shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white p-2"
                    style={{ width: size + 18, height: size + 18 }}
                >
                    {qrValue ? (
                        <QRCodeSVG
                            value={qrValue}
                            size={size}
                            level="M"
                            marginSize={2}
                            className="h-auto max-w-full"
                        />
                    ) : (
                        <QrCode className="size-10 text-slate-300" />
                    )}
                </div>
                <div className="min-w-0 space-y-2">
                    <div>
                        <p className="text-xs uppercase tracking-wide text-slate-500">QR tra cứu</p>
                        <p className="mt-1 break-words font-semibold text-slate-900">{orderNo}</p>
                    </div>
                    <p className="text-sm text-slate-600">
                        Quét QR để tra cứu tình trạng đơn sau khi đăng nhập.
                    </p>
                    {lookupUrl ? (
                        <Button asChild variant="outline" size="sm">
                            <Link href={lookupUrl}>
                                <ExternalLink className="mr-2 size-4" />
                                Mở tra cứu
                            </Link>
                        </Button>
                    ) : (
                        <Button variant="outline" size="sm" disabled>
                            <ExternalLink className="mr-2 size-4" />
                            Mở tra cứu
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
