#!/bin/bash
# Locks the databases down to the two-role model:
#
#   learnloop_owner -> owns the public schema, creates/migrates tables
#   learnloop_app   -> CONNECT + USAGE + DML on objects the owner creates
#
# learnloop_app can never CREATE or DROP tables, and can never bypass RLS.
set -euo pipefail

for db in learnloop learnloop_test; do
  echo "03-privileges: applying privileges in ${db}"
  psql -v ON_ERROR_STOP=1 \
    --username "$POSTGRES_USER" \
    --dbname "$db" \
    --set=dbname="$db" <<'EOSQL'
-- Migrations run as the schema owner, so it must own the public schema.
ALTER SCHEMA public OWNER TO learnloop_owner;

-- Postgres 15+ already removed CREATE from PUBLIC; revoke explicitly anyway.
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

-- No implicit access to the database for unrelated roles.
REVOKE ALL ON DATABASE :"dbname" FROM PUBLIC;
GRANT CONNECT ON DATABASE :"dbname" TO learnloop_app;

GRANT USAGE ON SCHEMA public TO learnloop_app;

-- Apply automatically to everything the owner creates in future migrations.
ALTER DEFAULT PRIVILEGES FOR ROLE learnloop_owner IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO learnloop_app;
ALTER DEFAULT PRIVILEGES FOR ROLE learnloop_owner IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO learnloop_app;
EOSQL
done
