"use client";

import { useState } from "react";
import { Bot, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import type { AIClientResponse } from "@/components/ai/types";
import {
    AI_CHAT_MODEL_OPTIONS,
    DEFAULT_AI_MODEL_CHOICE,
    type AIChatModelChoice,
} from "@/lib/ai/model-options";

interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    meta?: AIClientResponse;
}

interface AIAssistantPanelProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    pathname: string;
    canUseFallback?: boolean;
}

function formatCost(value?: number) {
    if (value === undefined) {
        return null;
    }
    return `$${value.toFixed(6)}`;
}

export default function AIAssistantPanel({
    open,
    onOpenChange,
    pathname,
    canUseFallback = false,
}: AIAssistantPanelProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [useFallback, setUseFallback] = useState(false);
    const [modelChoice, setModelChoice] = useState<AIChatModelChoice>(DEFAULT_AI_MODEL_CHOICE);

    const sendMessage = async () => {
        const trimmedInput = input.trim();
        if (!trimmedInput || isLoading) {
            return;
        }

        const userMessage: ChatMessage = {
            id: crypto.randomUUID(),
            role: "user",
            content: trimmedInput,
        };
        setMessages(prev => [...prev, userMessage]);
        setInput("");
        setError("");
        setIsLoading(true);

        try {
            const response = await fetch("/api/ai/agent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    mode: "chat",
                    surface: "dashboard",
                    message: trimmedInput,
                    useFallback: modelChoice === DEFAULT_AI_MODEL_CHOICE ? useFallback : false,
                    modelChoice,
                    context: { pathname },
                }),
            });
            const payload = await response.json().catch(() => null);
            if (!response.ok) {
                throw new Error(payload?.message || "Không thể gọi Trợ lý AI");
            }

            const aiResponse = payload as AIClientResponse;
            setMessages(prev => [
                ...prev,
                {
                    id: crypto.randomUUID(),
                    role: "assistant",
                    content: aiResponse.answer,
                    meta: aiResponse,
                },
            ]);
        } catch (sendError) {
            setError(sendError instanceof Error ? sendError.message : "Không thể gọi Trợ lý AI");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col p-0 sm:rounded-xl">
                <DialogHeader className="border-b border-slate-200 px-5 py-4">
                    <DialogTitle className="flex items-center gap-2 text-slate-900">
                        <Bot className="size-5 text-blue-600" />
                        Trợ lý AI
                    </DialogTitle>
                    <DialogDescription>
                        AI hỗ trợ tổng hợp và kiểm tra dữ liệu. Người dùng cần xác nhận trước khi thao tác nghiệp vụ.
                    </DialogDescription>
                </DialogHeader>

                <div className="min-h-[320px] flex-1 space-y-4 overflow-y-auto bg-slate-50 px-5 py-4">
                    {messages.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
                            Hỏi về tồn kho, báo cáo, ánh xạ danh mục, nguy cơ thiếu thuốc hoặc dữ liệu bất thường.
                        </div>
                    ) : (
                        messages.map(message => (
                            <div
                                key={message.id}
                                className={message.role === "user" ? "flex justify-end" : "flex justify-start"}
                            >
                                <div
                                    className={
                                        message.role === "user"
                                            ? "max-w-[85%] rounded-lg bg-blue-600 px-4 py-3 text-sm text-white"
                                            : "max-w-[92%] rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm"
                                    }
                                >
                                    <div className="whitespace-pre-wrap leading-relaxed">{message.content}</div>
                                    {message.meta && (
                                        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2 text-xs text-slate-500">
                                            <Badge variant="outline">{message.meta.model}</Badge>
                                            {message.meta.usedFallback && <Badge variant="secondary">Fallback</Badge>}
                                            {message.meta.usage?.estimatedCostUsd !== undefined && (
                                                <span>Ước tính {formatCost(message.meta.usage.estimatedCostUsd)}</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                    {isLoading && (
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Loader2 className="size-4 animate-spin" />
                            Đang phân tích dữ liệu...
                        </div>
                    )}
                    {error && (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {error}
                        </div>
                    )}
                </div>

                <div className="border-t border-slate-200 bg-white p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-slate-600">Mô hình</span>
                            <Select
                                value={modelChoice}
                                onValueChange={(value) => {
                                    const nextChoice = value as AIChatModelChoice;
                                    setModelChoice(nextChoice);
                                    if (nextChoice !== DEFAULT_AI_MODEL_CHOICE) {
                                        setUseFallback(false);
                                    }
                                }}
                            >
                                <SelectTrigger size="sm" className="w-[220px] max-w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {AI_CHAT_MODEL_OPTIONS.map(option => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Textarea
                            value={input}
                            onChange={(event) => setInput(event.target.value)}
                            placeholder="Nhập câu hỏi..."
                            className="min-h-20 resize-none"
                            onKeyDown={(event) => {
                                if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                                    event.preventDefault();
                                    void sendMessage();
                                }
                            }}
                        />
                        <Button
                            type="button"
                            size="icon"
                            className="h-20 w-12 shrink-0"
                            onClick={() => void sendMessage()}
                            disabled={isLoading || !input.trim()}
                            aria-label="Gửi câu hỏi"
                        >
                            {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                        </Button>
                    </div>
                    {canUseFallback && modelChoice === DEFAULT_AI_MODEL_CHOICE && (
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                            <button
                                type="button"
                                onClick={() => setUseFallback(prev => !prev)}
                                className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
                                aria-pressed={useFallback}
                            >
                                <span
                                    className={
                                        useFallback
                                            ? "h-2.5 w-2.5 rounded-full bg-blue-600"
                                            : "h-2.5 w-2.5 rounded-full border border-slate-300"
                                    }
                                />
                                Phân tích sâu
                            </button>
                            <span className="text-xs text-slate-500">
                                Chỉ dùng khi cần lập luận sâu; fallback vẫn phụ thuộc cấu hình server.
                            </span>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
