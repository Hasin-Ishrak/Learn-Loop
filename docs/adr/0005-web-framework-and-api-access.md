# ADR 0005 — Web framework and API access

## Context

LearnLoop needs a web frontend that can render on the server for fast first
paint, share validation with the backend, and stay small (no auth, no domain
features yet). The backend is a separate NestJS API on port 3000.

## Decision

- Use **TanStack Start** (React, TypeScript, Vite, file-based routing via
  TanStack Router) for `apps/web`. It provides SSR, streaming, and a
  request-scoped router/QueryClient without a heavier framework.
- The browser calls the API **directly** (no BFF/proxy). The API enables CORS
  with an **allowlist** (`WEB_ORIGIN`, never `*`) plus credentials.
- Every API response is validated in the browser with a **shared Zod schema**
  from `@learnloop/shared` (`HealthResponseSchema`). `apiFetch` throws a typed
  `ApiError` on non-2xx or invalid shape; network failures are distinct.
- Tailwind CSS v4 (Vite plugin) for styling; no component library yet.

## Consequences

- `@learnloop/shared` must be built before web dev/build (handled by Turbo
  `dependsOn: ^build`; first-time step documented).
- CORS origin is config-driven; production never uses `*`.
- Validation logic is shared, so frontend and backend agree on shapes.
- No auth or domain pages yet; those arrive in later modules.
- Web dev server runs on 5173 (API on 3000); `strictPort: true`.
