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
DB_SERVICE="${DB_SERVICE:-db}"
BACKUP_ROOT="${BACKUP_ROOT:-/opt/sudungthuoc/backups}"
BACKUP_PREFIX="${BACKUP_PREFIX:-sudungthuoc_postgres}"
REMOTE_SUBDIR="${BACKUP_REMOTE_SUBDIR:-postgres}"

usage() {
    cat <<'USAGE'
Usage:
  scripts/backup/verify-backup.sh --latest
  scripts/backup/verify-backup.sh <backup-file-name>

Verifies an encrypted Google Drive backup by downloading it, decrypting it,
and running pg_restore --list inside the PostgreSQL Docker container.
USAGE
}

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

require_command docker
require_command rclone
require_command gpg

if [[ -z "${BACKUP_GDRIVE_REMOTE:-}" || -z "${BACKUP_ENCRYPTION_PASSPHRASE:-}" ]]; then
    echo "BACKUP_GDRIVE_REMOTE and BACKUP_ENCRYPTION_PASSPHRASE are required" >&2
    exit 1
fi

if [[ $# -ne 1 ]]; then
    usage
    exit 1
fi

cd "$REPO_ROOT"
remote_dir="$(join_remote_path "$BACKUP_GDRIVE_REMOTE" "$REMOTE_SUBDIR")"
mkdir -p "$BACKUP_ROOT"
work_dir="$(mktemp -d "${BACKUP_ROOT:-/tmp}/verify-backup.XXXXXX")"
passphrase_file="$(mktemp "${BACKUP_ROOT:-/tmp}/verify-passphrase.XXXXXX")"
trap 'rm -rf "$work_dir" "$passphrase_file"' EXIT

umask 077
printf '%s' "$BACKUP_ENCRYPTION_PASSPHRASE" > "$passphrase_file"

if [[ "$1" == "--latest" ]]; then
    backup_name="$(rclone lsf "$remote_dir" --files-only --include "${BACKUP_PREFIX}_*.dump.gpg" | sort | tail -n 1)"
    if [[ -z "$backup_name" ]]; then
        echo "No backup found in $remote_dir" >&2
        exit 1
    fi
else
    backup_name="$1"
fi

encrypted_file="$work_dir/$backup_name"
dump_file="${encrypted_file%.gpg}"

echo "Downloading $backup_name from $remote_dir"
rclone copyto "$(join_remote_path "$remote_dir" "$backup_name")" "$encrypted_file"

gpg --batch --yes --decrypt --pinentry-mode loopback \
    --passphrase-file "$passphrase_file" \
    --output "$dump_file" "$encrypted_file"

docker compose --env-file "$COMPOSE_ENV_FILE" exec -T "$DB_SERVICE" \
    pg_restore --list < "$dump_file" >/dev/null

echo "Backup verified: $backup_name"
