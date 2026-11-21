import { describe, expect, it } from "vitest";
import { PERMISSIONS, PermissionKeySchema } from "./index.js";

describe("permissions", () => {
  it("accepts every key in PERMISSIONS", () => {
    for (const key of PERMISSIONS) {
      expect(PermissionKeySchema.parse(key)).toBe(key);
    }
  });

  it("rejects an unknown key", () => {
    expect(() => PermissionKeySchema.parse("course:manage2")).toThrow();
  });

  it("has no duplicates", () => {
    expect(new Set(PERMISSIONS).size).toBe(PERMISSIONS.length);
  });
});
