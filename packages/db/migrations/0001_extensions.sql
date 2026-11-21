-- Extensions required at runtime.
--
-- Init scripts install these on fresh Docker volumes, but CI, Testcontainers
-- and production databases may not have them, so the migration installs them
-- too. Migrations run as learnloop_owner (a non-superuser).
--
-- `pg_trgm` and `pgcrypto` are trusted extensions and create fine as the owner.
-- `vector` (pgvector) is NOT trusted and requires a superuser; the DO block
-- makes this statement a no-op (with a NOTICE) when the role lacks the
-- privilege, so the migration never fails. Ensure `vector` is pre-installed by
-- a superuser in those environments (the Docker init scripts already do this).
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'vector extension not created (insufficient privileges); ensure it is pre-installed by a superuser';
END $$;
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pgcrypto;
