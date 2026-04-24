"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChangePasswordDialog from "@/components/ChangePasswordDialog";
import NotificationBell from "@/components/NotificationBell";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavItem {
    label: string;
    href: string;
    icon: React.ReactNode;
    children?: NavItem[];
}

const adminNavItems: NavItem[] = [
    {
        label: "Tổng quan",
        href: "/dashboard/admin",
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
        ),
    },
    {
        label: "Tổng hợp mua sắm",
        href: "#mua-sam-admin",
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
            </svg>
        ),
        children: [
            {
                label: "Quản lý KH LCNT",
                href: "/dashboard/admin/mua-sam/lap-ke-hoach-lcnt",
                icon: (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                ),
            },
            {
                label: "Thông báo mời thầu",
                href: "/dashboard/admin/mua-sam/thong-bao-moi-thau",
                icon: (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                    </svg>
                ),
            },
            {
                label: "Kết quả LCNT",
                href: "/dashboard/admin/mua-sam/ket-qua-lcnt",
                icon: (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                ),
            },
            {
                label: "Tra cứu",
                href: "/dashboard/admin/mua-sam/tra-cuu",
                icon: (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                ),
            },
            {
                label: "Thống kê",
                href: "/dashboard/admin/mua-sam/thong-ke",
                icon: (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                ),
            },
        ],
    },
    {
        label: "Danh mục dùng chung",
        href: "/dashboard/admin/master-drugs",
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
        ),
    },
    {
        label: "Duyệt ánh xạ",
        href: "/dashboard/admin/mappings",
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
        ),
    },
    {
        label: "Tổng hợp Xuất-Nhập-Tồn",
        href: "/dashboard/admin/reports",
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
        ),
    },
    {
        label: "Báo cáo nâng cao",
        href: "/dashboard/admin/reports-advanced",
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
        ),
    },
    {
        label: "Dự trù đặt hàng",
        href: "#dutru-dat-hang-admin",
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z" />
            </svg>
        ),
        children: [
            {
                label: "Quản lý đơn",
                href: "/dashboard/admin/dutru-dat-hang",
                icon: (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z" />
                    </svg>
                ),
            },
            {
                label: "Tra cứu QR đơn",
                href: "/dashboard/dutru-dat-hang/tra-cuu",
                icon: (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m0 14v1m8-8h-1M5 12H4m13.657-5.657-.707.707M7.05 16.95l-.707.707m11.314 0-.707-.707M7.05 7.05l-.707-.707M9 9h6v6H9z" />
                    </svg>
                ),
            },
        ],
    },
    {
        label: "Tra cứu tồn kho",
        href: "/dashboard/inventory-search",
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
        ),
    },
    {
        label: "Cài đặt",
        href: "#cai-dat-admin",
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317a1 1 0 011.35-.936l1.2.48a1 1 0 00.75 0l1.2-.48a1 1 0 011.35.936l.106 1.287a1 1 0 00.53.79l1.115.62a1 1 0 01.37 1.37l-.6 1.04a1 1 0 000 1l.6 1.04a1 1 0 01-.37 1.37l-1.115.62a1 1 0 00-.53.79l-.106 1.287a1 1 0 01-1.35.936l-1.2-.48a1 1 0 00-.75 0l-1.2.48a1 1 0 01-1.35-.936l-.106-1.287a1 1 0 00-.53-.79l-1.115-.62a1 1 0 01-.37-1.37l.6-1.04a1 1 0 000-1l-.6-1.04a1 1 0 01.37-1.37l1.115-.62a1 1 0 00.53-.79l.106-1.287z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
            </svg>
        ),
        children: [
            {
                label: "Quản lý Users",
                href: "/dashboard/admin/users",
                icon: (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                ),
            },
            {
                label: "Quản lý Companies",
                href: "/dashboard/admin/companies",
                icon: (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21h18M5 21V7l8-4 6 4v14M9 9h.01M9 13h.01M9 17h.01M15 9h.01M15 13h.01M15 17h.01" />
                    </svg>
                ),
            },
            {
                label: "Quản lý kỳ báo cáo",
                href: "/dashboard/admin/report-periods",
                icon: (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                ),
            },
            {
                label: "Danh mục nhóm điều trị",
                href: "/dashboard/admin/therapeutic-groups",
                icon: (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h10M7 12h8M7 17h6M5 4h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />
                    </svg>
                ),
            },
            {
                label: "Nhật ký hoạt động",
                href: "/dashboard/admin/activity-logs",
                icon: (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                ),
            },
        ],
    },
];

