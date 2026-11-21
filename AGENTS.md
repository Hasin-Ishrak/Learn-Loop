# LearnLoop — Agent Handoff & Project State

> **Living document.** Read this before exploring the repository.
> Every agent that changes the project must update this file before finishing:
>
> 1. Refresh **Current status** and the **File map** if structure changed.
> 2. Append a dated entry to **Session log** describing what changed and what was verified.
> 3. Do not remove history from the session log unless the user asks.
>
> Last updated: **2026-11-21**

---

## 1. What this repository is

LearnLoop is a pnpm + Turborepo monorepo. This document currently describes the
**backend scaffold** only; most product features are not implemented yet.

| Workspace | Purpose | Status |
|---|---|---|
| `apps/server` | NestJS modular monolith with API, worker, scheduler entry points | Implemented (scaffold) |
| `apps/web` | Web frontend | Empty shell |
| `packages/shared` | Zod schemas + shared types (ESM, `tsc` → `dist/`) | Health schemas only |
| `packages/config` | Shared TypeScript configs | Base + Node/Nest config |
| `packages/db` | Database package | Empty shell |
| `infra` | Local Docker Compose: Postgres 16 + pgvector, Redis 7, Mailpit | Implemented |

Node target: **22**. Local Windows machine used for verification ran Node
**24.11.0**; everything used is available in Node 22 (notably
`process.loadEnvFile`, added in Node 20.12).

---

## 2. Current status

### Done

- `@learnloop/server` package: ESM, NodeNext, decorators enabled, `dist/` output.
- Three entry points:
  - `src/main.api.ts` → HTTP API on `API_PORT` (default 3000)
  - `src/main.worker.ts` → worker application context
  - `src/main.scheduler.ts` → scheduler application context
- Health endpoints: `GET /health/live`, `GET /health/ready`.
- Zod env schema + fail-fast loader; `.env.example`; Node's built-in `.env` loading.
- Typed global `ConfigService` (`AppConfigModule`), no `@nestjs/config`.
- pino logging via `nestjs-pino`: pretty in development, JSON in production.
- Correlation ID: reuse incoming `x-request-id`, else UUID; response header; log field;
  stored in CLS (`nestjs-cls`) under `correlationId`.
- Redaction of `authorization` and `cookie` headers in logs.
- Unit tests for env parsing, e2e test for `/health/live` (Vitest + supertest).
- Dockerfile for a production image (all three entry points share one image).
- Local infrastructure stack in `infra/`: Postgres 16 + pgvector, Redis 7
  (AOF), Mailpit, with a two-role Postgres model and init scripts.
- `@learnloop/db` package: Drizzle ORM + pg, schema (`institutions` placeholder),
  `createDb`, migrations (`0000` + custom `0001_extensions`), `db:check`.
- NestJS API connected to Postgres as `learnloop_app` via `DatabaseModule`;
  `/health/ready` runs a real `SELECT 1` with a 2s timeout, returns 503 on
  failure; `/health/live` stays independent. Worker and scheduler do not connect.
- Drizzle migrations run as `learnloop_owner` (`DATABASE_MIGRATION_URL`).
- ADR 0003 documenting the two-role model.
- All checks (`build`, `typecheck`, `lint`, `test`) pass.

### Not done yet

- No database/ORM code. `packages/db` is still empty.
- `/health/ready` returns `not_configured` placeholders; no real DB/Redis probes.
- No worker processors or scheduled jobs.
- No feature modules beyond health.
- No web app.
- `packages/db` is scaffolded with a throwaway `institutions` table only; no
  real domain schema yet.
- `/health/ready` checks Postgres only; Redis check is still `not_configured`.
- Worker and scheduler do not connect to the database yet.
- `infra/docker-compose.yml` contains infrastructure only; the app image
  (`apps/server/Dockerfile`) is not part of that compose file.

---

## 3. Server architecture

