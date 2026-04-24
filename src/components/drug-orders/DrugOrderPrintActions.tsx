"use client";

import { ArrowLeft, Printer } from "lucide-react";

export default function DrugOrderPrintActions() {
    return (
        <div className="print-hidden sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
            <div className="mx-auto flex max-w-[210mm] flex-wrap items-center justify-between gap-3">
                <button
                    type="button"
                    onClick={() => window.history.back()}
                    className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                    <ArrowLeft className="size-4" />
                    Quay lại
                </button>
                <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex h-9 items-center gap-2 rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700"
                >
                    <Printer className="size-4" />
                    In đơn
                </button>
            </div>
        </div>
    );
}
