# LearnLoop

LearnLoop is a pnpm workspace monorepo managed with Turborepo.

## Workspace

- `apps/web` - web application
- `apps/server` - API, worker, and scheduler
- `packages/db` - database schema and migrations
- `packages/shared` - shared types and validation schemas
- `packages/config` - shared strict TypeScript configuration
- `infra` - local infrastructure
- `tests` - end-to-end, load, and chaos test suites

The application and library workspaces are intentionally unimplemented
scaffolds. Add package scripts when their applications and libraries are
implemented; Turborepo runs tasks only for packages that define them.

## Commands

Install dependencies with `pnpm install`. The root `dev`, `build`, `lint`, and
`test` commands run the corresponding package tasks through Turborepo; they
become active as package scripts are added.

Start local PostgreSQL and Redis with `docker compose -f infra/docker-compose.yml up`.
