# Design: Dashboard Analysis Dropdown Attribute Charts

## Context

The `/dashboard/admin` analysis tab currently renders the `Thuốc kiểm soát đặc biệt` and `Kê đơn` donut charts from `usageOverview.bySpecialControl` and `usageOverview.byPrescription`.

The API route `src/app/api/admin/dashboard/analysis/route.ts` selects `masterDrug.isKeDon` and `masterDrug.kiemSoatDacBiet`, then passes the reports into `buildAbcAnalysis`. The current implementation collapses both fields into binary labels:

- `specialControl`: `Có KSĐB` / `Không KSĐB`
- `prescription`: `Kê đơn` / `Không kê đơn`

The requested behavior is to show the concrete dropdown values stored in `master-drugs`, not a true/false-style grouping.

## Scope

Update the analysis chart grouping only. The existing API response shape remains the same:

- `usageOverview.bySpecialControl`
- `usageOverview.byPrescription`
- `facilityComparison[].dimensions.specialControl`
- `facilityComparison[].dimensions.prescription`

No database schema change, route change, or UI layout change is required.

## Data Rules

### Thuốc kiểm soát đặc biệt

Use the concrete value from `masterDrug.kiemSoatDacBiet` when it matches one of the configured special-control dropdown options:

- `Thuốc gây nghiện`
- `Thuốc hướng thần`
- `Thuốc tiền chất`
- `Thuốc dạng phối hợp có chứa dược chất gây nghiện`
- `Thuốc dạng phối hợp có chứa dược chất hướng thần`
- `Thuốc dạng phối hợp có chứa tiền chất`
- `Thuốc thuộc danh mục chất bị cấm sử dụng trong một số ngành, lĩnh vực`

When the field is empty or equivalent to no special control, group it under:

- `Không phải thuốc kiểm soát đặc biệt`

Legacy truthy values such as `true`, `1`, `x`, or `có` should not become a chart label. They should fall back to the existing binary meaning only if needed, using a clear label such as `Có KSĐB` to avoid losing old imported data.

### Kê đơn

Use the concrete value from `masterDrug.isKeDon` when it matches the configured prescription dropdown options:

- `Thuốc kê đơn`
- `Thuốc không kê đơn`

When the field is empty or cannot be interpreted, group it under:

- `Chưa phân loại kê đơn`

Legacy values should still be interpreted for compatibility:

- truthy values map to `Thuốc kê đơn`
- falsey values map to `Thuốc không kê đơn`

## Implementation Design

Add small label helpers in `src/lib/dashboard/abc-analysis.ts` near the existing flag helpers:

- `getSpecialControlUsageLabel(value)`
- `getPrescriptionUsageLabel(value)`

These helpers should be used only for usage overview dimensions. Existing boolean helpers `isSpecialControlDrug` and `isPrescriptionDrug` should remain available for filters, badges, and monitoring lists that still need yes/no semantics.

`getUsageDimensions` will change from binary keys to label-based keys:

- `specialControl.key = getUsageDimensionKey("specialControl", specialControlLabel)`
- `prescription.key = getUsageDimensionKey("prescription", prescriptionLabel)`

This keeps keys stable and consistent with the existing dynamic dimensions while allowing more than two slices.

## UI Design

Keep the existing `UsageDonutChart` components and their positions:

- `Thuốc kiểm soát đặc biệt`
- `Kê đơn`

The charts will automatically render the new labels through `overview.bySpecialControl` and `overview.byPrescription`. Tooltip, legend, percentage, value, quantity, and drug count behavior stay unchanged.

The admin comparison chart already reads `facilityComparison[].dimensions[dimension]`, so its `KSĐB` and `Kê đơn` stacked bars will also reflect the concrete dropdown values without a separate UI change.

## Testing

Verification should cover:

- KSĐB chart includes `Không phải thuốc kiểm soát đặc biệt` for empty/non-special-control records.
- KSĐB chart creates separate slices for configured dropdown values.
- Kê đơn chart creates separate slices for `Thuốc kê đơn` and `Thuốc không kê đơn`.
- Empty prescription values group under `Chưa phân loại kê đơn`.
- Existing filters and badges relying on `isSpecialControlDrug` and `isPrescriptionDrug` still work.

Run:

```bash
npx tsc --noEmit
npm run lint
```

If adding focused tests is practical in the current repo setup, cover the new helper behavior around `buildAbcAnalysis`.