const facilityNavItems: NavItem[] = [
    {
        label: "Tổng quan",
        href: "/dashboard/facility",
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
        ),
    },
    {
        label: "Báo cáo mua sắm",
        href: "#mua-sam",
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
            </svg>
        ),
        children: [
            {
                label: "Lập Kế hoạch LCNT",
                href: "/dashboard/facility/mua-sam/lap-ke-hoach-lcnt",
                icon: (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                ),
            },
            {
                label: "Thông báo mời thầu",
                href: "/dashboard/facility/mua-sam/thong-bao-moi-thau",
                icon: (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                    </svg>
                ),
            },
            {
                label: "Kết quả LCNT",
                href: "/dashboard/facility/mua-sam/ket-qua-lcnt",
                icon: (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                ),
            },
            {
                label: "Tra cứu",
                href: "/dashboard/facility/mua-sam/tra-cuu",
                icon: (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                ),
            },
            {
                label: "Thống kê",
                href: "/dashboard/facility/mua-sam/thong-ke",
                icon: (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                ),
            },
        ],
    },
    {
        label: "Danh mục dùng chung",
        href: "/dashboard/admin/master-drugs",
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
        ),
    },
    {
        label: "Ánh xạ danh mục thuốc",
        href: "/dashboard/facility/mappings",
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
        ),
    },
    {
        label: "Báo cáo Xuất-Nhập-Tồn",
        href: "/dashboard/facility/reports",
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
        ),
    },
    {
        label: "Dự trù đặt hàng",
        href: "#dutru-dat-hang-facility",
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z" />
            </svg>
        ),
        children: [
            {
                label: "Quản lý đơn",
                href: "/dashboard/facility/dutru-dat-hang",
                icon: (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z" />
                    </svg>
                ),
            },
            {
                label: "Tra cứu QR đơn",
                href: "/dashboard/dutru-dat-hang/tra-cuu",
                icon: (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m0 14v1m8-8h-1M5 12H4m13.657-5.657-.707.707M7.05 16.95l-.707.707m11.314 0-.707-.707M7.05 7.05l-.707-.707M9 9h6v6H9z" />
                    </svg>
                ),
            },
        ],
    },
    {
        label: "Tra cứu tồn kho",
        href: "/dashboard/inventory-search",
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
        ),
    },
];