```
apps/server/src/
  main.api.ts              creates Nest HTTP app, pino logger, shutdown hooks
  main.worker.ts           Nest application context, logs "worker started"
  main.scheduler.ts        Nest application context, logs "scheduler started"
  app.module.ts            API root: Config, Logger, CLS, Health
  worker.module.ts         Config + Logger
  scheduler.module.ts      Config + Logger
  common/
    config/env.ts          Zod schema + parseEnv() + loadEnv()
    config/config.module.ts  @Global module exposing typed ConfigService
    logging/logger.module.ts nestjs-pino config
    logging/correlation-id.ts request ID helpers shared by pino + CLS
    context/context.module.ts  global ClsModule setup
  modules/
    health/health.module.ts
    health/health.controller.ts
    health/health.service.ts
```

Boot order:

1. `main.*` calls `loadEnv()`.
2. `loadEnv()` loads `.env` (if present), parses `process.env` with Zod, and
   `process.exit(1)` with a readable problem list on failure.
3. The validated `Env` object is passed explicitly to
   `AppModule.forRoot(env)` / `WorkerModule.forRoot(env)` /
   `SchedulerModule.forRoot(env)`.

Why explicit `forRoot(env)`: env validation must happen **before** Nest is
constructed, and e2e tests can inject a test env without touching `process.env`.

### Entry point behaviour

- **API**: `NestFactory.create`, `bufferLogs: true`, `app.useLogger(app.get(Logger))`,
  `app.enableShutdownHooks()`, listens on `env.API_PORT`.
- **Worker / scheduler**: `NestFactory.createApplicationContext`,
  `enableShutdownHooks()`, logs the started message.
  They also run `setInterval(() => {}, 60_000)` to keep the Node event loop alive.
  Without it, an application context exits immediately because it has no HTTP
  listener. Keep this unless a real consumer (queue/job loop) keeps the process alive.

### Health

- `GET /health/live` → `200 {"status":"ok"}`
- `GET /health/ready` →
  `200 {"status":"ok","checks":{"database":"not_configured","redis":"not_configured"}}`
- Responses are built and validated through `HealthResponseSchema` from
  `@learnloop/shared`. Replace the placeholder check methods in `HealthService`
  with real probes later; keep the response shape stable.

---

## 4. Local development quickstart

```powershell
Copy-Item infra/.env.example infra/.env               # first time only (dev credentials)
Copy-Item apps/server/.env.example apps/server/.env   # first time only
pnpm install
pnpm infra:up        # Postgres + Redis + Mailpit, waits until healthy
pnpm build
pnpm dev
```

`pnpm dev` (root) runs Turbo, which runs `apps/server` `dev` concurrently:
API + worker + scheduler. Stop with Ctrl+C.

The API does not connect to Postgres/Redis yet, so `pnpm dev` works without
`pnpm infra:up`; the next phase will make it mandatory.

Single process:

```powershell
pnpm --filter @learnloop/server dev:api
pnpm --filter @learnloop/server dev:worker
pnpm --filter @learnloop/server dev:scheduler
```

Check the API:

```powershell
curl.exe -i http://localhost:3000/health/live
```

Expected: `200`, body `{"status":"ok"}`, and an `x-request-id` response header.

An `.env` exists locally on the current machine but is gitignored and must never
be committed.

---

## 5. Environment variables

Schema is in `apps/server/src/common/config/env.ts`.

| Variable | Required | Default | Notes |
|---|---|---|---|
| `NODE_ENV` | no | `development` | `development` \| `test` \| `production` |
| `API_PORT` | no | `3000` | coerced to int, 1–65535 |
| `LOG_LEVEL` | no | `info` | pino levels incl. `silent` |
| `DATABASE_URL` | **yes** | — | must be a valid URL |
| `REDIS_URL` | **yes** | — | must be a valid URL |

`DATABASE_URL` and `REDIS_URL` are currently **not used for connections**, but
they are required by the schema. This makes missing configuration fail early.
When real checks are added, they will start using these URLs.

Invalid/missing config prints a list like:

```
Invalid environment variables:
  - DATABASE_URL: Required

See apps/server/.env.example for the full list of variables.
```

and exits with code `1` before Nest starts.

`DATABASE_URL` uses the least-privilege runtime role `learnloop_app`.
`apps/server/.env.example` also documents a **commented**
`DATABASE_MIGRATION_URL` for the schema owner `learnloop_owner`; it is
intentionally **not** part of the Zod schema yet (that lands with
`packages/db` migrations).

