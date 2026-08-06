#!/bin/sh
set -eu

AI_DB_USER="${AI_DB_USER:-ai_readonly}"
AI_DB_PASSWORD="${AI_DB_PASSWORD:-${APP_DB_PASSWORD:-}}"

required_vars="POSTGRES_DB POSTGRES_SUPERUSER POSTGRES_SUPERUSER_PASSWORD APP_DB_USER APP_DB_PASSWORD AI_DB_USER AI_DB_PASSWORD"

for var_name in $required_vars; do
  eval "var_value=\${$var_name:-}"
  if [ -z "$var_value" ]; then
    echo "Missing required environment variable: $var_name" >&2
    exit 1
  fi
done

case "$APP_DB_USER" in
  *[!A-Za-z0-9_]*|'')
    echo "APP_DB_USER must contain only letters, numbers, and underscores" >&2
    exit 1
    ;;
esac

case "$AI_DB_USER" in
  *[!A-Za-z0-9_]*|'')
    echo "AI_DB_USER must contain only letters, numbers, and underscores" >&2
    exit 1
    ;;
esac

export PGPASSWORD="$POSTGRES_SUPERUSER_PASSWORD"

psql \
  -h db \
  -U "$POSTGRES_SUPERUSER" \
  -d "$POSTGRES_DB" \
  -v ON_ERROR_STOP=1 \
  -v postgres_db="$POSTGRES_DB" \
  -v app_db_user="$APP_DB_USER" \
  -v app_db_password="$APP_DB_PASSWORD" \
  -v ai_db_user="$AI_DB_USER" \
  -v ai_db_password="$AI_DB_PASSWORD" <<'SQL'
SELECT format(
  'DO $block$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = %L) THEN CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION; ELSE ALTER ROLE %I WITH LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION; END IF; END $block$;',
  :'app_db_user',
  :'app_db_user',
  :'app_db_password',
  :'app_db_user',
  :'app_db_password'
) \gexec

SELECT format('GRANT CONNECT ON DATABASE %I TO %I;', :'postgres_db', :'app_db_user') \gexec
SELECT format('GRANT USAGE ON SCHEMA public TO %I;', :'app_db_user') \gexec
SELECT format('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO %I;', :'app_db_user') \gexec
SELECT format('GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO %I;', :'app_db_user') \gexec
SELECT format('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO %I;', :'app_db_user') \gexec
SELECT format('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO %I;', :'app_db_user') \gexec

SELECT format(
  'DO $block$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = %L) THEN CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION; ELSE ALTER ROLE %I WITH LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION; END IF; END $block$;',
  :'ai_db_user',
  :'ai_db_user',
  :'ai_db_password',
  :'ai_db_user',
  :'ai_db_password'
) \gexec

SELECT format('GRANT CONNECT ON DATABASE %I TO %I;', :'postgres_db', :'ai_db_user') \gexec
SELECT format('GRANT USAGE ON SCHEMA public TO %I;', :'ai_db_user') \gexec
SELECT format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I;', :'ai_db_user') \gexec
SELECT format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I;', :'ai_db_user') \gexec

SELECT format('GRANT SELECT ON TABLE %I TO %I;', c.relname, :'ai_db_user')
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind IN ('v', 'm')
  AND c.relname LIKE 'ai\_%' ESCAPE '\'
\gexec
SQL
