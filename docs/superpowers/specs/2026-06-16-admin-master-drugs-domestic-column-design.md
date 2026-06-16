# Design: Admin Master Drugs Domestic Column

## Context

The `/dashboard/admin/master-drugs` table already has `isTrongNuoc` in the master drug data model and edit form. The table configuration currently shows columns through `TABLE_COLUMNS`, but it does not expose `Trong nước` in the grid.

The user wants a new `Trong nước` column immediately after `Đơn vị tính`, with filtering behavior like the existing table columns.

## Scope

Add the column to the existing master-drugs table system:

- default visible column
- visible in the `Hiển thị` column menu
- filterable from the table filter row
- rendered in each table row after `Đơn vị tính`

No database schema change is required.

## Data Flow

The API already returns `isTrongNuoc` as part of `MasterDrug`. Add an exact-match query filter for `isTrongNuoc` in `src/app/api/admin/master-drugs/route.ts`.

Accepted filter values are the dropdown values already used by the form:

- `Trong nước`
- `Nước ngoài`

Empty filter means no constraint.

## UI Design

In `src/components/master-drugs/master-drugs-config.ts`:

- add `{ id: "isTrongNuoc", label: "Trong nước", required: false, defaultVisible: true }` after `donViTinh`
- include `isTrongNuoc` in column filter state and column-to-filter mapping

In `src/components/master-drugs/MasterDrugsTable.tsx`:

- add the header after `Đơn vị tính`
- add a filter dropdown with `Tất cả`, `Trong nước`, and `Nước ngoài`
- add the row cell after `donViTinh`

The column does not need wrapping controls because the values are short.

## Testing

Run:

```bash
npx tsc --noEmit
npm run lint
```

Manual check:

- `/dashboard/admin/master-drugs` shows `Trong nước` after `Đơn vị tính`
- the column can be hidden/shown from `Hiển thị`
- the filter dropdown filters `Trong nước` and `Nước ngoài`
