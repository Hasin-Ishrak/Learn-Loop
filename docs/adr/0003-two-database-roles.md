# ADR 0003 — Two database roles (app vs. owner)

## Context

LearnLoop needs to enforce row-level security (RLS) in Postgres. RLS policies
are bypassed by superusers and by roles with `BYPASSRLS`. If the application
connected as a superuser, every RLS policy would be silently ignored, defeating
the purpose of having them. At the same time, schema changes (migrations) must
be able to create and alter tables, which the runtime role must never do.

## Decision

Use two non-superuser application roles:

- `learnloop_owner` — owns both databases and schema `public`; runs all
  migrations (DDL). Not used by the running server.
- `learnloop_app` — runtime role: `NOSUPERUSER NOBYPASSRLS NOCREATEDB
  NOCREATEROLE`, granted `CONNECT`, `USAGE` on `public`, and DML on objects the
  owner creates (via `ALTER DEFAULT PRIVILEGES`).

Connection strings:

- Server (`DATABASE_URL`): `learnloop_app`.
- Migrations / drizzle-kit (`DATABASE_MIGRATION_URL`): `learnloop_owner`.

The bootstrap `postgres` superuser is used only by init scripts and tooling.

## Consequences

- The runtime can never change the schema or bypass RLS, even if compromised.
- Migrations must connect as `learnloop_owner`, never as the app role, and must
  never be edited after they are committed.
- `learnloop_owner` is not a superuser, so untrusted extensions (e.g.
  `vector`/pgvector) cannot be created by migrations; they must be pre-installed
  by a superuser (the Docker init scripts do this). Trusted extensions
  (`pg_trgm`, `pgcrypto`) create fine as the owner.
- Default privileges are scoped `FOR ROLE learnloop_owner`: objects created by
  any other role do not inherit the grants.
- `apps/server` depends on `@learnloop/db` and only the API imports
  `DatabaseModule`; worker and scheduler do not connect yet.
