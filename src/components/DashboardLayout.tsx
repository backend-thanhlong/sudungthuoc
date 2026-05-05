"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import {
    BarChart3,
    Bot,
    Building2,
    CalendarDays,
    ChevronDown,
    CircleCheck,
    ClipboardCheck,
    ClipboardList,
    FileBarChart,
    History,
    KeyRound,
    LayoutDashboard,
    ListTree,
    LogOut,
    Megaphone,
    Menu,
    PackageCheck,
    PanelLeftClose,
    PanelLeftOpen,
    Pill,
    QrCode,
    Search,
    Settings,
    ShoppingCart,
    Sparkles,
    Users,
    X,
    type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import AIAssistantPanel from "@/components/ai/AIAssistantPanel";
import ChangePasswordDialog from "@/components/ChangePasswordDialog";
import NotificationBell from "@/components/NotificationBell";
import ThemeToggle from "@/components/theme/ThemeToggle";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface NavItem {
    label: string;
    href: string;
    icon: LucideIcon;
    children?: NavItem[];
}

const adminNavItems: NavItem[] = [
    {
        label: "Tổng quan",
        href: "/dashboard/admin",
        icon: LayoutDashboard,
    },
    {
        label: "Tổng hợp mua sắm",
        href: "#mua-sam-admin",
        icon: ShoppingCart,
        children: [
            {
                label: "Quản lý KH LCNT",
                href: "/dashboard/admin/mua-sam/lap-ke-hoach-lcnt",
                icon: ClipboardList,
            },
            {
                label: "Thông báo mời thầu",
                href: "/dashboard/admin/mua-sam/thong-bao-moi-thau",
                icon: Megaphone,
            },
            {
                label: "Kết quả LCNT",
                href: "/dashboard/admin/mua-sam/ket-qua-lcnt",
                icon: CircleCheck,
            },
            {
                label: "Tra cứu",
                href: "/dashboard/admin/mua-sam/tra-cuu",
                icon: Search,
            },
            {
                label: "Thống kê",
                href: "/dashboard/admin/mua-sam/thong-ke",
                icon: BarChart3,
            },
        ],
    },
    {
        label: "Danh mục dùng chung",
        href: "/dashboard/admin/master-drugs",
        icon: Pill,
    },
    {
        label: "Duyệt ánh xạ",
        href: "/dashboard/admin/mappings",
        icon: ClipboardCheck,
    },
    {
        label: "Tổng hợp Xuất-Nhập-Tồn",
        href: "/dashboard/admin/reports",
        icon: FileBarChart,
    },
    {
        label: "Báo cáo nâng cao",
        href: "/dashboard/admin/reports-advanced",
        icon: BarChart3,
    },
    {
        label: "Dự trù đặt hàng",
        href: "#dutru-dat-hang-admin",
        icon: PackageCheck,
        children: [
            {
                label: "Quản lý đơn",
                href: "/dashboard/admin/dutru-dat-hang",
                icon: ClipboardList,
            },
            {
                label: "Tra cứu QR đơn",
                href: "/dashboard/dutru-dat-hang/tra-cuu",
                icon: QrCode,
            },
        ],
    },
    {
        label: "Tra cứu tồn kho",
        href: "/dashboard/inventory-search",
        icon: Search,
    },
    {
        label: "Cài đặt",
        href: "#cai-dat-admin",
        icon: Settings,
        children: [
            {
                label: "Quản lý Users",
                href: "/dashboard/admin/users",
                icon: Users,
            },
            {
                label: "Quản lý Companies",
                href: "/dashboard/admin/companies",
                icon: Building2,
            },
            {
                label: "Quản lý kỳ báo cáo",
                href: "/dashboard/admin/report-periods",
                icon: CalendarDays,
            },
            {
                label: "Danh mục nhóm điều trị",
                href: "/dashboard/admin/therapeutic-groups",
                icon: ListTree,
            },
            {
                label: "Nhật ký hoạt động",
                href: "/dashboard/admin/activity-logs",
                icon: History,
            },
            {
                label: "Quản trị AI",
                href: "/dashboard/admin/ai-agent",
                icon: Bot,
            },
            {
                label: "Theo dõi AI",
                href: "/dashboard/admin/ai-usage",
                icon: Sparkles,
            },
        ],
    },
];

