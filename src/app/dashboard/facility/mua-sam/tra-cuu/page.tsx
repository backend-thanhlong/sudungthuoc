import ProcurementLookupPage from "@/components/mua-sam/ProcurementLookupPage";

export default function FacilityProcurementLookupPage() {
    return (
        <ProcurementLookupPage
            role="facility"
            apiUrl="/api/facility/mua-sam/tra-cuu"
            pageTitle="Tra cứu Mua sắm"
            pageDescription="Tra cứu toàn diện tiến trình mua sắm của từng gói thầu quy trình 1 của đơn vị."
        />
    );
}
