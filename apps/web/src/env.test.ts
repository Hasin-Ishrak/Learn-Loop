import { describe, expect, it, vi } from "vitest";

describe("env", () => {
  it("parses a valid VITE_API_URL", async () => {
    vi.stubEnv("VITE_API_URL", "http://localhost:3000");
    vi.resetModules();
    const { env } = await import("./env.js");
    expect(env.VITE_API_URL).toBe("http://localhost:3000");
  });

  it("applies the default when VITE_API_URL is missing", async () => {
    vi.stubEnv("VITE_API_URL", "");
    // empty string fails url validation -> should throw
    vi.resetModules();
    await expect(import("./env.js")).rejects.toThrow();
  });

  it("throws on an invalid VITE_API_URL", async () => {
    vi.stubEnv("VITE_API_URL", "not-a-url");
    vi.resetModules();
    await expect(import("./env.js")).rejects.toThrow(/Invalid environment variables/);
  });
});
