# ADR 0004 — BullMQ queue conventions

## Context

LearnLoop needs asynchronous work (email, ingestion, notifications) that survives
process restarts and can be retried. BullMQ on Redis is the chosen queue. The
first queue is a temporary `demo` queue that exists only to prove the
API -> Redis -> Worker path end to end.

## Decision

- Queue names live in `QUEUE_NAMES` in `@learnloop/shared` and are the single
  source of truth. Never hardcode a queue name string in application code.
- Job data is validated with Zod in the processor (`DemoPingJobSchema` style).
  Invalid payloads throw and are marked failed.
- Idempotency uses deterministic BullMQ `jobId`s: callers may pass `jobKey`,
  which becomes the jobId; duplicate keys are ignored by BullMQ.
- Worker connections set `maxRetriesPerRequest: null` (blocking commands).
  Producer connections (API) keep the ioredis default.
- Workers never hold HTTP sockets / DB connections beyond what a job needs;
  the API process never registers `@Processor` classes.
- The general `RedisService` client is for health checks / caching only and is
  never reused for BullMQ workers (BullMQ owns its connections).
- Bull Board is mounted only when `NODE_ENV !== "production"` and is replaced
  by real auth/ABAC before Module 1.

## Consequences

- Queue names, schemas and job options are centralized and reviewable.
- Deterministic IDs make retries and duplicate submissions safe.
- `maxRetriesPerRequest: null` is mandatory for any new worker; forgetting it
  makes the worker crash on the first blocking read.
- Bull Board must never be exposed publicly; production returns 404 for it.
- The `demo` queue and its processor are temporary and will be deleted once
  real queues exist.