### `infra/.env`

The compose stack reads its own file, `infra/.env` (gitignored, copy from
`infra/.env.example`):

| Variable | Purpose |
|---|---|
| `POSTGRES_PASSWORD` | bootstrap superuser `postgres` password (init scripts + tooling only) |
| `POSTGRES_DB` | maintenance database, default `postgres` |
| `LEARNLOOP_OWNER_PASSWORD` | password for `learnloop_owner` (migrations / DDL) |
| `LEARNLOOP_APP_PASSWORD` | password for `learnloop_app` (runtime, least privilege) |

Passwords in `apps/server/.env.example` must stay in sync with
`infra/.env.example`; the two files are the source of truth for local
credentials. `infra/.env` itself is dev-only and never committed.

---

## 6. Scripts

Root `package.json` (Turborepo):

| Command | Action |
|---|---|
| `pnpm dev` | Runs `dev` in workspaces that define it (currently server) |
| `pnpm build` | Turbo `build`, dependency-aware (`^build`) |
| `pnpm lint` | Turbo `lint` |
| `pnpm test` | Turbo `test` (depends on `^build`) |
| `pnpm infra:up` | Start local infra (Postgres/Redis/Mailpit) and wait for health |
| `pnpm infra:down` | Stop/remove containers, keep volumes |
| `pnpm infra:reset` | **Destructive:** `down -v`, deletes DB/Redis data |
| `pnpm infra:logs` | Follow logs from all infra services |
| `pnpm infra:ps` | Show infra container status/health |
| `pnpm db:migrate` | Run Drizzle migrations as `learnloop_owner` |
| `pnpm db:generate` | Generate a new Drizzle migration from the schema |

All `infra:*` and `db:*` scripts must be run from the repository root.
`packages/db` also has: `db:generate:custom`, `db:studio`, `db:check`,
`build`, `typecheck`.

`apps/server/package.json`:

| Command | Action |
|---|---|
| `build` | Builds `@learnloop/shared`, then `tsc -p tsconfig.build.json` |
| `typecheck` | `tsc -p tsconfig.json --noEmit` (includes tests) |
| `lint` | `eslint src` |
| `test` | `vitest run` |
| `dev:api` / `dev:worker` / `dev:scheduler` | `nest start --watch --entryFile main.*` |
| `dev` | `concurrently` all three dev scripts |
| `start:api` / `start:worker` / `start:scheduler` | `node --enable-source-maps dist/main.*.js` |

`build` builds shared first so the exact command
`pnpm --filter @learnloop/server build` works from a clean checkout.

---

## 7. Docker

### App image

The Dockerfile is `apps/server/Dockerfile`. It is a multi-stage build:
install workspace → build server → `pnpm deploy --prod` → small Node 22 Alpine
runtime. The `.dockerignore` at the repo root excludes `node_modules`, `dist`,
`.env`, `.git`, etc.

Build from the repository root:

```powershell
docker build -f apps/server/Dockerfile -t learnloop-server .
```

Run the API:

```powershell
docker run --rm -p 3000:3000 --env-file apps/server/.env -e NODE_ENV=production learnloop-server
```

> **Important:** `apps/server/.env` may contain `NODE_ENV=development`, and the
> local dev value would disable JSON logging. Always pass
> `-e NODE_ENV=production` **after** `--env-file` so it overrides the file.
> The runtime image does not include `pino-pretty` (a devDependency).

Run the worker or scheduler from the same image:

```powershell
docker run --rm --env-file apps/server/.env -e NODE_ENV=production learnloop-server node dist/main.worker.js
docker run --rm --env-file apps/server/.env -e NODE_ENV=production learnloop-server node dist/main.scheduler.js
```

Only the API should publish `-p 3000:3000`.

Verified image size at creation: ~276 MB (`learnloop-server:local`).

### Local infrastructure stack (`infra/`)

```powershell
Copy-Item infra/.env.example infra/.env   # first time only
pnpm infra:up
pnpm infra:ps
```

