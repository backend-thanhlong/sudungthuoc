import ProcurementLookupPage from "@/components/mua-sam/ProcurementLookupPage";

export default function AdminProcurementLookupPage() {
    return (
        <ProcurementLookupPage
            role="admin"
            apiUrl="/api/admin/mua-sam/tra-cuu"
            pageTitle="Tra cứu Mua sắm"
            pageDescription="Tra cứu toàn diện tiến trình mua sắm của từng gói thầu quy trình 1 trên toàn hệ thống."
        />
    );
}
