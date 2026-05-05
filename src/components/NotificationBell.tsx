"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    entityUrl: string | null;
    isRead: boolean;
    createdAt: string;
}

export default function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    const fetchNotifications = useCallback(async () => {
        try {
            const res = await fetch("/api/notifications?limit=10");
            const data = await res.json();
            setNotifications(data.notifications || []);
            setUnreadCount(data.unreadCount || 0);
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
        }
    }, []);

    // Initial fetch + polling every 30 seconds
    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    // Close panel on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleToggle = async () => {
        const newState = !isOpen;
        setIsOpen(newState);
        if (newState && notifications.length === 0) {
            setLoading(true);
            await fetchNotifications();
            setLoading(false);
        }
    };

    const handleMarkRead = async (notificationId: string) => {
        try {
            await fetch("/api/notifications", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ notificationId }),
            });
            setNotifications((prev) =>
                prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch (error) {
            console.error("Failed to mark as read:", error);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            const res = await fetch("/api/notifications", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ markAll: true }),
            });
            const data = await res.json();
            setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
            setUnreadCount(data.unreadCount || 0);
        } catch (error) {
            console.error("Failed to mark all as read:", error);
        }
    };

    const handleClickNotification = (notification: Notification) => {
        if (!notification.isRead) {
            handleMarkRead(notification.id);
        }
        if (notification.entityUrl) {
            window.location.href = notification.entityUrl;
            setIsOpen(false);
        }
    };

    const formatTimeAgo = (dateStr: string) => {
        const now = new Date();
        const date = new Date(dateStr);
        const diffMs = now.getTime() - date.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        const diffHour = Math.floor(diffMs / 3600000);
        const diffDay = Math.floor(diffMs / 86400000);

        if (diffMin < 1) return "Vừa xong";
        if (diffMin < 60) return `${diffMin} phút trước`;
        if (diffHour < 24) return `${diffHour} giờ trước`;
        if (diffDay < 7) return `${diffDay} ngày trước`;
        return date.toLocaleDateString("vi-VN");
    };

    const TYPE_ICONS: Record<string, string> = {
        REPORT_SUBMITTED: "📊",
        MAPPING_SUBMITTED: "🔗",
        MAPPING_APPROVED: "✅",
        MAPPING_REJECTED: "❌",
        PERIOD_OPENED: "📅",
        LCNT_CREATED: "📋",
        REPORT_APPROVED: "✅",
        REPORT_REJECTED: "❌",
    };

    return (
        <div className="relative" ref={panelRef}>
            {/* Bell button */}
            <button
                onClick={handleToggle}
                className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title="Thông báo"
                aria-label="Thông báo"
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full animate-pulse">
                        {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown panel */}
            {isOpen && (
                <div className="fixed inset-x-3 top-16 z-[100] mt-2 flex max-h-[calc(100dvh-5rem)] flex-col overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:w-96 sm:max-h-none">
                    {/* Header */}
                    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border bg-blue-50 px-4 py-3 dark:bg-blue-950/35">
                        <h3 className="text-sm font-semibold text-foreground">
                            🔔 Thông báo
                            {unreadCount > 0 && (
                                <span className="ml-2 text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full">
                                    {unreadCount}
                                </span>
                            )}
                        </h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                className="text-left text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-300 dark:hover:text-blue-200"
                            >
                                Đánh dấu tất cả đã đọc
                            </button>
                        )}
                    </div>

                    {/* Notifications list */}
                    <div className="min-h-0 flex-1 overflow-y-auto sm:max-h-96">
                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="py-8 text-center text-muted-foreground">
                                <svg className="mx-auto mb-2 h-12 w-12 text-muted-foreground/35" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                </svg>
                                <p className="text-sm">Không có thông báo</p>
                            </div>
                        ) : (
                            notifications.map((notification) => (
                                <button
                                    key={notification.id}
                                    onClick={() => handleClickNotification(notification)}
                                    className={`w-full border-b border-border px-4 py-3 text-left transition-colors hover:bg-blue-50/50 dark:hover:bg-blue-950/25 ${!notification.isRead ? "bg-blue-50/50 dark:bg-blue-950/20" : ""
                                        }`}
                                >
                                    <div className="flex gap-3">
                                        <span className="text-lg mt-0.5">
                                            {TYPE_ICONS[notification.type] || "📌"}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className={`text-sm ${!notification.isRead ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                                                    {notification.title}
                                                </p>
                                                {!notification.isRead && (
                                                    <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></span>
                                                )}
                                            </div>
                                            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                                                {notification.message}
                                            </p>
                                            <p className="mt-1 text-xs text-muted-foreground/70">
                                                {formatTimeAgo(notification.createdAt)}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