Three services, all bound to `127.0.0.1`, on the `learnloop-net` network
(project name `learnloop`):

| Service | Image | Ports | Persistence |
|---|---|---|---|
| `learnloop-postgres` | `pgvector/pgvector:pg16` | 5432 | `learnloop_pgdata` |
| `learnloop-redis` | `redis:7-alpine` (`--appendonly yes`) | 6379 | `learnloop_redisdata` |
| `learnloop-mailpit` | `axllent/mailpit` | 1025 (SMTP), 8025 (UI) | none (ephemeral) |

Healthchecks: `pg_isready`, `redis-cli ping`, `wget --spider /livez`
(the Mailpit image is BusyBox-based and does ship `wget`). `pgvector/pgvector:pg16`
is Postgres 16 — do not "upgrade" it to 17, the volume is not compatible and
the project targets 16.

Postgres uses a **two-role** model created by the init scripts:

| Role | Used by | Rights |
|---|---|---|
| `learnloop_owner` | migrations | owns both databases + schema `public`; full DDL |
| `learnloop_app` | runtime | `CONNECT`, `USAGE` on `public`, DML on owner-created tables/sequences; no DDL, `NOBYPASSRLS`, not superuser |

Init scripts in `infra/postgres/init/` (`01-roles.sh`, `02-extensions.sh`,
`03-privileges.sh`) run **only when the data volume is empty**. Editing them
requires `pnpm infra:reset` + `pnpm infra:up`. They use `set -euo pipefail` and
`psql -v ON_ERROR_STOP=1`; passwords come from `LEARNLOOP_OWNER_PASSWORD` /
`LEARNLOOP_APP_PASSWORD`, never from SQL literals. `.gitattributes` pins
`*.sh` to LF so the container never sees CRLF.

Databases: `learnloop` (dev) and `learnloop_test` (tests), both with
`vector`, `pg_trgm`, `pgcrypto`.

Details and troubleshooting: `infra/README.md`.

---

## 8. Testing

- `apps/server/src/common/config/env.test.ts`
  - valid env parses and defaults apply
  - missing `DATABASE_URL` throws `EnvValidationError` listing the variable
- `apps/server/src/app.e2e.test.ts`
  - boots the real `AppModule` without listening
  - `GET /health/live` returns 200, body `{status:"ok"}`, and an `x-request-id` header

Vitest uses **SWC** (`unplugin-swc` + `@swc/core`) because Vitest's default
esbuild transform does not emit `design:paramtypes`, which Nest dependency
injection needs. This is test-only; the server itself is compiled with `tsc`.

Run:

```powershell
pnpm --filter @learnloop/server test
```

No test touches the database yet; `learnloop_test` on `localhost:5432` exists
for the upcoming `packages/db` integration tests.

---

## 9. Conventions and decisions (do not regress)

1. **ESM + NodeNext.** `apps/server` is `"type": "module"`; relative imports in
   source must end in `.js`.
2. **No tsx/esbuild for the server.** They don't emit decorator metadata and
   Nest DI breaks. Use `tsc` or `nest start` (tsc-based) only.
3. **Legacy decorators + metadata** are enabled in
   `packages/config/tsconfig.node.json`.
4. **No `@nestjs/config`.** Env is validated with plain Zod and passed to
   modules through `forRoot(env)`.
5. **Fail fast on env** before Nest is created.
6. **Pino everywhere.** Development uses `pino-pretty`; production emits JSON.
   Keep authorization/cookie redaction and the `correlationId` log field.
7. **Correlation ID is shared** between pino (`req.id`) and CLS
   (`correlationId` key). `resolveCorrelationId` sets `req.id` and the response
   header; CLS mirrors it.
8. **Health response contract lives in `@learnloop/shared`.** Update the schema
   and rebuild shared when the contract changes.
9. **Worker/scheduler need a keep-alive** until they have real long-running work.
10. **Never commit `.env`.** Only `.env.example` is tracked.
11. `@learnloop/shared` must be built before server typecheck/test in a fresh
    checkout. `pnpm build` (Turbo) or the server `build` script handles this.
