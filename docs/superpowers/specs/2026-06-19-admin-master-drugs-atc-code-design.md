# Design: Admin Master Drugs ATC Code Column

## Context

The `/dashboard/admin/master-drugs` page currently stores and displays `Mã BHYT` through the `maBhyt` field on `MasterDrug`. The user wants to add `Mã ATC` as a new persisted field with the same operational coverage as `Mã BHYT`: table display, create/edit form, import, export, search, and filtering.

The current `MasterDrug` model does not have an ATC field. This feature therefore needs a database schema change, not only a table configuration change.

## Scope

Add `Mã ATC` to the admin master-drugs workflow:

- Persist nullable `maAtc` on `MasterDrug`.
- Show a default-visible `Mã ATC` column immediately before `Mã BHYT`.
- Allow text filtering by `Mã ATC`.
- Include `Mã ATC` in global search and the search-field dropdown.
- Add `Mã ATC` to the create/edit form.
- Support `Mã ATC` in Excel import.
- Include `Mã ATC` in relevant Excel export output before `Mã BHYT`.

Out of scope:

- ATC dictionary lookup or validation against an external standard.
- Unique constraint on `maAtc`.
- Backfilling existing drugs.
- Public or facility-facing screens unless they already consume the full `MasterDrug` object and display columns from this admin table configuration.

## Data Model

Add a nullable string field to `MasterDrug`:

```prisma
maAtc String? @map("ma_atc")
```

No unique index is added. ATC codes classify drug substances/groups and can apply to multiple master-drug records.

Migration SQL should add a nullable text column:

```sql
ALTER TABLE "master_drugs" ADD COLUMN "ma_atc" TEXT;
```

After migration, regenerate Prisma client so API and TypeScript types include `maAtc`.

## API Design

Update `src/app/api/admin/master-drugs/route.ts`:

- Add `maAtc` to `MASTER_DRUG_OPTIONAL_STRING_FIELDS`.
- Add `maAtc` to `MASTER_DRUG_SEARCHABLE_FIELDS`.
- Add `maAtc` to `MASTER_DRUG_TEXT_FILTER_FIELDS`.
- Include `maAtc` in the `ALL` search `OR` clause.
- POST should trim `maAtc` and persist empty strings as `null`, using the same optional string handling as `maBhyt`.

Update `src/app/api/admin/master-drugs/[id]/route.ts`:

- Add `maAtc` to optional string update handling.
- PATCH should trim `maAtc` and persist empty strings as `null`.

Update `src/app/api/admin/master-drugs/import/route.ts`:

- Persist `drug.maAtc` when creating imported master-drug records.

Update `src/app/api/admin/master-drugs/export-mapped/route.ts`:

- Export `"Mã ATC": drug.maAtc || ""` immediately before `"Mã BHYT"`.

## UI Design

Update `src/components/master-drugs/master-drugs-config.ts`:

- Add `maAtc: string | null` to `MasterDrug`.
- Insert `{ id: "maAtc", label: "Mã ATC", required: false, defaultVisible: true }` before `maBhyt`.
- Add `maAtc` to `COLUMN_FILTER_FIELDS`.
- Map `maAtc` in `COLUMN_FILTER_KEY_BY_COLUMN_ID`.
- Initialize `maAtc: ""` in `createEmptyColumnFilters`.

Update `src/components/master-drugs/MasterDrugsTable.tsx`:

- Render `Mã ATC` header before `Mã BHYT`.
- Render a text filter input bound to `columnFiltersDraft.maAtc`.
- Render row cell `drug.maAtc` before `drug.maBhyt`.
- Use the same compact code styling as `Mã BHYT`.

Update `src/app/dashboard/admin/master-drugs/page.tsx`:

- Add `maAtc` to `INITIAL_FORM_DATA`.
- Include `maAtc` when opening an existing drug for edit.
- Add an input labeled `Mã ATC` in the basic information section before `Mã BHYT`.
- Include `maAtc` in submit payload through the existing `formData` flow.
- Map Excel headers `Mã ATC`, `maAtc`, and `MaATC` during import.
- Add `Mã ATC` to the search-field dropdown before `Mã BHYT`.

## Data Flow

Create/edit:

1. Admin enters `Mã ATC` in the form.
2. `formData.maAtc` is submitted to POST or PATCH.
3. API trims and stores it as `master_drugs.ma_atc`, or `null` when blank.
4. GET returns `maAtc` with each `MasterDrug`.
5. Table renders the value before `Mã BHYT`.

Import:

1. Client reads Excel rows.
2. Header mapping extracts `Mã ATC`, `maAtc`, or `MaATC`.
3. Import API stores `maAtc`.

Export:

1. Export query reads `maAtc`.
2. Excel output places `Mã ATC` before `Mã BHYT`.

Filtering/search:

1. Column filter sends `maAtc=<value>`.
2. API applies case-insensitive `contains`.
3. Global search also checks `maAtc`.
4. Search field `Mã ATC` searches only `maAtc`.

## Error Handling

No ATC-specific validation is introduced. Invalid database writes follow existing API error handling.

Blank values are normalized to `null`, matching optional string fields such as `maBhyt`.

Import keeps current row-level behavior. A row with blank `Mã ATC` remains valid when required fields `Mã chung` and `Tên thuốc` are present.

## Testing

Run automated checks:

```bash
npx prisma migrate dev
npx prisma generate
npx tsc --noEmit
npm run lint
```

Manual checks:

- `/dashboard/admin/master-drugs` shows `Mã ATC` before `Mã BHYT`.
- `Mã ATC` can be hidden and shown from `Hiển thị`.
- Column filter for `Mã ATC` returns matching drugs.
- Global search finds a drug by ATC code.
- Search field `Mã ATC` finds a drug by ATC code.
- Create a drug with `Mã ATC`; reload and verify the value persists.
- Edit `Mã ATC`; reload and verify the value persists.
- Clear `Mã ATC`; reload and verify it displays as empty.
- Import an Excel row with `Mã ATC`; verify the value appears in the table.
- Export mapped master drugs; verify `Mã ATC` appears before `Mã BHYT`.

## Implementation Notes

The table already uses centralized column configuration, column filter state, and explicit render blocks. The implementation should follow that structure rather than introducing a generic renderer.

The current form is a large single page component. Keep changes local and avoid unrelated form refactors.

The generated Prisma client is already present in the repo. If the migration workflow updates generated files, commit those with the implementation plan, not with this design spec.

## Self Review

The design has no placeholder sections. The scope is focused on `Mã ATC` as a persisted master-drug field. Data model, API, UI, import/export, and tests all use the same field name `maAtc` and database column `ma_atc`.
