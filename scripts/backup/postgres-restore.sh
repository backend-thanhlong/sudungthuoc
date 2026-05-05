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
APP_SERVICE="${APP_SERVICE:-app}"
BACKUP_ROOT="${BACKUP_ROOT:-/opt/sudungthuoc/backups}"
BACKUP_PREFIX="${BACKUP_PREFIX:-sudungthuoc_postgres}"
REMOTE_SUBDIR="${BACKUP_REMOTE_SUBDIR:-postgres}"
RESTORE_TARGET_DB="${RESTORE_TARGET_DB:-sudungthuoc_restore_check}"
RESTORE_STOP_APP="${RESTORE_STOP_APP:-true}"

usage() {
    cat <<'USAGE'
Usage:
  scripts/backup/postgres-restore.sh --latest --yes
  scripts/backup/postgres-restore.sh <backup-file-name> --yes

Options:
  --target-db NAME                 Restore into NAME. Default: RESTORE_TARGET_DB.
  --allow-production-restore       Required when target DB equals POSTGRES_DB.
  --yes                            Required to actually restore.

By default this restores into a scratch database, not production.
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

backup_arg=""
confirmed=false
allow_production_restore=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        --latest)
            backup_arg="--latest"
            shift
            ;;
        --target-db)
            RESTORE_TARGET_DB="${2:-}"
            shift 2
            ;;
        --allow-production-restore)
            allow_production_restore=true
            shift
            ;;
        --yes)
            confirmed=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            if [[ -z "$backup_arg" ]]; then
                backup_arg="$1"
                shift
            else
                usage
                exit 1
            fi
            ;;
    esac
done

if [[ -z "$backup_arg" || "$confirmed" != "true" ]]; then
    usage
    exit 1
fi

require_command docker
require_command rclone
require_command gpg

if [[ -z "${BACKUP_GDRIVE_REMOTE:-}" || -z "${BACKUP_ENCRYPTION_PASSPHRASE:-}" ]]; then
    echo "BACKUP_GDRIVE_REMOTE and BACKUP_ENCRYPTION_PASSPHRASE are required" >&2
    exit 1
fi

cd "$REPO_ROOT"
remote_dir="$(join_remote_path "$BACKUP_GDRIVE_REMOTE" "$REMOTE_SUBDIR")"
mkdir -p "$BACKUP_ROOT"
work_dir="$(mktemp -d "${BACKUP_ROOT:-/tmp}/restore-backup.XXXXXX")"
passphrase_file="$(mktemp "${BACKUP_ROOT:-/tmp}/restore-passphrase.XXXXXX")"
trap 'rm -rf "$work_dir" "$passphrase_file"' EXIT

umask 077
printf '%s' "$BACKUP_ENCRYPTION_PASSPHRASE" > "$passphrase_file"

if [[ "$backup_arg" == "--latest" ]]; then
    backup_name="$(rclone lsf "$remote_dir" --files-only --include "${BACKUP_PREFIX}_*.dump.gpg" | sort | tail -n 1)"
    if [[ -z "$backup_name" ]]; then
        echo "No backup found in $remote_dir" >&2
        exit 1
    fi
else
    backup_name="$backup_arg"
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

production_db="$(docker compose --env-file "$COMPOSE_ENV_FILE" exec -T "$DB_SERVICE" sh -lc 'printf "%s" "$POSTGRES_DB"')"
if [[ "$RESTORE_TARGET_DB" == "$production_db" && "$allow_production_restore" != "true" ]]; then
    echo "Refusing to restore into production DB '$production_db' without --allow-production-restore" >&2
    exit 1
fi

if [[ "$RESTORE_TARGET_DB" == "$production_db" && "$RESTORE_STOP_APP" == "true" ]]; then
    docker compose --env-file "$COMPOSE_ENV_FILE" stop "$APP_SERVICE"
fi

docker compose --env-file "$COMPOSE_ENV_FILE" exec -T \
    -e RESTORE_TARGET_DB="$RESTORE_TARGET_DB" "$DB_SERVICE" \
    sh -lc 'dropdb -U "$POSTGRES_USER" --if-exists "$RESTORE_TARGET_DB" && createdb -U "$POSTGRES_USER" "$RESTORE_TARGET_DB"'

docker compose --env-file "$COMPOSE_ENV_FILE" exec -T \
    -e RESTORE_TARGET_DB="$RESTORE_TARGET_DB" "$DB_SERVICE" \
    sh -lc 'pg_restore -U "$POSTGRES_USER" -d "$RESTORE_TARGET_DB" --no-owner --no-privileges' \
    < "$dump_file"

if [[ "$RESTORE_TARGET_DB" == "$production_db" && "$RESTORE_STOP_APP" == "true" ]]; then
    docker compose --env-file "$COMPOSE_ENV_FILE" up -d "$APP_SERVICE"
fi

echo "Restore completed into database: $RESTORE_TARGET_DB"
