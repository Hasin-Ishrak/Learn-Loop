import { z } from "zod";
import { env } from "../env.js";
import type { HealthResponse } from "@learnloop/shared";
import { HealthResponseSchema } from "@learnloop/shared";

export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkError";
  }
}

export interface ApiFetchOptions {
  /** HTTP statuses whose response body should still be parsed (e.g. 503 for /health/ready). */
  acceptStatuses?: number[];
  init?: RequestInit;
}

export async function apiFetch<T>(
  path: string,
  schema: z.ZodType<T>,
  options?: ApiFetchOptions,
): Promise<T> {
  const url = new URL(path, env.VITE_API_URL).toString();
  const accept = new Set(options?.acceptStatuses ?? []);

  let response: Response;
  try {
    response = await fetch(url, {
      ...options?.init,
      headers: {
        "x-request-id": crypto.randomUUID(),
        ...(options?.init?.headers ?? {}),
      },
    });
  } catch (err) {
    throw new NetworkError(
      `Network failure reaching ${url}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  const ok = response.ok || accept.has(response.status);
  if (!ok) {
    throw new ApiError(response.status, `Request failed with status ${response.status}`);
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(
      response.status,
      `Invalid response shape: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
    );
  }
  return parsed.data;
}

export function getHealthLive(): Promise<HealthResponse> {
  return apiFetch("/health/live", HealthResponseSchema);
}

export function getHealthReady(): Promise<HealthResponse> {
  return apiFetch("/health/ready", HealthResponseSchema, { acceptStatuses: [503] });
}
