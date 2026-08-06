# Facility Report Bulk Insert Design

## Problem

The facility report submission route inserts each inventory row sequentially inside a Prisma interactive transaction. Large reports can exceed Prisma's five-second interactive transaction timeout and fail after validation has completed.

## Approved Design

- Convert validated report rows into one `createMany` payload.
- Save the submission record and inventory rows atomically with Prisma's sequential operations transaction API.
- Keep the existing timeout configuration unchanged because the interactive transaction callback is removed.
- Preserve the existing validation, report status, skipped-row behavior, and database schema.
- Log detailed database errors on the server but return only a safe Vietnamese message to the client.

## Edge Cases

- A report containing only skipped rows still creates its submission record without issuing an empty bulk insert.
- Unique or foreign-key failures prevent both the submission record and inventory rows from being committed.
- Validation errors continue to return the existing structured `400` response before any write begins.

## Validation

- Run ESLint for the modified route.
- Run TypeScript type checking for the project.
- Review the final diff to confirm no unrelated user changes were overwritten.
