# Facility Demand Plan XNT History Modal

## Context

On `/dashboard/facility/lap-du-tru`, users create and edit facility demand plans. The current create/add-drug modal can show previous export quantities, but the user needs historical stock movement visible after a draft plan has been created so they can adjust `SL dự trù` while reviewing each line.

## Goal

Add a per-line action in the demand plan detail table that opens an XNT history modal for that drug. The modal shows the 6 most recent inventory report periods for the selected line.

## Recommended Approach

Use a compact row action button instead of adding more columns to the main plan table.

Trade-offs:

- Keeps the main table focused on editable planning fields.
- Lets users inspect a full XNT history only when needed.
- Avoids making the plan detail table too wide on smaller screens.
- Requires one lightweight history lookup when the user opens the modal.

## UI Design

Each demand plan line gets a small icon/text button labeled `XNT` or `Lịch sử XNT`. The button is available in both draft and finalized plan details because the history is read-only reference data.

Clicking the button opens a modal titled with the drug name and internal code. The modal displays up to 6 latest report periods, newest first.

The table uses grouped period columns:

|  | Kỳ 06/2026 |  |  |  | Kỳ 05/2026 |  |  |  |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
|  | Tồn đầu | Nhập | Xuất | Tồn cuối | Tồn đầu | Nhập | Xuất | Tồn cuối |

Implementation detail: each period header uses `colSpan={4}` above the four movement columns: `Tồn đầu`, `Nhập`, `Xuất`, `Tồn cuối`.

If no report history exists, the modal shows a small empty state instead of an empty table.

## Data Flow

Add a facility-scoped API endpoint for one line's map:

`GET /api/facility/lap-du-tru/history?mapId=<id>`

The endpoint:

- Requires an active `FACILITY` session.
- Verifies the `mapId` belongs to the current facility.
- Reads at most 6 latest `InventoryReport` rows for that map, using report statuses already accepted for demand planning history.
- Returns `reportMonth`, `tonDau`, `nhap`, `xuat`, and `tonCuoi` as numbers.

The frontend fetches history when a user opens the modal and shows loading/error states in the modal.

## Out Of Scope

- No schema change.
- No snapshotting XNT history into demand plan lines.
- No change to how `SL dự trù` is saved or finalized.
- No export Excel change unless requested separately.

## Testing

Manual verification:

- Open a draft demand plan and click `Lịch sử XNT` on a line.
- Confirm the modal shows at most 6 periods.
- Confirm each period header spans `Tồn đầu`, `Nhập`, `Xuất`, `Tồn cuối`.
- Confirm `SL dự trù` remains editable after closing the modal.
- Confirm a finalized plan can still view history but cannot edit `SL dự trù`.

Automated checks:

- Run TypeScript/lint checks used by the repo.
- Add endpoint-level tests only if the existing project test setup already covers API route helpers.