const facilityNavItems: NavItem[] = [
    {
        label: "Tổng quan",
        href: "/dashboard/facility",
        icon: LayoutDashboard,
    },
    {
        label: "Báo cáo mua sắm",
        href: "#mua-sam",
        icon: ShoppingCart,
        children: [
            {
                label: "Lập Kế hoạch LCNT",
                href: "/dashboard/facility/mua-sam/lap-ke-hoach-lcnt",
                icon: ClipboardList,
            },
            {
                label: "Thông báo mời thầu",
                href: "/dashboard/facility/mua-sam/thong-bao-moi-thau",
                icon: Megaphone,
            },
            {
                label: "Kết quả LCNT",
                href: "/dashboard/facility/mua-sam/ket-qua-lcnt",
                icon: CircleCheck,
            },
            {
                label: "Tra cứu",
                href: "/dashboard/facility/mua-sam/tra-cuu",
                icon: Search,
            },
            {
                label: "Thống kê",
                href: "/dashboard/facility/mua-sam/thong-ke",
                icon: BarChart3,
            },
        ],
    },
    {
        label: "Danh mục dùng chung",
        href: "/dashboard/admin/master-drugs",
        icon: Pill,
    },
    {
        label: "Ánh xạ danh mục thuốc",
        href: "/dashboard/facility/mappings",
        icon: ListTree,
    },
    {
        label: "Báo cáo Xuất-Nhập-Tồn",
        href: "/dashboard/facility/reports",
        icon: FileBarChart,
    },
    {
        label: "Dự trù đặt hàng",
        href: "#dutru-dat-hang-facility",
        icon: PackageCheck,
        children: [
            {
                label: "Quản lý đơn",
                href: "/dashboard/facility/dutru-dat-hang",
                icon: ClipboardList,
            },
            {
                label: "Tra cứu QR đơn",
                href: "/dashboard/dutru-dat-hang/tra-cuu",
                icon: QrCode,
            },
        ],
    },
    {
        label: "Tra cứu tồn kho",
        href: "/dashboard/inventory-search",
        icon: Search,
    },
];

const companyNavItems: NavItem[] = [
    {
        label: "Dự trù đặt hàng",
        href: "#dutru-dat-hang-company",
        icon: PackageCheck,
        children: [
            {
                label: "Quản lý đơn",
                href: "/dashboard/company/dutru-dat-hang",
                icon: ClipboardList,
            },
            {
                label: "Tra cứu QR đơn",
                href: "/dashboard/dutru-dat-hang/tra-cuu",
                icon: QrCode,
            },
        ],
    },
];

function pathMatchesHref(pathname: string, href: string) {
    if (href.startsWith("#")) {
        return false;
    }

    return pathname === href || pathname.startsWith(`${href}/`);
}

function NavTooltip({
    enabled,
    label,
    children,
}: {
    enabled: boolean;
    label: string;
    children: ReactNode;
}) {
    if (!enabled) {
        return children;
    }

    return (
        <Tooltip>
            <TooltipTrigger asChild>{children}</TooltipTrigger>
            <TooltipContent side="right">{label}</TooltipContent>
        </Tooltip>
    );
}