12. **Postgres has exactly two application roles.** The runtime uses
    `learnloop_app` (no DDL, `NOBYPASSRLS`); migrations use `learnloop_owner`.
    Never point the app at `learnloop_owner` and never grant DDL to the app role.
13. **New tables must be created by `learnloop_owner`** — the default-privilege
    grants in `03-privileges.sh` are scoped `FOR ROLE learnloop_owner`. Objects
    created by `postgres`/superuser get no grants.
14. **Init scripts only run on an empty data volume.** After editing anything in
    `infra/postgres/init/`, run `pnpm infra:reset` then `pnpm infra:up`.
15. **Shell scripts are LF.** `.gitattributes` enforces `*.sh text eol=lf`;
    CRLF breaks the container entrypoint (`bad interpreter`).
16. **Two connection strings.** The server uses `DATABASE_URL` (app role,
    `learnloop_app`); migrations and drizzle-kit use `DATABASE_MIGRATION_URL`
    (owner role, `learnloop_owner`). Never run migrations as the app role and
    never point the server at the owner role.
17. **Never edit a committed migration.** Add a new one instead. drizzle tracks
    applied migrations in `drizzle.__drizzle_migrations`.
18. **Queue names come from `QUEUE_NAMES`** in `@learnloop/shared`; never
    hardcode a queue name string.
19. **Deterministic job IDs for idempotency:** callers may pass `jobKey`, which
    becomes the BullMQ `jobId`; duplicate keys are ignored.
20. **Validate job data with Zod in the processor** (`DemoPingJobSchema` style).
21. **Workers never hold sockets;** the API process never registers
    `@Processor` classes.
22. **Worker connections use `maxRetriesPerRequest: null`** (BullMQ requirement
    for blocking commands). Producer (API) connections keep the ioredis default.
23. **Do not reuse the general `RedisService` client for BullMQ workers** —
    BullMQ owns its connections.
24. **Bull Board is dev-only** (`NODE_ENV !== "production"`); replaced by real
    auth/ABAC in Module 1.

---

## 10. File map (current)

```
apps/server/
  .env.example
  Dockerfile
  package.json
  tsconfig.json
  tsconfig.build.json
  vitest.config.ts
  src/
    main.api.ts
    main.worker.ts
    main.scheduler.ts
    app.module.ts
    worker.module.ts
    scheduler.module.ts
    app.e2e.test.ts
    common/
      config/env.ts
      config/env.test.ts
      config/config.module.ts
      context/context.module.ts
      logging/logger.module.ts
      logging/correlation-id.ts
    modules/health/
      health.module.ts
      health.controller.ts
      health.service.ts

packages/config/
  tsconfig.base.json
  tsconfig.node.json

packages/db/
  package.json
  tsconfig.json
  tsconfig.build.json
  drizzle.config.ts
  .env.example
  src/
    schema.ts
    client.ts
    index.ts
    scripts/check.ts
  migrations/
    0000_plain_talkback.sql
    0001_extensions.sql
    meta/_journal.json
    meta/0000_snapshot.json
    meta/0001_snapshot.json

packages/shared/
  package.json
  tsconfig.json
  tsconfig.build.json
  src/index.ts
  src/schemas/health.ts

docs/
  adr/
    0003-two-database-roles.md

infra/
  .env                        # gitignored local dev credentials
  .env.example                # tracked template (dev-only passwords)
  README.md                   # infra guide: up/down/reset, roles, troubleshooting
  docker-compose.yml          # postgres + redis + mailpit (project name: learnloop)
  postgres/init/
    01-roles.sh               # learnloop_owner, learnloop_app, both databases
    02-extensions.sh          # vector, pg_trgm, pgcrypto in both databases
    03-privileges.sh          # schema ownership, CONNECT/USAGE, default privileges

.dockerignore
.gitattributes                # text=auto eol=lf, plus *.sh text eol=lf
AGENTS.md                     # this file
```

---

## 11. Suggested next steps

Pick these up in later phases (do not add placeholders now):

1. Implement `packages/db` (schema, migrations, client) and point
   `DATABASE_URL` at it. The local database, roles and extensions are ready
   (`pnpm infra:up`); migrations should connect with `DATABASE_MIGRATION_URL`
   (owner role) and the app with `DATABASE_URL` (`learnloop_app`).
