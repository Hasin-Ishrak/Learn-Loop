# syntax=docker/dockerfile:1

# ------------------------------------------------------------------------------
# Build stage: install the workspace, build @learnloop/server, then prune the
# server to production dependencies with pnpm deploy.
# Build from the repository root:
#   docker build -f apps/server/Dockerfile -t learnloop-server .
# ------------------------------------------------------------------------------
FROM node:22-alpine AS build

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

WORKDIR /repo

# Copy manifests first so dependency installation is cached until they change.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY packages/config/package.json packages/config/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

COPY tsconfig.json ./
COPY packages/config packages/config
COPY packages/shared packages/shared
COPY apps/server apps/server

RUN pnpm --filter @learnloop/server build \
 && pnpm --filter @learnloop/server deploy --prod --ignore-scripts /prod/server \
 && rm -rf /prod/server/src /prod/server/.turbo /prod/server/.env \
           /prod/server/tsconfig.json /prod/server/tsconfig.build.json \
           /prod/server/vitest.config.ts

# ------------------------------------------------------------------------------
# Runtime stage: a small production image. The same image runs all three entry
# points by overriding the command:
#   API:       node dist/main.api.js       (default)
#   Worker:    node dist/main.worker.js
#   Scheduler: node dist/main.scheduler.js
# ------------------------------------------------------------------------------
FROM node:22-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app

COPY --from=build --chown=node:node /prod/server ./

USER node

EXPOSE 3000

CMD ["node", "--enable-source-maps", "dist/main.api.js"]
