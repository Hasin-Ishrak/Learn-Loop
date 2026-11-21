import { describe, expect, it } from "vitest";
import { HealthResponseSchema } from "./index.js";

describe("HealthResponseSchema", () => {
  it("accepts a valid payload", () => {
    const r = HealthResponseSchema.parse({ status: "ok", checks: { database: "up", redis: "up" } });
    expect(r.status).toBe("ok");
  });

  it("rejects an invalid payload", () => {
    expect(() => HealthResponseSchema.parse({ status: "nope" })).toThrow();
  });
});
