# Local development infrastructure

Docker Compose stack for local development: **PostgreSQL 16 + pgvector**,
**Redis 7** and **Mailpit** (a local SMTP catcher / web UI for outgoing mail).
Everything binds to `127.0.0.1` only, so nothing is reachable from other
machines on your network.

The application itself is **not** part of this compose file. Run it on the host
with `pnpm dev` (see the root `AGENTS.md`).

---

## 1. First-time setup

```powershell
Copy-Item infra/.env.example infra/.env
```

`infra/.env` is gitignored. It holds **dev-only** passwords and must never be
committed or reused anywhere else.

Then start the stack:

```powershell
pnpm infra:up
```

`--wait` makes the command block until all three containers report `healthy`.

---

## 2. Commands

All commands are run from the repository root.

| Command | What it does |
|---|---|
| `pnpm infra:up` | Create/start the stack and wait until every service is healthy |
| `pnpm infra:down` | Stop and remove the containers (data volumes are kept) |
| `pnpm infra:reset` | **Destructive:** stop, remove containers *and* delete both named volumes (all database and Redis data is lost) |
| `pnpm infra:logs` | Follow logs from all services |
| `pnpm infra:ps` | Show container status and health |

Example output of `pnpm infra:ps`:

```
NAME                 IMAGE                      STATUS
learnloop-postgres   pgvector/pgvector:pg16     Up (healthy)
learnloop-redis      redis:7-alpine             Up (healthy)
learnloop-mailpit    axllent/mailpit            Up (healthy)
```

---

## 3. Endpoints

| Service | Address | Notes |
|---|---|---|
| PostgreSQL | `localhost:5432` | databases `learnloop`, `learnloop_test`, maintenance db `postgres` |
| Redis | `localhost:6379` | AOF persistence enabled (`--appendonly yes`) |
| Mailpit SMTP | `localhost:1025` | point the app's mailer here |
| Mailpit UI | <http://localhost:8025> | inspect/read captured mail |

Connection URLs (defaults from `infra/.env.example`):

```
# application / runtime role
postgresql://learnloop_app:learnloop_app_dev@localhost:5432/learnloop

# migrations / schema owner role
postgresql://learnloop_owner:learnloop_owner_dev@localhost:5432/learnloop

# tests
postgresql://learnloop_app:learnloop_app_dev@localhost:5432/learnloop_test

# redis
redis://localhost:6379
```

---

## 4. Connecting with `psql`

The container's local socket uses `trust` auth, so `docker exec` needs no
password:

```powershell
# as the runtime role
docker exec -it learnloop-postgres psql -U learnloop_app -d learnloop

# as the schema owner (migrations)
docker exec -it learnloop-postgres psql -U learnloop_owner -d learnloop

# the test database
docker exec -it learnloop-postgres psql -U learnloop_owner -d learnloop_test
```

Quick checks:

```powershell
docker exec learnloop-postgres psql -U learnloop_app -d learnloop -c "SELECT current_user, current_database();"
docker exec learnloop-postgres psql -U learnloop_owner -d learnloop -c "\dx"
docker exec learnloop-redis redis-cli ping
```

Connecting from the host as a non-superuser (for example `psql -h localhost -U
learnloop_app -d learnloop`) requires the role password from `infra/.env`.

---

## 5. Two roles, and why

| Role | Used by | Capabilities |
|---|---|---|
| `learnloop_owner` | migrations only | owns both databases and the `public` schema; creates/alters/drops tables |
| `learnloop_app` | the running server | `CONNECT` + `USAGE` on `public` + `SELECT/INSERT/UPDATE/DELETE` on tables and `USAGE/SELECT` on sequences; **cannot** `CREATE` or `DROP` |

Splitting the roles means the process that serves traffic can never change the
schema. A bug, an injection or a compromised runtime credential cannot drop
tables — the worst it can do is read/write rows it already has access to.

`ALTER DEFAULT PRIVILEGES` in `03-privileges.sh` makes every future table and
sequence created **by `learnloop_owner`** automatically usable by
`learnloop_app`, so migrations do not have to remember a `GRANT` after each
`CREATE TABLE`.

Notes:

- On PostgreSQL 15+, `public` no longer grants `CREATE` to everyone. We also
  explicitly `REVOKE CREATE ON SCHEMA public FROM PUBLIC`, and `public` is owned
  by `learnloop_owner` so migrations work.
- Anything created by a *different* role (e.g. the `postgres` superuser) does
  **not** inherit those default privileges. Migrations must connect as
  `learnloop_owner`.
- `learnloop_app` is created with `NOSUPERUSER NOBYPASSRLS NOCREATEDB
  NOCREATEROLE`, so row-level security cannot be bypassed.

---

## 6. Init scripts run only once

`infra/postgres/init/` is mounted at `/docker-entrypoint-initdb.d`. Postgres'
entrypoint executes those files **only when the data directory is empty**, i.e.
on the very first start of the volume. Editing a script afterwards has no
effect on an existing volume.

| Script | Purpose |
|---|---|
| `01-roles.sh` | creates `learnloop_owner`, `learnloop_app` and both databases; passwords come from container env vars |
| `02-extensions.sh` | `vector`, `pg_trgm`, `pgcrypto` in both databases |
| `03-privileges.sh` | schema ownership, `CONNECT`/`USAGE` grants, default privileges |

To re-run them (for example after editing a script):

```powershell
pnpm infra:reset   # DESTRUCTIVE: deletes all local database and Redis data
pnpm infra:up
```

The scripts use `set -euo pipefail` and `psql -v ON_ERROR_STOP=1`, so a failure
aborts the first startup instead of leaving a half-configured database. They
are stored with LF line endings (`*.sh text eol=lf` in `.gitattributes`) —
CRLF would produce `bad interpreter` errors inside the container.

---

## 7. Data

| Volume | Contents |
|---|---|
| `learnloop_pgdata` | Postgres data directory |
| `learnloop_redisdata` | Redis AOF/RDB files |

`pnpm infra:down` keeps both. `pnpm infra:reset` (`down -v`) deletes them.

---

## 8. Troubleshooting

- **Port already in use** — something else is on 5432, 6379, 1025 or 8025.
  Stop it (`docker ps`, or a local Postgres/Redis install) and retry.
- **Services never become healthy** — `pnpm infra:logs` shows why. A failed
  init script aborts Postgres startup on purpose; fix the script, then
  `pnpm infra:reset`.
- **Password authentication failed** — `infra/.env` changed after the volume was
  created. Passwords are baked in on first start, so `pnpm infra:reset` is
  required.
- **`permission denied for schema public` as the app role** — expected for DDL.
  Run schema changes as `learnloop_owner`.
