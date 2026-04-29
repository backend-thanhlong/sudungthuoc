# Google Drive PostgreSQL Backup Design

## Context

The production stack runs PostgreSQL in Docker with a named volume `postgres_data`. Uploaded Excel data is parsed into PostgreSQL; there is no separate upload file volume in the current compose file. The backup system therefore focuses on PostgreSQL plus operational secrets stored outside git.

## Decision

Use `rclone` with personal Google Drive OAuth for offsite storage. The application should not handle backup uploads. Backup and restore must run as operational scripts outside the Next.js runtime.

## Backup Flow

1. Run `pg_dump` inside the Docker `db` service using custom format.
2. Verify the dump with `pg_restore --list`.
3. Encrypt the dump locally with `gpg` symmetric encryption.
4. Upload the encrypted file to `BACKUP_GDRIVE_REMOTE/postgres`.
5. Verify that the remote file exists.
6. Apply local and remote retention.

## Restore Flow

1. Download a selected backup or the latest backup from Google Drive.
2. Decrypt locally with the configured passphrase.
3. Verify with `pg_restore --list`.
4. Restore to a scratch database by default.
5. Require an explicit production flag before replacing the production database.

## Safety Rules

- Never commit `scripts/backup/backup.env`.
- Never upload unencrypted dumps.
- Use a long random passphrase stored outside git.
- Verify every backup before considering it usable.
- Test restore to a scratch database at least monthly.

## Files

- `scripts/backup/postgres-backup.sh`
- `scripts/backup/verify-backup.sh`
- `scripts/backup/postgres-restore.sh`
- `scripts/backup/backup.env.example`
- `docs/backup-runbook.md`
