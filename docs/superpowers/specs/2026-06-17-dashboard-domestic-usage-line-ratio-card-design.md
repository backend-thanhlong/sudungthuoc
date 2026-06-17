# Design: Dashboard Domestic Usage Line Ratio Card

## Context

The `/dashboard/admin` overview tab already has a KPI card named `Tỷ lệ thuốc nội`. That card is calculated from export value:

`domestic export value / total export value`

The requested new card is different. It should measure the ratio of report lines with actual usage that are classified as domestic.

## Scope

Add one KPI card to the `/dashboard/admin` overview tab. The same `Tab1Overview` component is shared by facility dashboard usage, but the requested placement and wording target admin dashboard.

No database schema change is required.

## Metric Definition

Name:

`Tỷ lệ sử dụng thuốc Trong nước`

Formula:

`domesticUsageLineCount / classifiedUsageLineCount * 100`

Where:

- `domesticUsageLineCount`: number of inventory report lines where `xuat > 0` and `masterDrug.isTrongNuoc` is domestic.
- `classifiedUsageLineCount`: number of inventory report lines where `xuat > 0` and `masterDrug.isTrongNuoc` is either domestic or foreign.
- Lines without actual usage (`xuat <= 0`) are excluded.
- Lines without mapped `masterDrug` or without a domestic/foreign classification are excluded from the denominator.

Domestic classification accepts the existing domestic values:

- `Trong nước`
- legacy truthy values such as `có`, `co`, `true`, `1`

Foreign classification accepts:

- `Nước ngoài`

If `classifiedUsageLineCount` is `0`, the ratio is `0`.

## API Design

Update the dashboard overview API response `kpis` object with:

- `domesticUsageLineRatio`
- `domesticUsageLineCount`
- `classifiedUsageLineCount`

Calculate these values in the existing `allReports.forEach` loop in `src/app/api/admin/dashboard/overview/route.ts`.

The public overview route has parallel logic. Keep it aligned if the shared `Tab1Overview` interface requires the same KPI fields.

## UI Design

Update `src/components/dashboard/Tab1Overview.tsx`:

- extend `Kpis` with the new fields
- change the KPI grid from three columns to four columns on desktop
- insert the new card immediately after `Tỷ lệ thuốc nội`

Card text:

- title: `Tỷ lệ sử dụng thuốc Trong nước`
- value: formatted percent from `domesticUsageLineRatio`
- subtitle: `Theo số dòng sử dụng đã phân loại`

The existing `Tỷ lệ thuốc nội` card remains unchanged and continues to show the value-based ratio.

## Testing

Run:

```bash
npx tsc --noEmit
npm run lint
```

Manual check:

- `/dashboard/admin` shows the new card next to `Tỷ lệ thuốc nội`.
- The card changes when filters `reportMonth` or `facilityId` change.
- The value is based on report line counts with `xuat > 0`, not export quantity or export value.
