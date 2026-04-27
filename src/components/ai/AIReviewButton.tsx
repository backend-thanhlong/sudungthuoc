"use client";

import { useState } from "react";
import { Bot, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { AIClientResponse, AIAgentSurface, AIReviewEvidence } from "@/components/ai/types";

interface AIReviewButtonProps {
    surface: Extract<AIAgentSurface, "facility_reports" | "facility_mappings">;
    message: string;
    context?: Record<string, unknown>;
    evidence?: AIReviewEvidence;
    disabled?: boolean;
    disabledReason?: string;
    label?: string;
}

export default function AIReviewButton({
    surface,
    message,
    context,
    evidence,
    disabled,
    disabledReason,
    label = "AI kiểm tra",
}: AIReviewButtonProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [result, setResult] = useState<AIClientResponse | null>(null);

    const runReview = async () => {
        if (disabled || isLoading) {
            return;
        }

        setOpen(true);
        setIsLoading(true);
        setError("");
        setResult(null);

        try {
            const response = await fetch("/api/ai/agent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    mode: "review",
                    surface,
                    message,
                    context,
                    evidence,
                }),
            });
            const payload = await response.json().catch(() => null);
            if (!response.ok) {
                throw new Error(payload?.message || "Không thể kiểm tra bằng AI");
            }
            setResult(payload as AIClientResponse);
        } catch (reviewError) {
            setError(reviewError instanceof Error ? reviewError.message : "Không thể kiểm tra bằng AI");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <Button
                type="button"
                variant="outline"
                onClick={() => void runReview()}
                disabled={disabled || isLoading}
                title={disabled ? disabledReason : undefined}
                className="gap-2"
            >
                {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                {label}
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden p-0">
                    <DialogHeader className="border-b border-slate-200 px-5 py-4">
                        <DialogTitle className="flex items-center gap-2">
                            <Bot className="size-5 text-blue-600" />
                            Kết quả AI kiểm tra
                        </DialogTitle>
                        <DialogDescription>
                            Nội dung AI chỉ hỗ trợ kiểm tra và tổng hợp. Người dùng chịu trách nhiệm xác nhận trước khi thao tác nghiệp vụ.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="max-h-[70vh] overflow-y-auto bg-slate-50 px-5 py-4">
                        {isLoading && (
                            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
                                <Loader2 className="size-4 animate-spin" />
                                Đang kiểm tra dữ liệu...
                            </div>
                        )}
                        {error && (
                            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                                {error}
                            </div>
                        )}
                        {result && (
                            <div className="rounded-lg border border-slate-200 bg-white p-4">
                                <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                                    {result.answer}
                                </div>
                                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                                    <Badge variant="outline">{result.model}</Badge>
                                    {result.usedFallback && <Badge variant="secondary">Fallback</Badge>}
                                    {result.toolCalls.map(tool => (
                                        <Badge key={tool.name} variant={tool.status === "success" ? "secondary" : "outline"}>
                                            {tool.name}: {tool.status}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
