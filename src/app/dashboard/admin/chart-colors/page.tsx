import ChartColorSettingsClient from "./ChartColorSettingsClient";

interface ChartColorSettingsPageProps {
    searchParams?: Promise<{
        chartId?: string;
    }>;
}

export default async function ChartColorSettingsPage({ searchParams }: ChartColorSettingsPageProps) {
    const params = await searchParams;

    return <ChartColorSettingsClient initialChartId={params?.chartId} />;
}
