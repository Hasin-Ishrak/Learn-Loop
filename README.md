# LearnLoop

LearnLoop is a pnpm workspace monorepo managed with Turborepo.

## Workspace

- `apps/web` - web application workspace
- `apps/server` - API, worker, and scheduler workspace
- `packages/db` - database schema and migration workspace
- `packages/shared` - shared types and validation workspace
- `packages/config` - shared strict TypeScript configuration
- `infra` - local infrastructure
- `tests` - end-to-end, load, and chaos test suites

The application and library workspaces are scaffolds; add their framework
entrypoints and package-specific `dev` scripts as those implementations are
introduced.

## Commands

Install dependencies with `pnpm install`, then run `pnpm build`, `pnpm lint`,
or `pnpm test`. `pnpm dev` runs package `dev` tasks registered with Turborepo.

Start local PostgreSQL and Redis with `docker compose -f infra/docker-compose.yml up`.
