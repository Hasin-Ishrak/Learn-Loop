#!/bin/bash
# Installs the extensions the application relies on in both databases.
#
# vector   - pgvector, provided by the pgvector/pgvector image
# pg_trgm  - trigram indexes for fuzzy text search
# pgcrypto - gen_random_uuid(), digest(), ...
set -euo pipefail

for db in learnloop learnloop_test; do
  echo "02-extensions: installing extensions in ${db}"
  psql -v ON_ERROR_STOP=1 \
    --username "$POSTGRES_USER" \
    --dbname "$db" <<'EOSQL'
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
EOSQL
done
