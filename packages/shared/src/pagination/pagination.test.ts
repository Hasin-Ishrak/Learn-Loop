import { describe, expect, it } from "vitest";
import { z } from "zod";
import { CursorPageQuerySchema, cursorPageSchema } from "./index.js";

describe("pagination", () => {
  it("defaults limit to 20", () => {
    const r = CursorPageQuerySchema.parse({});
    expect(r.limit).toBe(20);
  });

  it("coerces string limit", () => {
    const r = CursorPageQuerySchema.parse({ limit: "50" });
    expect(r.limit).toBe(50);
  });

  it("rejects 0 and 101", () => {
    expect(() => CursorPageQuerySchema.parse({ limit: 0 })).toThrow();
    expect(() => CursorPageQuerySchema.parse({ limit: 101 })).toThrow();
  });

  it("cursorPageSchema works with a sample item schema", () => {
    const schema = cursorPageSchema(z.object({ id: z.string() }));
    const r = schema.parse({ items: [{ id: "a" }], nextCursor: "abc" });
    expect(r.items).toHaveLength(1);
    expect(r.nextCursor).toBe("abc");
  });
});