const companyNavItems: NavItem[] = [
    {
        label: "Dự trù đặt hàng",
        href: "#dutru-dat-hang-company",
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z" />
            </svg>
        ),
        children: [
            {
                label: "Quản lý đơn",
                href: "/dashboard/company/dutru-dat-hang",
                icon: (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z" />
                    </svg>
                ),
            },
            {
                label: "Tra cứu QR đơn",
                href: "/dashboard/dutru-dat-hang/tra-cuu",
                icon: (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m0 14v1m8-8h-1M5 12H4m13.657-5.657-.707.707M7.05 16.95l-.707.707m11.314 0-.707-.707M7.05 7.05l-.707-.707M9 9h6v6H9z" />
                    </svg>
                ),
            },
        ],
    },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { data: session } = useSession();
    const pathname = usePathname();
    const isPrintRoute = pathname.endsWith("/print");
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [changePasswordOpen, setChangePasswordOpen] = useState(false);
    const [openDropdowns, setOpenDropdowns] = useState<string[]>([]);

    const toggleDropdown = (label: string) => {
        setOpenDropdowns((prev) =>
            prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
        );
    };

    const role = session?.user?.role;
    const navItems = role === "ADMIN"
        ? adminNavItems
        : role === "COMPANY"
            ? companyNavItems
            : facilityNavItems;
    const roleLabel = role === "ADMIN" ? "Admin" : role === "COMPANY" ? "Công ty" : "Cơ sở";
    const headerTitle = role === "ADMIN"
        ? "Sở Y Tế - Quản trị hệ thống"
        : role === "COMPANY"
            ? `Công ty - ${session?.user?.name || "Tài khoản công ty"}`
            : session?.user?.name;

    const handleLogout = async () => {
        await signOut({ callbackUrl: "/login" });
    };

    const renderNavItems = ({
        expanded,
        onNavigate,
    }: {
        expanded: boolean;
        onNavigate?: () => void;
    }) =>
        navItems.map((item) => {
            if (item.children) {
                const isChildActive = item.children.some(
                    (child) => pathname === child.href || pathname.startsWith(`${child.href}/`)
                );
                const isDropdownOpen = openDropdowns.includes(item.label) || isChildActive;

                return (
                    <div key={item.label}>
                        <button
                            type="button"
                            onClick={() => toggleDropdown(item.label)}
                            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${
                                isChildActive
                                    ? "bg-white text-blue-700 shadow-sm border border-blue-100"
                                    : "text-slate-600 hover:text-blue-700 hover:bg-blue-100/50"
                            }`}
                        >
                            <span
                                className={isChildActive ? "text-blue-600" : "group-hover:text-blue-600"}
                            >
                                {item.icon}
                            </span>
                            {expanded && (
                                <>
                                    <span className="font-medium flex-1 text-left">{item.label}</span>
                                    <svg
                                        className={`w-4 h-4 transition-transform duration-200 ${
                                            isDropdownOpen ? "rotate-180" : ""
                                        }`}
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M19 9l-7 7-7-7"
                                        />
                                    </svg>
                                </>
                            )}
                        </button>
                        {isDropdownOpen && expanded && (
                            <div className="ml-4 mt-1 space-y-1 border-l-2 border-blue-200 pl-3">
                                {item.children.map((child) => {
                                    const isChildItemActive =
                                        pathname === child.href || pathname.startsWith(`${child.href}/`);

                                    return (
                                        <Link
                                            key={child.href}
                                            href={child.href}
                                            onClick={onNavigate}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 text-sm ${
                                                isChildItemActive
                                                    ? "bg-blue-100 text-blue-700 font-semibold"
                                                    : "text-slate-500 hover:text-blue-700 hover:bg-blue-50"
                                            }`}
                                        >
                                            {child.icon}
                                            <span>{child.label}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            }

            const isActive = pathname === item.href;

            return (
                <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${
                        isActive
                            ? "bg-white text-blue-700 shadow-sm border border-blue-100"
                            : "text-slate-600 hover:text-blue-700 hover:bg-blue-100/50"
                    }`}
                >
                    <span className={isActive ? "text-blue-600" : "group-hover:text-blue-600"}>
                        {item.icon}
                    </span>
                    {expanded && <span className="font-medium">{item.label}</span>}
                </Link>
            );
        });

    if (isPrintRoute) {
        return <div className="min-h-screen bg-white">{children}</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {mobileNavOpen && (
                <button
                    type="button"
                    aria-label="Đóng menu điều hướng"
                    className="fixed inset-0 z-40 bg-slate-950/40 xl:hidden"
                    onClick={() => setMobileNavOpen(false)}
                />
            )}

            {mobileNavOpen && (
                <aside className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[calc(100vw-2rem)] flex-col border-r border-blue-200 bg-gradient-to-b from-blue-50 to-blue-100 shadow-xl xl:hidden">
                    <div className="flex h-16 items-center justify-between gap-3 border-b border-blue-200 px-4">
                        <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-6 w-6 text-white"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                                    />
                                </svg>
                            </div>
                            <span className="min-w-0 text-sm font-bold leading-snug text-blue-900">
                                Quản lý Mua sắm và Kho Dược
                            </span>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Đóng menu"
                            className="text-blue-700 hover:bg-blue-200/50 hover:text-blue-900"
                            onClick={() => setMobileNavOpen(false)}
                        >
                            <X className="size-4" />
                        </Button>
                    </div>

                    <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4">
                        {renderNavItems({
                            expanded: true,
                            onNavigate: () => setMobileNavOpen(false),
                        })}
                    </nav>

                    <div className="border-t border-blue-200 bg-blue-50/50 p-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 font-bold text-white">
                                {session?.user?.name?.[0]?.toUpperCase() || "U"}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-blue-900">{session?.user?.name}</p>
                                <p className="text-xs text-blue-600">{roleLabel}</p>
                            </div>
                        </div>
                    </div>
                </aside>
            )}

            {/* Desktop sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 hidden transition-all duration-300 xl:block ${sidebarOpen ? "w-64" : "w-20"
                    } bg-gradient-to-b from-blue-50 to-blue-100 border-r border-blue-200 shadow-xl`}
            >
                <div className="h-16 flex items-center justify-between px-4 border-b border-blue-200">
                    {sidebarOpen && (
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                </svg>
                            </div>
                            <span className="text-blue-900 font-bold text-lg">Quản lý Mua sắm và Kho Dược</span>
                        </div>
                    )}
                    <button
                        type="button"
                        aria-label={sidebarOpen ? "Thu gọn sidebar" : "Mở rộng sidebar"}
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-200/50 rounded-lg transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sidebarOpen ? "M11 19l-7-7 7-7m8 14l-7-7 7-7" : "M13 5l7 7-7 7M5 5l7 7-7 7"} />
                        </svg>
                    </button>
                </div>

                {/* Navigation */}
                <nav className="mt-6 px-3 space-y-1">
                    {renderNavItems({ expanded: sidebarOpen })}
                </nav>

                {/* User section at bottom */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-blue-200 bg-blue-50/50">
                    <div className={`flex items-center ${sidebarOpen ? "gap-3" : "justify-center"}`}>
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold">
                            {session?.user?.name?.[0]?.toUpperCase() || "U"}
                        </div>
                        {sidebarOpen && (
                            <div className="flex-1 min-w-0">
                                <p className="text-blue-900 text-sm font-medium truncate">{session?.user?.name}</p>
                                <p className="text-blue-600 text-xs">{roleLabel}</p>
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <div className={`transition-all duration-300 ${sidebarOpen ? "xl:pl-64" : "xl:pl-20"}`}>
                {/* Header */}
                <header className="h-16 bg-white shadow-sm border-b border-gray-100 flex items-center justify-between gap-3 px-3 sm:px-4 xl:px-6">
                    <div className="flex min-w-0 items-center gap-3">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Mở menu điều hướng"
                            className="text-slate-700 hover:bg-blue-50 hover:text-blue-700 xl:hidden"
                            onClick={() => setMobileNavOpen(true)}
                        >
                            <Menu className="size-4" />
                        </Button>
                        <h1 className="min-w-0 truncate text-base font-semibold text-gray-800 sm:text-lg">{headerTitle}</h1>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 sm:gap-4">
                        <NotificationBell />
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="flex items-center gap-2 px-2 sm:px-3">
                                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                        {session?.user?.name?.[0]?.toUpperCase() || "U"}
                                    </div>
                                    <svg className="hidden w-4 h-4 sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <div className="px-2 py-1.5">
                                    <p className="text-sm font-medium">{session?.user?.name}</p>
                                    <p className="text-xs text-muted-foreground">{session?.user?.email}</p>
                                </div>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={() => setChangePasswordOpen(true)}
                                    className="cursor-pointer"
                                >
                                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                    </svg>
                                    Đổi mật khẩu
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
                                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                    </svg>
                                    Đăng xuất
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>

                {/* Page content */}
                <main className="p-3 sm:p-4 xl:p-6">{children}</main>
            </div>

            {/* Change Password Dialog */}
            <ChangePasswordDialog
                open={changePasswordOpen}
                onOpenChange={setChangePasswordOpen}
            />
        </div>
    );
}
