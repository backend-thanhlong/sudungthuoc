"use client";

import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, XCircle, Download } from "lucide-react";
import { exportExcel } from "@/lib/excel";

interface MappingRequest {
    id: string;
    maNoiBo: string;
    tenThuocNoiBo: string;
    hoatChatNoiBo: string | null;
    soDangKyNoiBo: string | null;
    donViTinhNoiBo: string | null;
    status: string;
    isOutOfCatalog: boolean;
    createdAt: string;
    updatedAt: string;
    facility: {
        facilityName: string;
        facilityCode: string;
    };
    masterDrug: {
        id: string;
        maChung: string;
        tenThuoc: string;
        hoatChat: string | null;
        soDangKy: string | null;
    } | null;
}

interface FacilitySummary {
    facilityCode: string;
    facilityName: string;
    pendingCount: number;
    approvedCount: number;
    lastRequestDate: string | null;
    lastApprovalDate: string | null;
    mappings: MappingRequest[];
}

export default function MappingsApprovalPage() {
    const [mappings, setMappings] = useState<MappingRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedMapping, setSelectedMapping] = useState<MappingRequest | null>(null);
    const [rejectNote, setRejectNote] = useState("");
    const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // For Facility Detail View
    const [selectedFacilityCode, setSelectedFacilityCode] = useState<string | null>(null);
    const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
    // New state to control which items to show in the detail dialog
    const [detailViewMode, setDetailViewMode] = useState<"pending" | "all">("pending");

    const fetchMappings = async () => {
        try {
            const res = await fetch("/api/admin/mappings");
            if (res.ok) {
                const data = await res.json();
                setMappings(data);
            }
        } catch (error) {
            console.error("Error fetching mappings:", error);
            toast.error("Không thể tải danh sách ánh xạ");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMappings();
    }, []);

    // Aggregation Logic
    const facilitySummaries = useMemo(() => {
        const map = new Map<string, FacilitySummary & { rejectedCount: number }>();

        mappings.forEach(m => {
            const code = m.facility.facilityCode;
            if (!map.has(code)) {
                map.set(code, {
                    facilityCode: code,
                    facilityName: m.facility.facilityName,
                    pendingCount: 0,
                    approvedCount: 0,
                    rejectedCount: 0,
                    lastRequestDate: null,
                    lastApprovalDate: null,
                    mappings: []
                });
            }
            const summary = map.get(code)!;
            summary.mappings.push(m);

            if (m.status === "WAITING_APPROVAL") {
                summary.pendingCount++;
                // Track latest request date (createdAt)
                if (!summary.lastRequestDate || new Date(m.createdAt) > new Date(summary.lastRequestDate)) {
                    summary.lastRequestDate = m.createdAt;
                }
            } else if (m.status === "APPROVED") {
                summary.approvedCount++;
                // Track latest action date
                if (!summary.lastApprovalDate || new Date(m.updatedAt) > new Date(summary.lastApprovalDate)) {
                    summary.lastApprovalDate = m.updatedAt;
                }
            } else if (m.status === "REJECTED") {
                summary.rejectedCount++;
                // Track latest action date for rejections too
                if (!summary.lastApprovalDate || new Date(m.updatedAt) > new Date(summary.lastApprovalDate)) {
                    summary.lastApprovalDate = m.updatedAt;
                }
            }
        });

        return Array.from(map.values());
    }, [mappings]);

    const pendingFacilities = facilitySummaries
        .filter(f => f.pendingCount > 0)
        .sort((a, b) => {
            // Sort by latest request date desc
            const dateA = a.lastRequestDate ? new Date(a.lastRequestDate).getTime() : 0;
            const dateB = b.lastRequestDate ? new Date(b.lastRequestDate).getTime() : 0;
            return dateB - dateA;
        });

    // Sort summarize facilities mostly by activity
    const allFacilities = [...facilitySummaries].sort((a, b) => {
        const dateA = a.lastRequestDate ? new Date(a.lastRequestDate).getTime() : 0;
        const dateB = b.lastRequestDate ? new Date(b.lastRequestDate).getTime() : 0;
        return dateB - dateA;
    });

    const handleApprove = async (mappingId: string) => {
        setIsProcessing(true);
        try {
            const res = await fetch(`/api/admin/mappings/${mappingId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "APPROVED" }),
            });

            if (res.ok) {
                toast.success("Đã duyệt ánh xạ");
                fetchMappings();
            }
        } catch {
            toast.error("Đã xảy ra lỗi");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!selectedMapping) return;
        setIsProcessing(true);

        try {
            const res = await fetch(`/api/admin/mappings/${selectedMapping.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "REJECTED", adminNote: rejectNote }),
            });

            if (res.ok) {
                toast.success("Đã từ chối ánh xạ");
                setIsRejectDialogOpen(false);
                setSelectedMapping(null);
                setRejectNote("");
                fetchMappings();
            }
        } catch {
            toast.error("Đã xảy ra lỗi");
        } finally {
            setIsProcessing(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "WAITING_APPROVAL":
                return <Badge className="bg-amber-100 text-amber-800">Chờ duyệt</Badge>;
            case "APPROVED":
                return <Badge className="bg-green-100 text-green-800">Đã duyệt</Badge>;
            case "REJECTED":
                return <Badge className="bg-red-100 text-red-800">Từ chối</Badge>;
            case "AUTO_MAPPED":
                return <Badge className="bg-blue-100 text-blue-800">Tự động</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return "-";
        try {
            return new Date(dateString).toLocaleDateString("vi-VN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            });
        } catch {
            return dateString;
        }
    };

    const MappingTable = ({ items, showActions = false }: { items: MappingRequest[]; showActions?: boolean }) => (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Thuốc nội bộ</TableHead>
                    <TableHead>SĐK nội bộ</TableHead>
                    <TableHead>Thuốc mapping</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    {showActions && <TableHead className="text-right">Thao tác</TableHead>}
                </TableRow>
            </TableHeader>
            <TableBody>
                {items.map((mapping) => (
                    <TableRow key={mapping.id}>
                        <TableCell>
                            <div>
                                <p className="font-medium">{mapping.tenThuocNoiBo}</p>
                                <code className="text-xs text-gray-500">{mapping.maNoiBo}</code>
                            </div>
                        </TableCell>
                        <TableCell>
                            <code className="px-2 py-1 bg-gray-100 rounded text-sm">
                                {mapping.soDangKyNoiBo || "-"}
                            </code>
                        </TableCell>
                        <TableCell>
                            {mapping.isOutOfCatalog ? (
                                <span className="text-amber-600 italic">Ngoài danh mục</span>
                            ) : mapping.masterDrug ? (
                                <div>
                                    <p className="font-medium text-emerald-600">{mapping.masterDrug.tenThuoc}</p>
                                    <code className="text-xs text-gray-500">{mapping.masterDrug.maChung}</code>
                                </div>
                            ) : (
                                <span className="text-gray-400">-</span>
                            )}
                        </TableCell>
                        <TableCell>{getStatusBadge(mapping.status)}</TableCell>
                        {showActions && (
                            <TableCell className="text-right space-x-2">
                                <Button
                                    size="sm"
                                    className="bg-green-500 hover:bg-green-600"
                                    onClick={() => handleApprove(mapping.id)}
                                    disabled={isProcessing}
                                >
                                    Duyệt
                                </Button>
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => {
                                        setSelectedMapping(mapping);
                                        setIsRejectDialogOpen(true);
                                    }}
                                    disabled={isProcessing}
                                >
                                    Từ chối
                                </Button>
                            </TableCell>
                        )}
                    </TableRow>
                ))}
                {items.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={showActions ? 5 : 4} className="text-center text-gray-500 py-8">
                            Không có dữ liệu
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );

    const FacilityPendingTable = ({ summaries }: { summaries: FacilitySummary[] }) => (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[50px]">STT</TableHead>
                    <TableHead>Tên cơ sở</TableHead>
                    <TableHead className="text-center">Số thuốc cần duyệt</TableHead>
                    <TableHead>Ngày yêu cầu duyệt</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {summaries.map((summary, index) => (
                    <TableRow key={summary.facilityCode}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>
                            <div>
                                <p className="font-medium">{summary.facilityName}</p>
                                <code className="text-xs text-gray-500">{summary.facilityCode}</code>
                            </div>
                        </TableCell>
                        <TableCell className="text-center font-bold text-amber-600">
                            {summary.pendingCount}
                        </TableCell>
                        <TableCell>{formatDate(summary.lastRequestDate)}</TableCell>
                        <TableCell className="text-right">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    setSelectedFacilityCode(summary.facilityCode);
                                    setDetailViewMode("pending");
                                    setIsDetailDialogOpen(true);
                                }}
                            >
                                Xem cụ thể danh mục
                            </Button>
                        </TableCell>
                    </TableRow>
                ))}
                {summaries.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                            Không có yêu cầu chờ duyệt
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );

    // For Delete Validation
    const [facilityToDelete, setFacilityToDelete] = useState<{ code: string; name: string } | null>(null);
    // For Bulk Approve Validation
    const [facilityToApprove, setFacilityToApprove] = useState<{ code: string; name: string } | null>(null);
    // For Bulk Reject Validation
    const [facilityToReject, setFacilityToReject] = useState<{ code: string; name: string } | null>(null);
    const [rejectAllNote, setRejectAllNote] = useState("");

    const handleDeleteHistory = async () => {
        if (!facilityToDelete) return;

        setIsProcessing(true);
        try {
            const res = await fetch("/api/admin/mappings", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ facilityCode: facilityToDelete.code }),
            });

            if (res.ok) {
                const data = await res.json();
                toast.success(`Đã xóa ${data.count} bản ghi đã duyệt/từ chối`);
                fetchMappings();
            } else {
                toast.error("Không thể xóa dữ liệu");
            }
        } catch (error) {
            console.error("Delete error:", error);
            toast.error("Đã xảy ra lỗi khi xóa");
        } finally {
            setIsProcessing(false);
            setFacilityToDelete(null);
        }
    };

    const handleBulkApprove = async () => {
        if (!facilityToApprove) return;

        setIsProcessing(true);
        try {
            const res = await fetch("/api/admin/mappings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ facilityCode: facilityToApprove.code, status: "APPROVED" }),
            });

            if (res.ok) {
                const data = await res.json();
                toast.success(`Đã duyệt tất cả ${data.count} thuốc`);
                fetchMappings();
                setIsDetailDialogOpen(false);
            } else {
                toast.error("Không thể duyệt dữ liệu");
            }
        } catch (error) {
            console.error("Bulk approve error:", error);
            toast.error("Đã xảy ra lỗi khi duyệt");
        } finally {
            setIsProcessing(false);
            setFacilityToApprove(null);
        }
    };

    const handleBulkReject = async () => {
        if (!facilityToReject) return;

        setIsProcessing(true);
        try {
            const res = await fetch("/api/admin/mappings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ facilityCode: facilityToReject.code, status: "REJECTED", adminNote: rejectAllNote }),
            });

            if (res.ok) {
                const data = await res.json();
                toast.success(`Đã từ chối ${data.count} thuốc`);
                fetchMappings();
                setIsDetailDialogOpen(false);
            } else {
                toast.error("Không thể từ chối dữ liệu");
            }
        } catch (error) {
            console.error("Bulk reject error:", error);
            toast.error("Đã xảy ra lỗi");
        } finally {
            setIsProcessing(false);
            setFacilityToReject(null);
            setRejectAllNote("");
        }
    };

    const handleExportOutOfCatalog = () => {
        if (!selectedFacilitySummary) return;

        const outOfCatalogMappings = detailMappings.filter(m => m.isOutOfCatalog);

        if (outOfCatalogMappings.length === 0) {
            toast.info("Không có thuốc ngoài danh mục nào");
            return;
        }

        const exportData = outOfCatalogMappings.map((m, index) => ({
            "STT": index + 1,
            "Mã nội bộ": m.maNoiBo,
            "Tên thuốc nội bộ": m.tenThuocNoiBo,
            "Hoạt chất nội bộ": m.hoatChatNoiBo || "",
            "SĐK nội bộ": m.soDangKyNoiBo || "",
            "ĐVT nội bộ": m.donViTinhNoiBo || "",
            "Ngày yêu cầu": new Date(m.createdAt).toLocaleDateString("vi-VN"),
            "Trạng thái": m.status === "WAITING_APPROVAL" ? "Chờ duyệt" : m.status
        }));

        exportExcel(
            exportData,
            `Thuoc_Ngoai_DM_${selectedFacilitySummary.facilityCode}_${new Date().toISOString().split('T')[0]}`
        );
    };

    // New Summary Table Component
    const FacilitySummaryTable = ({ summaries }: { summaries: (FacilitySummary & { rejectedCount: number })[] }) => (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[50px]">STT</TableHead>
                    <TableHead>Tên cơ sở</TableHead>
                    <TableHead className="text-center">Tổng thuốc upload</TableHead>
                    <TableHead className="text-center">Ánh xạ thành công</TableHead>
                    <TableHead>Ngày yêu cầu duyệt</TableHead>
                    <TableHead className="text-center">Số thuốc đã duyệt</TableHead>
                    <TableHead className="text-center">Số thuốc từ chối</TableHead>
                    <TableHead>Ngày Duyệt</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {summaries.map((summary, index) => {
                    const totalUploaded = summary.mappings.length;
                    const successCount = summary.mappings.filter(m => m.status === "APPROVED" || m.status === "AUTO_MAPPED").length;

                    return (
                        <TableRow key={summary.facilityCode}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>
                                <div>
                                    <p className="font-medium">{summary.facilityName}</p>
                                    <code className="text-xs text-gray-500">{summary.facilityCode}</code>
                                </div>
                            </TableCell>
                            <TableCell className="text-center font-bold text-gray-700">
                                {totalUploaded}
                            </TableCell>
                            <TableCell className="text-center font-bold text-blue-600">
                                {successCount}
                            </TableCell>
                            <TableCell>{formatDate(summary.lastRequestDate)}</TableCell>
                            <TableCell className="text-center font-medium text-green-600">
                                {summary.approvedCount}
                            </TableCell>
                            <TableCell className="text-center font-medium text-red-600">
                                {summary.rejectedCount}
                            </TableCell>
                            <TableCell>{formatDate(summary.lastApprovalDate)}</TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            setSelectedFacilityCode(summary.facilityCode);
                                            setDetailViewMode("all"); // Show all items
                                            setIsDetailDialogOpen(true);
                                        }}
                                    >
                                        Xem chi tiết
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                        title="Xóa tất cả dữ liệu thuốc"
                                        onClick={() => setFacilityToDelete({ code: summary.facilityCode, name: summary.facilityName })}
                                    >
                                        <Trash2 size={16} />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    );
                })}
                {summaries.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={9} className="text-center text-gray-500 py-8">
                            Không có dữ liệu
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );

    const pendingMappings = mappings.filter((m) => m.status === "WAITING_APPROVAL");
    const approvedMappings = mappings.filter((m) => m.status === "APPROVED");
    const rejectedMappings = mappings.filter((m) => m.status === "REJECTED");

    const selectedFacilitySummary = selectedFacilityCode
        ? facilitySummaries.find(f => f.facilityCode === selectedFacilityCode)
        : null;

    // Determine which mappings to show in dialog
    const detailMappings = useMemo(() => {
        if (!selectedFacilitySummary) return [];
        if (detailViewMode === "pending") {
            return selectedFacilitySummary.mappings.filter(m => m.status === "WAITING_APPROVAL");
        }
        return selectedFacilitySummary.mappings;
    }, [selectedFacilitySummary, detailViewMode]);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold text-gray-800">Duyệt ánh xạ thuốc</h2>
                <p className="text-gray-500 mt-1">Phê duyệt yêu cầu ánh xạ từ các cơ sở y tế</p>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <Card className="border-l-4 border-l-amber-500">
                    <CardContent className="pt-6">
                        <div className="text-3xl font-bold text-amber-600">{pendingMappings.length}</div>
                        <p className="text-gray-500">Tổng thuốc chờ duyệt</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-green-500">
                    <CardContent className="pt-6">
                        <div className="text-3xl font-bold text-green-600">{approvedMappings.length}</div>
                        <p className="text-gray-500">Đã duyệt</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-red-500">
                    <CardContent className="pt-6">
                        <div className="text-3xl font-bold text-red-600">{rejectedMappings.length}</div>
                        <p className="text-gray-500">Từ chối</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-0 shadow-lg">
                <CardHeader>
                    <CardTitle>Danh sách ánh xạ</CardTitle>
                    <CardDescription>Quản lý yêu cầu ánh xạ từ các cơ sở</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
                        </div>
                    ) : (
                        <Tabs defaultValue="pending">
                            <TabsList>
                                <TabsTrigger value="pending">
                                    Chờ duyệt ({pendingFacilities.length} cơ sở)
                                </TabsTrigger>
                                <TabsTrigger value="summary">
                                    Tổng hợp
                                </TabsTrigger>
                            </TabsList>
                            <TabsContent value="pending" className="mt-4">
                                <FacilityPendingTable summaries={pendingFacilities} />
                            </TabsContent>
                            <TabsContent value="summary" className="mt-4">
                                <FacilitySummaryTable summaries={allFacilities} />
                            </TabsContent>
                        </Tabs>
                    )}
                </CardContent>
            </Card>

            {/* Facility Detail Dialog */}
            <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
                <DialogContent className="sm:max-w-none w-[95vw] max-w-[1200px] h-[85vh] flex flex-col p-6">
                    <DialogHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <DialogTitle className="text-xl">
                                    {detailViewMode === "pending" ? "Duyệt thuốc" : "Danh sách thuốc"} - {selectedFacilitySummary?.facilityName}
                                </DialogTitle>
                                <DialogDescription>
                                    {detailViewMode === "pending"
                                        ? "Danh sách thuốc chờ duyệt của cơ sở. Vui lòng kiểm tra kỹ thông tin trước khi phê duyệt."
                                        : "Tổng hợp danh sách thuốc của cơ sở."}
                                </DialogDescription>
                            </div>
                            {detailViewMode === "pending" && selectedFacilitySummary && selectedFacilitySummary.pendingCount > 0 && (
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        className="border-slate-300 text-slate-700 hover:bg-slate-50"
                                        onClick={handleExportOutOfCatalog}
                                    >
                                        <Download className="w-4 h-4 mr-1.5" />
                                        Xuất Excel ngoài danh mục
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="border-red-300 text-red-600 hover:bg-red-50"
                                        onClick={() => setFacilityToReject({ code: selectedFacilitySummary.facilityCode, name: selectedFacilitySummary.facilityName })}
                                    >
                                        <XCircle className="w-4 h-4 mr-1.5" />
                                        Từ chối tất cả ({selectedFacilitySummary.pendingCount})
                                    </Button>
                                    <Button
                                        className="bg-green-600 hover:bg-green-700"
                                        onClick={() => setFacilityToApprove({ code: selectedFacilitySummary.facilityCode, name: selectedFacilitySummary.facilityName })}
                                    >
                                        Duyệt tất cả ({selectedFacilitySummary.pendingCount})
                                    </Button>
                                </div>
                            )}
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-auto mt-4 border rounded-md">
                        {selectedFacilitySummary && (
                            <Table>
                                <TableHeader className="sticky top-0 bg-gray-50 z-10">
                                    <TableRow>
                                        <TableHead className="w-[40px] font-bold text-gray-700 bg-gray-100">STT</TableHead>
                                        <TableHead className="min-w-[150px] font-bold text-gray-700 bg-gray-100">Thuốc nội bộ</TableHead>
                                        <TableHead className="min-w-[150px] font-bold text-gray-700 bg-gray-100">Hoạt chất / Hàm lượng (NB)</TableHead>
                                        <TableHead className="min-w-[120px] font-bold text-gray-700 bg-gray-100">SĐK / ĐVT (NB)</TableHead>
                                        <TableHead className="min-w-[200px] font-bold text-gray-700 bg-gray-100">Thuốc Dược Quốc Gia</TableHead>
                                        <TableHead className="min-w-[100px] font-bold text-gray-700 bg-gray-100">Trạng thái</TableHead>
                                        <TableHead className="text-right min-w-[120px] font-bold text-gray-700 bg-gray-100 sticky right-0">Thao tác</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {detailMappings.map((mapping, index) => (
                                        <TableRow key={mapping.id} className="hover:bg-slate-50">
                                            <TableCell className="whitespace-nowrap">{index + 1}</TableCell>
                                            <TableCell className="min-w-[180px] max-w-[250px] whitespace-normal break-words">
                                                <div className="space-y-1">
                                                    <p className="font-semibold text-blue-700 leading-tight">{mapping.tenThuocNoiBo}</p>
                                                    <div className="flex items-center gap-2">
                                                        <code className="text-[11px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 border font-mono">
                                                            {mapping.maNoiBo}
                                                        </code>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="min-w-[150px] max-w-[200px] whitespace-normal break-words">
                                                <div className="space-y-1.5 text-sm">
                                                    <div>
                                                        <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Hoạt chất</span>
                                                        <p className="font-medium text-slate-700">{mapping.hoatChatNoiBo || "-"}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="min-w-[120px] max-w-[160px] whitespace-normal break-words">
                                                <div className="space-y-2 text-sm">
                                                    <div>
                                                        <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">SĐK</span>
                                                        <p className="font-medium text-slate-700">{mapping.soDangKyNoiBo || "-"}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">ĐVT</span>
                                                        <p className="text-slate-700">{mapping.donViTinhNoiBo || "-"}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="min-w-[240px] max-w-[320px] whitespace-normal break-words">
                                                {mapping.isOutOfCatalog ? (
                                                    <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                                                        <span className="text-amber-700 font-medium flex items-center gap-2">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
                                                            Khai báo ngoài danh mục
                                                        </span>
                                                    </div>
                                                ) : mapping.masterDrug ? (
                                                    <div className="bg-emerald-50/50 rounded-md border border-emerald-100 p-2.5 space-y-2 relative group">
                                                        <div>
                                                            <p className="font-bold text-emerald-800 leading-tight">{mapping.masterDrug.tenThuoc}</p>
                                                            <div className="flex gap-2 mt-1">
                                                                <code className="text-[10px] bg-emerald-100 text-emerald-800 px-1 rounded font-mono border border-emerald-200">
                                                                    {mapping.masterDrug.maChung}
                                                                </code>
                                                                {mapping.masterDrug.soDangKy && (
                                                                    <span className="text-[10px] bg-white border border-emerald-200 text-emerald-700 px-1 rounded">
                                                                        SĐK: {mapping.masterDrug.soDangKy}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {mapping.masterDrug.hoatChat && (
                                                            <div className="border-t border-emerald-100 pt-1.5 mt-1">
                                                                <p className="text-xs text-emerald-800">
                                                                    <span className="opacity-60 mr-1">HC:</span>
                                                                    {mapping.masterDrug.hoatChat}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-300 italic">Chưa map danh mục</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">{getStatusBadge(mapping.status)}</TableCell>
                                            <TableCell className="text-right sticky right-0 bg-white group-hover:bg-slate-50 shadow-[-10px_0_10px_-5px_rgba(0,0,0,0.05)] whitespace-nowrap">
                                                <div className="flex justify-end gap-2 px-1">
                                                    {/* Only show Approve/Reject buttons if status is WAITING_APPROVAL */}
                                                    {mapping.status === "WAITING_APPROVAL" && (
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                className="bg-green-600 hover:bg-green-700 h-8 px-3"
                                                                onClick={() => handleApprove(mapping.id)}
                                                                disabled={isProcessing}
                                                            >
                                                                Duyệt
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 px-3"
                                                                onClick={() => {
                                                                    setSelectedMapping(mapping);
                                                                    setIsRejectDialogOpen(true);
                                                                }}
                                                                disabled={isProcessing}
                                                            >
                                                                Từ chối
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {detailMappings.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center text-gray-500 py-12">
                                                <div className="flex flex-col items-center gap-2">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300"><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></svg>
                                                    <p>Không có dữ liệu</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </div>

                    <DialogFooter className="mt-4 pt-4 border-t">
                        <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
                            Đóng
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reject Dialog */}
            <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Từ chối ánh xạ</DialogTitle>
                        <DialogDescription>
                            Vui lòng nhập lý do từ chối để cơ sở biết cách điều chỉnh
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm text-gray-500 mb-2">Thuốc nội bộ:</p>
                            <p className="font-medium">{selectedMapping?.tenThuocNoiBo}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 mb-2">Lý do từ chối:</p>
                            <Textarea
                                placeholder="VD: Sai hàm lượng, Chọn sai mã..."
                                value={rejectNote}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRejectNote(e.target.value)}
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
                            Hủy
                        </Button>
                        <Button variant="destructive" onClick={handleReject} disabled={isProcessing}>
                            {isProcessing ? "Đang xử lý..." : "Xác nhận từ chối"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {/* Delete Confirmation Alert */}
            <AlertDialog open={!!facilityToDelete} onOpenChange={(open) => !open && setFacilityToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Xác nhận xóa dữ liệu</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bạn có chắc chắn muốn xóa các thuốc <strong>Đã duyệt</strong>, <strong>Từ chối</strong> và <strong>Tự động</strong> của cơ sở: <br />
                            <span className="font-bold text-gray-900">{facilityToDelete?.name}</span>?
                            <br /><br />
                            Các thuốc đang <strong>Chờ duyệt</strong> sẽ được <strong>GIỮ LẠI</strong>.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isProcessing}>Hủy</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={(e) => {
                                e.preventDefault();
                                handleDeleteHistory();
                            }}
                            disabled={isProcessing}
                        >
                            {isProcessing ? "Đang xóa..." : "Xác nhận xóa"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Bulk Approve Confirmation Alert */}
            <AlertDialog open={!!facilityToApprove} onOpenChange={(open) => !open && setFacilityToApprove(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Xác nhận duyệt tất cả</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bạn có chắc chắn muốn duyệt <strong>TẤT CẢ</strong> thuốc đang chờ duyệt của cơ sở: <br />
                            <span className="font-bold text-gray-900">{facilityToApprove?.name}</span>?
                            <br /><br />
                            Toàn bộ thuốc ở trạng thái Chờ duyệt sẽ được chuyển sang Đã duyệt.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isProcessing}>Hủy</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-green-600 hover:bg-green-700"
                            onClick={(e) => {
                                e.preventDefault();
                                handleBulkApprove();
                            }}
                            disabled={isProcessing}
                        >
                            {isProcessing ? "Đang xử lý..." : "Xác nhận duyệt"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Bulk Reject Dialog (Dialog to allow textarea input) */}
            <Dialog open={!!facilityToReject} onOpenChange={(open) => !open && (setFacilityToReject(null), setRejectAllNote(""))}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Từ chối tất cả ánh xạ</DialogTitle>
                        <DialogDescription>
                            Bạn sắp từ chối <strong>TẤT CẢ</strong> thuốc đang chờ duyệt của:{" "}
                            <span className="font-bold text-gray-900">{facilityToReject?.name}</span>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <p className="text-sm text-gray-600">Lý do từ chối (sẽ gửi đến cơ sở):</p>
                        <Textarea
                            placeholder="VD: Thông tin ánh xạ không chính xác, cần kiểm tra lại danh mục..."
                            value={rejectAllNote}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRejectAllNote(e.target.value)}
                            rows={3}
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => { setFacilityToReject(null); setRejectAllNote(""); }}
                            disabled={isProcessing}
                        >
                            Hủy
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleBulkReject}
                            disabled={isProcessing}
                        >
                            {isProcessing ? "Đang xử lý..." : "Xác nhận từ chối tất cả"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>

    );
}