2. Replace `/health/ready` placeholders with real Postgres/Redis checks that
   return `ok` or `error`; keep the schema shape.
3. Add the first feature module under `apps/server/src/modules/`.
4. Add worker processors and real scheduled jobs; remove the temporary
   keep-alive interval once real handles exist.
5. Add CI that runs `pnpm build`, `pnpm lint`, `pnpm test`, and the Docker build.
6. Optionally add `server`/`worker`/`scheduler` services to
   `infra/docker-compose.yml` using the Dockerfile in this repo.
7. Keep this document updated.

---

## 12. Session log

### 2026-11-21 — NestJS backend scaffold, shared health schema, Docker image

**Created**

- Server package, tsconfigs, three entry points, health module.
- Zod env schema/loader with fail-fast behaviour + `.env.example`.
- Typed global `ConfigService` module.
- pino logger module with dev-pretty/prod-JSON, correlation ID, redaction.
- Global CLS context storing `correlationId`.
- Shared `HealthResponseSchema` in `@learnloop/shared` and its build config.
- `tsconfig.node.json` in `@learnloop/config` (decorators + metadata).
- Vitest config using SWC; env unit tests; API e2e test.
- `apps/server/Dockerfile` and root `.dockerignore`.
- This handoff document.

**Decisions**

- Nest 12, nestjs-pino 5 (pino 10, pino-http 11), nestjs-cls 7, Zod 3.
- Server runtime compiled with `tsc`/Nest CLI, never tsx/esbuild.
- Tests use SWC for decorator metadata.
- `build` script builds `@learnloop/shared` first.
- Worker/scheduler use a 60-second interval as a temporary event-loop keep-alive.
- `.env` loaded with Node's built-in `process.loadEnvFile()` (no dotenv).
- Docker uses `pnpm deploy --prod` for a pruned production artifact.
- `infra/docker-compose.yml` intentionally left as Postgres/Redis only.

**Verified**

- `pnpm install` — up to date.
- `pnpm --filter @learnloop/server build` — passes.
- `pnpm --filter @learnloop/server typecheck` — passes.
- `pnpm --filter @learnloop/server lint` — passes.
- `pnpm --filter @learnloop/server test` — 2 files, 3 tests pass.
- `dev:api` starts; `/health/live` → 200 with `x-request-id`;
  `/health/ready` → 200 with `not_configured` checks.
- Incoming `x-request-id` is reused; generated UUIDs otherwise.
- Authorization and cookie values are `[REDACTED]` in logs.
- Missing `DATABASE_URL` prints the variable and exits `1` before Nest starts.
- `dev:worker` / `dev:scheduler` log their started message and stay running.
- Root `pnpm dev` starts all three via Turbo; API responds.
- Docker build succeeds (`learnloop-server:local`, ~276 MB).
- Container API returns 200; worker and scheduler containers log started and
  stop cleanly on `docker stop` (SIGTERM).
- Container without `DATABASE_URL` exits `1` with the expected message.

**Known limitations / notes**

- Signal handling is wired through `app.enableShutdownHooks()`; real Ctrl+C
  behaviour could not be automated in the Windows shell used for verification
  (process termination there used `taskkill`). Linux containers stop cleanly on
  `docker stop`.
- Local machine runs Node 24.11; the Docker image uses `node:22-alpine`.
- Nest CLI 12's schematics packages print engine warnings on Node 24.11; they
  do not affect build/watch/runtime.
- `pnpm-workspace.yaml` includes an auto-added `minimumReleaseAgeExclude` list
  for the Nest 12 packages and an `allowBuilds` entry for `@swc/core`.

### 2026-11-21 — Local dev infrastructure: Compose stack + two-role Postgres

**Created**

- `infra/docker-compose.yml` (rewritten): project `learnloop`, network
  `learnloop-net`, volumes `learnloop_pgdata` / `learnloop_redisdata`, three
  services — `pgvector/pgvector:pg16`, `redis:7-alpine` (AOF), `axllent/mailpit`.
  All ports bound to `127.0.0.1`; every service has a healthcheck and
  `restart: unless-stopped`.
