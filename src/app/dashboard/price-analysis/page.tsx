import { redirect } from "next/navigation";
import PriceAnalysisPage from "@/components/price-analysis/PriceAnalysisPage";
import { requireActiveSessionUser } from "@/lib/server-authz";

export default async function DashboardPriceAnalysisRoutePage() {
    const { user } = await requireActiveSessionUser();

    if (user.role === "COMPANY") {
        redirect("/dashboard/company");
    }

    return <PriceAnalysisPage />;
}