function BrandMark() {
    return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm shadow-blue-600/20">
            <Pill className="size-5" />
        </div>
    );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
    const { data: session } = useSession();
    const pathname = usePathname();
    const isPrintRoute = pathname.endsWith("/print");
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [changePasswordOpen, setChangePasswordOpen] = useState(false);
    const [aiAssistantOpen, setAiAssistantOpen] = useState(false);
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
    const userName = session?.user?.name || "Người dùng";
    const userInitial = userName[0]?.toUpperCase() || "U";
    const canUseAI = role === "ADMIN" || role === "FACILITY";
    const headerTitle = role === "ADMIN"
        ? "Sở Y Tế - Quản trị hệ thống"
        : role === "COMPANY"
            ? `Công ty - ${session?.user?.name || "Tài khoản công ty"}`
            : session?.user?.name || "Dashboard";

    const isNavItemActive = (item: NavItem) => {
        if (item.children) {
            return item.children.some((child) => pathMatchesHref(pathname, child.href));
        }

        return pathMatchesHref(pathname, item.href);
    };

    const handleLogout = async () => {
        await signOut({ callbackUrl: "/login" });
    };

    const renderNavItems = ({
        expanded,
        collapsedTooltips = false,
        onNavigate,
    }: {
        expanded: boolean;
        collapsedTooltips?: boolean;
        onNavigate?: () => void;
    }) =>
        navItems.map((item) => {
            const Icon = item.icon;
            const isActive = isNavItemActive(item);

            if (item.children) {
                const isDropdownOpen = openDropdowns.includes(item.label) || isActive;
                const content = (
                    <button
                        type="button"
                        aria-expanded={isDropdownOpen}
                        onClick={() => toggleDropdown(item.label)}
                        className={cn(
                            "group relative flex h-11 w-full items-center rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40",
                            expanded ? "gap-3 px-3" : "justify-center px-0",
                            isActive
                                ? "bg-blue-50 text-blue-700 dark:bg-blue-950/45 dark:text-blue-200"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                    >
                        {isActive && (
                            <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-blue-600" />
                        )}
                        <Icon
                            className={cn(
                                "size-5 shrink-0 transition-colors",
                                isActive ? "text-blue-600 dark:text-blue-300" : "text-muted-foreground group-hover:text-foreground"
                            )}
                        />
                        {expanded && (
                            <>
                                <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
                                <ChevronDown
                                    className={cn(
                                        "size-4 shrink-0 text-muted-foreground transition-transform",
                                        isDropdownOpen && "rotate-180",
                                        isActive && "text-blue-500"
                                    )}
                                />
                            </>
                        )}
                    </button>
                );

                return (
                    <div key={item.label}>
                        <NavTooltip enabled={collapsedTooltips && !expanded} label={item.label}>
                            {content}
                        </NavTooltip>
                        {isDropdownOpen && expanded && (
                            <div className="mt-1 space-y-1 pl-5">
                                {item.children.map((child) => {
                                    const ChildIcon = child.icon;
                                    const isChildActive = pathMatchesHref(pathname, child.href);

                                    return (
                                        <Link
                                            key={child.href}
                                            href={child.href}
                                            onClick={onNavigate}
                                            className={cn(
                                                "group flex h-9 items-center gap-2 rounded-md px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40",
                                                isChildActive
                                                    ? "bg-blue-50 text-blue-700 font-semibold dark:bg-blue-950/45 dark:text-blue-200"
                                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                            )}
                                        >
                                            <ChildIcon
                                                className={cn(
                                                    "size-4 shrink-0 transition-colors",
                                                    isChildActive
                                                        ? "text-blue-600 dark:text-blue-300"
                                                        : "text-muted-foreground group-hover:text-foreground"
                                                )}
                                            />
                                            <span className="min-w-0 truncate">{child.label}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            }

            const content = (
                <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                        "group relative flex h-11 w-full items-center rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40",
                        expanded ? "gap-3 px-3" : "justify-center px-0",
                        isActive
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-950/45 dark:text-blue-200"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                >
                    {isActive && (
                        <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-blue-600" />
                    )}
                    <Icon
                        className={cn(
                            "size-5 shrink-0 transition-colors",
                            isActive ? "text-blue-600 dark:text-blue-300" : "text-muted-foreground group-hover:text-foreground"
                        )}
                    />
                    {expanded && <span className="min-w-0 truncate">{item.label}</span>}
                </Link>
            );

            return (
                <NavTooltip key={item.href} enabled={collapsedTooltips && !expanded} label={item.label}>
                    {content}
                </NavTooltip>
            );
        });

    if (isPrintRoute) {
        return <div className="min-h-screen bg-white">{children}</div>;
    }

    return (
        <TooltipProvider delayDuration={150}>
            <div className="min-h-screen bg-background">
                {mobileNavOpen && (
                    <button
                        type="button"
                        aria-label="Đóng menu điều hướng"
                        className="fixed inset-0 z-40 bg-slate-950/40 xl:hidden"
                        onClick={() => setMobileNavOpen(false)}
                    />
                )}

                {mobileNavOpen && (
                    <aside className="fixed inset-y-0 left-0 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col border-r border-border bg-card shadow-xl xl:hidden">
                        <div className="flex h-16 items-center justify-between gap-3 border-b border-border px-4">
                            <div className="flex min-w-0 items-center gap-3">
                                <BrandMark />
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold leading-5 text-foreground">Sử dụng thuốc</p>
                                    <p className="truncate text-xs text-muted-foreground">Mua sắm & kho dược</p>
                                </div>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Đóng menu"
                                className="text-muted-foreground hover:bg-muted hover:text-foreground"
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

                        <div className="shrink-0 border-t border-border p-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                                    {userInitial}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-foreground">{userName}</p>
                                    <p className="text-xs text-muted-foreground">{roleLabel}</p>
                                </div>
                            </div>
                        </div>
                    </aside>
                )}

                <aside
                    className={cn(
                        "fixed inset-y-0 left-0 z-50 hidden flex-col border-r border-border bg-card transition-[width] duration-300 xl:flex",
                        sidebarOpen ? "w-72" : "w-[72px]"
                    )}
                >
                    <div
                        className={cn(
                            "flex h-16 shrink-0 items-center border-b border-border px-4",
                            sidebarOpen ? "justify-between gap-3" : "justify-center"
                        )}
                    >
                        <div className={cn("flex min-w-0 items-center gap-3", !sidebarOpen && "hidden")}>
                            <BrandMark />
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold leading-5 text-foreground">Sử dụng thuốc</p>
                                <p className="truncate text-xs text-muted-foreground">Mua sắm & kho dược</p>
                            </div>
                        </div>
                        {!sidebarOpen && <BrandMark />}
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={sidebarOpen ? "Thu gọn sidebar" : "Mở rộng sidebar"}
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className={cn(
                                "text-muted-foreground hover:bg-muted hover:text-foreground",
                                !sidebarOpen && "absolute right-2 top-4"
                            )}
                        >
                            {sidebarOpen ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
                        </Button>
                    </div>

                    <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4">
                        {renderNavItems({ expanded: sidebarOpen, collapsedTooltips: true })}
                    </nav>

                    <div className="shrink-0 border-t border-border p-4">
                        <NavTooltip enabled={!sidebarOpen} label={`${userName} - ${roleLabel}`}>
                            <div className={cn("flex items-center", sidebarOpen ? "gap-3" : "justify-center")}>
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                                    {userInitial}
                                </div>
                                {sidebarOpen && (
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-foreground">{userName}</p>
                                        <p className="text-xs text-muted-foreground">{roleLabel}</p>
                                    </div>
                                )}
                            </div>
                        </NavTooltip>
                    </div>
                </aside>

                <div className={cn("transition-[padding] duration-300", sidebarOpen ? "xl:pl-72" : "xl:pl-[72px]")}>
                    <header className="flex h-16 items-center justify-between gap-3 border-b border-border bg-card px-3 shadow-sm shadow-slate-950/[0.03] sm:px-4 xl:px-6">
                        <div className="flex min-w-0 items-center gap-3">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Mở menu điều hướng"
                                className="text-muted-foreground hover:bg-muted hover:text-foreground xl:hidden"
                                onClick={() => setMobileNavOpen(true)}
                            >
                                <Menu className="size-4" />
                            </Button>
                            <h1 className="min-w-0 truncate text-base font-semibold text-foreground sm:text-lg">
                                {headerTitle}
                            </h1>
                        </div>
                        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
                            {canUseAI && (
                                <Button
                                    type="button"
                                    size="sm"
                                    className="gap-2 border border-emerald-500/70 bg-emerald-600 text-white shadow-sm shadow-emerald-900/15 hover:border-emerald-600 hover:bg-emerald-700 hover:text-white focus-visible:ring-emerald-500/40 dark:border-emerald-400/40 dark:bg-emerald-500 dark:text-emerald-950 dark:shadow-emerald-950/30 dark:hover:bg-emerald-400"
                                    onClick={() => setAiAssistantOpen(true)}
                                >
                                    <Sparkles className="size-4" />
                                    <span className="hidden sm:inline">Trợ lý AI</span>
                                </Button>
                            )}
                            <NotificationBell />
                            <ThemeToggle />
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="flex items-center gap-2 px-2 hover:bg-muted sm:px-3">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                                            {userInitial}
                                        </div>
                                        <ChevronDown className="hidden size-4 text-muted-foreground sm:block" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <div className="px-2 py-1.5">
                                        <p className="truncate text-sm font-medium">{userName}</p>
                                        <p className="truncate text-xs text-muted-foreground">{session?.user?.email}</p>
                                    </div>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={() => setChangePasswordOpen(true)}
                                        className="cursor-pointer"
                                    >
                                        <KeyRound className="mr-2 size-4" />
                                        Đổi mật khẩu
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
                                        <LogOut className="mr-2 size-4" />
                                        Đăng xuất
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </header>

                    <main className="p-3 sm:p-4 xl:p-6">{children}</main>
                </div>

                <ChangePasswordDialog
                    open={changePasswordOpen}
                    onOpenChange={setChangePasswordOpen}
                />
                {canUseAI && (
                    <AIAssistantPanel
                        open={aiAssistantOpen}
                        onOpenChange={setAiAssistantOpen}
                        pathname={pathname}
                        canUseFallback={role === "ADMIN"}
                    />
                )}
            </div>
        </TooltipProvider>
    );
}
