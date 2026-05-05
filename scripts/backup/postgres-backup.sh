#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKUP_ENV_FILE="${BACKUP_ENV_FILE:-$SCRIPT_DIR/backup.env}"

if [[ -f "$BACKUP_ENV_FILE" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$BACKUP_ENV_FILE"
    set +a
fi

COMPOSE_ENV_FILE="${COMPOSE_ENV_FILE:-.env.docker}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-sudungthuoc}"
DB_SERVICE="${DB_SERVICE:-db}"
BACKUP_ROOT="${BACKUP_ROOT:-/opt/sudungthuoc/backups}"
BACKUP_LOCAL_RETENTION_DAYS="${BACKUP_LOCAL_RETENTION_DAYS:-7}"
BACKUP_REMOTE_RETENTION_DAYS="${BACKUP_REMOTE_RETENTION_DAYS:-90}"
BACKUP_PREFIX="${BACKUP_PREFIX:-sudungthuoc_postgres}"
REMOTE_SUBDIR="${BACKUP_REMOTE_SUBDIR:-postgres}"

require_command() {
    if ! command -v "$1" >/dev/null 2>&1; then
        echo "Missing required command: $1" >&2
        exit 1
    fi
}

join_remote_path() {
    local base="${1%/}"
    local child="${2#/}"
    printf '%s/%s' "$base" "$child"
}

require_env() {
    local name="$1"
    if [[ -z "${!name:-}" ]]; then
        echo "Missing required environment variable: $name" >&2
        exit 1
    fi
}

require_command docker
require_command rclone
require_command gpg

require_env BACKUP_GDRIVE_REMOTE
require_env BACKUP_ENCRYPTION_PASSPHRASE

cd "$REPO_ROOT"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_dir="$BACKUP_ROOT/postgres"
log_dir="$BACKUP_ROOT/logs"
lock_dir="$BACKUP_ROOT/.postgres-backup.lock"
mkdir -p "$backup_dir" "$log_dir" "$BACKUP_ROOT"

if ! mkdir "$lock_dir" 2>/dev/null; then
    echo "Another PostgreSQL backup is already running: $lock_dir" >&2
    exit 1
fi

cleanup() {
    rm -rf "$lock_dir"
}
trap cleanup EXIT

base_name="${BACKUP_PREFIX}_${timestamp}"
dump_file="$backup_dir/${base_name}.dump"
encrypted_file="$backup_dir/${base_name}.dump.gpg"
passphrase_file="$(mktemp "$BACKUP_ROOT/.backup-passphrase.XXXXXX")"
remote_dir="$(join_remote_path "$BACKUP_GDRIVE_REMOTE" "$REMOTE_SUBDIR")"
log_file="$log_dir/${base_name}.log"

umask 077
printf '%s' "$BACKUP_ENCRYPTION_PASSPHRASE" > "$passphrase_file"

log() {
    printf '[%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" | tee -a "$log_file"
}

fail() {
    log "ERROR: $*"
    exit 1
}

trap 'rm -f "$passphrase_file"; cleanup' EXIT

log "Starting PostgreSQL backup"
log "Dump file: $dump_file"

docker compose --env-file "$COMPOSE_ENV_FILE" exec -T "$DB_SERVICE" \
    sh -lc 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-privileges' \
    > "$dump_file"

[[ -s "$dump_file" ]] || fail "Dump file is empty"

docker compose --env-file "$COMPOSE_ENV_FILE" exec -T "$DB_SERVICE" \
    pg_restore --list < "$dump_file" >/dev/null

log "Local dump verified with pg_restore --list"

gpg --batch --yes --symmetric --cipher-algo AES256 --pinentry-mode loopback \
    --passphrase-file "$passphrase_file" \
    --output "$encrypted_file" "$dump_file"

[[ -s "$encrypted_file" ]] || fail "Encrypted backup file is empty"
rm -f "$dump_file"

log "Uploading encrypted backup to $remote_dir"
rclone mkdir "$remote_dir"
rclone copyto "$encrypted_file" "$(join_remote_path "$remote_dir" "$(basename "$encrypted_file")")" --checksum

if ! rclone lsf "$remote_dir" --files-only | grep -Fx "$(basename "$encrypted_file")" >/dev/null; then
    fail "Remote backup file was not found after upload"
fi

log "Remote upload verified"

if [[ "$BACKUP_LOCAL_RETENTION_DAYS" =~ ^[0-9]+$ ]] && [[ "$BACKUP_LOCAL_RETENTION_DAYS" -gt 0 ]]; then
    find "$backup_dir" -type f -name "${BACKUP_PREFIX}_*.dump.gpg" -mtime +"$BACKUP_LOCAL_RETENTION_DAYS" -delete
fi

if [[ "$BACKUP_REMOTE_RETENTION_DAYS" =~ ^[0-9]+$ ]] && [[ "$BACKUP_REMOTE_RETENTION_DAYS" -gt 0 ]]; then
    log "Applying remote retention: ${BACKUP_REMOTE_RETENTION_DAYS} days"
    rclone delete "$remote_dir" \
        --min-age "${BACKUP_REMOTE_RETENTION_DAYS}d" \
        --include "${BACKUP_PREFIX}_*.dump.gpg"
fi

log "Backup completed: $(basename "$encrypted_file")"
