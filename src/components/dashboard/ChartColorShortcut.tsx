"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ChartColorShortcutProps {
    chartId: string;
    className?: string;
}

export default function ChartColorShortcut({ chartId, className }: ChartColorShortcutProps) {
    const { data: session } = useSession();

    if (session?.user?.role !== "ADMIN") {
        return null;
    }

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    asChild
                    variant="ghost"
                    size="icon-xs"
                    className={cn("text-muted-foreground hover:text-foreground", className)}
                >
                    <Link href={`/dashboard/admin/chart-colors?chartId=${encodeURIComponent(chartId)}`}>
                        <Palette className="size-3.5" />
                        <span className="sr-only">Cấu hình màu biểu đồ</span>
                    </Link>
                </Button>
            </TooltipTrigger>
            <TooltipContent>Cấu hình màu biểu đồ</TooltipContent>
        </Tooltip>
    );
}
