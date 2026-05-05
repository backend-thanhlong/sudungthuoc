# Backup Runbook

This system backs up PostgreSQL from the Docker `db` service, encrypts the dump with `gpg`, and uploads it to a personal Google Drive through `rclone OAuth`.

## What Is Backed Up

- PostgreSQL database from the Docker `db` service.
- The dump format is PostgreSQL custom format, suitable for `pg_restore`.

The app currently parses uploaded Excel data into PostgreSQL. There is no separate upload volume in `docker-compose.yml` at the time this runbook was written.

## One-Time Google Drive Setup

Install required tools on the server:

```bash
sudo apt-get update
sudo apt-get install -y rclone gnupg
```

Create a personal Google Drive remote:

```bash
rclone config
```

Use these choices:

- New remote name: `gdrive`
- Storage type: Google Drive
- OAuth: browser login with the Google account that will own the backups
- Team drive: no, unless this is a shared drive

Confirm the remote works:

```bash
rclone lsd gdrive:
```

On this server, root's rclone config path is expected to be:

```text
/root/.rclone.conf
```

## Backup Configuration

Create the local backup env file:

```bash
cp scripts/backup/backup.env.example scripts/backup/backup.env
chmod 600 scripts/backup/backup.env
```

Edit:

```bash
nano scripts/backup/backup.env
```

Minimum required values:

```env
BACKUP_GDRIVE_REMOTE=gdrive:sudungthuoc-backups
BACKUP_ROOT=/opt/sudungthuoc/backups
BACKUP_ENCRYPTION_PASSPHRASE=use-a-long-random-passphrase
```

Do not commit `scripts/backup/backup.env`.

## Manual Backup

```bash
bash scripts/backup/postgres-backup.sh
```

Expected result:

- encrypted local file in `/opt/sudungthuoc/backups/postgres`
- encrypted remote file in `gdrive:sudungthuoc-backups/postgres`
- local log in `/opt/sudungthuoc/backups/logs`

## Verify Latest Backup

```bash
bash scripts/backup/verify-backup.sh --latest
```

This downloads the encrypted backup, decrypts it locally, and checks it with `pg_restore --list` inside the Docker PostgreSQL container.

## Restore Drill

By default restore goes to a scratch database, not production:

```bash
bash scripts/backup/postgres-restore.sh --latest --yes
```

Default target database:

```env
RESTORE_TARGET_DB=sudungthuoc_restore_check
```

To restore to another scratch database:

```bash
bash scripts/backup/postgres-restore.sh --latest --target-db sudungthuoc_restore_20260429 --yes
```

## Production Restore

Production restore is destructive. It drops and recreates the target database.

Use only during incident recovery:

```bash
bash scripts/backup/postgres-restore.sh --latest \
  --target-db sudungthuoc_db \
  --allow-production-restore \
  --yes
```

When restoring to production, the script stops the app service first and starts it again after restore if `RESTORE_STOP_APP=true`.

## Cron Example

Run daily at 01:30 server time:

```cron
30 1 * * * cd /opt/sudungthuoc/sudungthuoc && /usr/bin/bash scripts/backup/postgres-backup.sh >> /opt/sudungthuoc/backups/logs/cron.log 2>&1
```

Verify latest backup every Sunday at 03:00:

```cron
0 3 * * 0 cd /opt/sudungthuoc/sudungthuoc && /usr/bin/bash scripts/backup/verify-backup.sh --latest >> /opt/sudungthuoc/backups/logs/verify-cron.log 2>&1
```

## Safety Notes

- Keep `BACKUP_ENCRYPTION_PASSPHRASE` outside git.
- Store the passphrase in a password manager.
- A backup is not considered safe until `verify-backup.sh` succeeds.
- Test restore to a scratch database at least monthly.
- Keep Google Drive account recovery enabled and protected by MFA.