- `infra/.env.example` (dev-only credentials) and a local (gitignored)
  `infra/.env`.
- `infra/postgres/init/01-roles.sh` — `learnloop_owner` + `learnloop_app` +
  `learnloop` / `learnloop_test` databases, passwords from env via psql
  variables and `format(%L)`.
- `infra/postgres/init/02-extensions.sh` — `vector`, `pg_trgm`, `pgcrypto` in
  both databases.
- `infra/postgres/init/03-privileges.sh` — `public` owned by `learnloop_owner`,
  `REVOKE CREATE` from `PUBLIC`, `REVOKE ALL ON DATABASE` from `PUBLIC`,
  `CONNECT`/`USAGE` for `learnloop_app`, and `ALTER DEFAULT PRIVILEGES` for
  tables and sequences.
- `infra/README.md` — start/stop/reset, `psql` access for both roles, endpoints,
  why two roles, why init scripts run once, troubleshooting.

**Changed**

- `.gitattributes`: added `*.sh text eol=lf` next to the existing
  `* text=auto eol=lf`.
- `package.json` (root): `infra:up`, `infra:down`, `infra:reset`, `infra:logs`,
  `infra:ps`.
- `apps/server/.env.example`: `DATABASE_URL` now uses `learnloop_app`; commented
  `DATABASE_MIGRATION_URL` for `learnloop_owner` (not in the Zod schema yet);
  `REDIS_URL` unchanged (`redis://localhost:6379`).

**Decisions**

- Postgres stays on 16 (`pgvector/pgvector:pg16`) as required; the previous
  `postgres:17-alpine` definition was replaced.
- Mailpit healthcheck uses the image's BusyBox `wget --spider /livez` (verified
  `wget` exists in `axllent/mailpit`); Redis uses `redis-cli ping`.
- Init scripts are idempotent-ish (`WHERE NOT EXISTS` + `\gexec`) but are only
  executed on an empty volume anyway.
- `ALTER SCHEMA public OWNER TO learnloop_owner` plus explicit
  `REVOKE CREATE ON SCHEMA public FROM PUBLIC` (PG 15+ default is not enough on
  its own, and migrations need the owner to hold CREATE).
- App role gets no DDL: verified both `permission denied for schema public` and
  `must be owner of table t`.
