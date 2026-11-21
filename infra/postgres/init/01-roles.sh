#!/bin/bash
# Creates the two application roles and both databases.
#
# Runs as the bootstrap superuser (POSTGRES_USER) against POSTGRES_DB, only when
# the Postgres data directory is empty. Passwords are passed to psql as
# variables and rendered with format(%L), so no password is hardcoded here.
set -euo pipefail

: "${LEARNLOOP_OWNER_PASSWORD:?LEARNLOOP_OWNER_PASSWORD must be set}"
: "${LEARNLOOP_APP_PASSWORD:?LEARNLOOP_APP_PASSWORD must be set}"

psql -v ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  --set=owner_password="$LEARNLOOP_OWNER_PASSWORD" \
  --set=app_password="$LEARNLOOP_APP_PASSWORD" <<'EOSQL'
-- learnloop_owner: owns schema objects, runs migrations.
SELECT format('CREATE ROLE learnloop_owner LOGIN PASSWORD %L', :'owner_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'learnloop_owner')\gexec

-- learnloop_app: runtime role, deliberately unprivileged.
SELECT format(
  'CREATE ROLE learnloop_app LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE PASSWORD %L',
  :'app_password'
)
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'learnloop_app')\gexec

SELECT 'CREATE DATABASE learnloop OWNER learnloop_owner'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'learnloop')\gexec

SELECT 'CREATE DATABASE learnloop_test OWNER learnloop_owner'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'learnloop_test')\gexec
EOSQL
