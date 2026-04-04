"use client";

import FacilityMuaSamThongKe from "@/components/mua-sam/FacilityMuaSamThongKe";

export default function FacilityThongKePage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Thống kê Mua sắm</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Tổng hợp số liệu kế hoạch LCNT, gói thầu, thông báo mời thầu và kết quả đấu thầu của cơ sở
                </p>
            </div>
            <FacilityMuaSamThongKe />
        </div>
    );
}