- App `.env` (user's gitignored file) was left untouched; it still has the old
  `learnloop:learnloop` URL until the DB-client step. Nothing reads it yet.

**Verified**

- `pnpm infra:up` → all three services `healthy`; `pnpm infra:ps` shows them.
- `SELECT current_user, rolsuper, rolbypassrls` as `learnloop_app` → `f` / `f`.
- `\dx` in `learnloop` **and** `learnloop_test` → `vector 0.8.7`, `pg_trgm 1.6`,
  `pgcrypto 1.3` (+ `plpgsql`).
- `CREATE TABLE x(id int)` as `learnloop_app` → `permission denied for schema public`.
- Owner `CREATE TABLE t`; app `INSERT` + `SELECT` worked (default privileges);
  app `DROP TABLE t` → `must be owner of table t`; owner dropped it.
- SCRAM password auth over TCP worked for both roles
  (`postgresql://learnloop_app:...@127.0.0.1:5432/learnloop`,
  `postgresql://learnloop_owner:...@127.0.0.1:5432/learnloop_test`).
- `redis-cli ping` → `PONG`; `redis-cli config get appendonly` → `yes`.
- `curl.exe -I http://localhost:8025` → `200`.
- `pnpm infra:reset` (volumes + network removed) then `pnpm infra:up` re-ran all
  three init scripts cleanly and all services became healthy again.
- Confirmed host listeners are `127.0.0.1` only on 1025/5432/6379/8025.
- Init scripts are LF-only (0 CRLF bytes) before first container start.

**Notes**

- `docker compose --env-file infra/.env` is required; without it the compose
  file falls back to its `${VAR:-default}` defaults.
- Changing a password in `infra/.env` after the volume exists has no effect
  (init scripts already ran) → `pnpm infra:reset`.
- Postgres version confirmed `16.16`.

### 2026-11-21 — Drizzle ORM, database package, real /health/ready

**Created**

- `packages/db`: package, tsconfigs, schema (`institutions` placeholder), client
  (`createDb`), index, drizzle config, `.env.example`, migrations (`0000` +
  custom `0001_extensions`), `db:check` script.
- `apps/server/src/common/database/database.module.ts` + `database.service.ts`.
- `docs/adr/0003-two-database-roles.md`.

**Changed**

- `packages/shared/src/schemas/health.ts`: `HealthCheckStateSchema` now
  `["up","down","not_configured"]`; `HealthStatusSchema` gained `"unavailable"`.
- `apps/server`: `@learnloop/db` dependency, `@nestjs/testing` devDep,
  `DatabaseModule` in `AppModule`, `HealthService`/`HealthController` now run a
  real `SELECT 1` with a 2s timeout and return 503 on failure.
- `apps/server/src/app.e2e.test.ts`: rewritten with `Test.createTestingModule`
  and a fake `DatabaseService` (up + down cases).
- Root `package.json`: `db:migrate`, `db:generate`, `typecheck`.
- `turbo.json`: `typecheck` task.
- `AGENTS.md`: scripts, conventions, file map, this entry.

**Decisions**

- `pool.on("error", ...)` in `createDb` to prevent unhandled 'error' events
  from crashing the process when Postgres restarts.
- Health check uses `pool.query("SELECT 1")` (not drizzle's `db.execute`) to
  avoid importing `drizzle-orm` into the server.
- `vector` is untrusted, so the custom migration wraps `CREATE EXTENSION vector`
  in a `DO $$ ... EXCEPTION WHEN insufficient_privilege` block (no-op + NOTICE
  where the role lacks privilege). `pg_trgm` and `pgcrypto` are trusted and
  create normally. Documented in the ADR.
- drizzle-kit internally uses tsx to load `schema.ts` (dev-tooling only).
- `packages/db/.env` holds both `DATABASE_URL` and `DATABASE_MIGRATION_URL`.

**Verified**

- `pnpm build`, `pnpm typecheck`, `pnpm lint` pass.
- `pnpm db:migrate`: creates `institutions` + `drizzle.__drizzle_migrations`;
  second run is a no-op.
- `pnpm --filter @learnloop/db db:check`: all 7 PASS.
- App role: INSERT/SELECT on `institutions` work; DROP fails with
  "must be owner of table institutions".
- `/health/ready`: 200 (database up) → 503 within ~90ms on `docker stop
  learnloop-postgres` → `/health/live` stays 200 → 200 again after restart
  without restarting the API.
- `pnpm test`: 2 files / 6 tests pass.

### 2026-11-21 — Local `apps/server/.env` aligned with the two-role stack

**Changed**

- `apps/server/.env` (local, gitignored, user-owned): `DATABASE_URL` now uses
  `learnloop_app` (`postgresql://learnloop_app:learnloop_app_dev@localhost:5432/learnloop`),
  and a commented `DATABASE_MIGRATION_URL` for `learnloop_owner` was added.
  `REDIS_URL` unchanged.

**Verified**

- Password parsed from `apps/server/.env` equals `LEARNLOOP_APP_PASSWORD` in
  `infra/.env`; the commented migration URL equals `LEARNLOOP_OWNER_PASSWORD`.
- TCP (SCRAM) auth with those exact credentials works:
  `current_user = learnloop_app`, `current_database = learnloop`.
- `node dist/main.api.js` with cwd `apps/server` (so `process.loadEnvFile()`
  picks up the real `.env`) starts cleanly; `/health/live` and `/health/ready`
  return 200.
- `git check-ignore` still reports `apps/server/.env` as ignored.
- Stopped a stale `node dist/main.api.js` process from the earlier temp-deploy
  test that was still listening on `:3100`.

**Note**

- The env schema only validates `DATABASE_URL` as a URL, so a wrong role or
  password still boots. Failures will surface when the DB client lands; the
  `infra/.env` values are the source of truth for local credentials.
