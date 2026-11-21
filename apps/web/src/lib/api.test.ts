import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, NetworkError, apiFetch, getHealthLive, getHealthReady } from "./api.js";
import { HealthResponseSchema } from "@learnloop/shared";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("apiFetch", () => {
  it("returns parsed data on success", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    ) as unknown as typeof fetch;

    const data = await apiFetch("/health/live", HealthResponseSchema);
    expect(data).toEqual({ status: "ok" });
  });

  it("throws ApiError on 500", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "boom" }), { status: 500 }),
    ) as unknown as typeof fetch;
    await expect(apiFetch("/x", HealthResponseSchema)).rejects.toBeInstanceOf(ApiError);
  });

  it("throws ApiError on invalid shape", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ nope: 1 }), { status: 200 }),
    ) as unknown as typeof fetch;
    await expect(apiFetch("/x", HealthResponseSchema)).rejects.toBeInstanceOf(ApiError);
  });

  it("getHealthReady parses a 503 body", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: "unavailable", checks: { database: "down", redis: "up" } }), {
        status: 503,
      }),
    ) as unknown as typeof fetch;
    const data = await getHealthReady();
    expect(data.status).toBe("unavailable");
    expect(data.checks?.database).toBe("down");
  });

  it("getHealthLive throws NetworkError on network failure", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED")) as unknown as typeof fetch;
    await expect(getHealthLive()).rejects.toBeInstanceOf(NetworkError);
  });
});
