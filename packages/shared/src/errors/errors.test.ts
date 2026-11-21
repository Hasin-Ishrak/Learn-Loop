import { describe, expect, it } from "vitest";
import { ProblemDetailsSchema, createProblem } from "./index.js";

describe("ProblemDetailsSchema", () => {
  it("accepts a valid problem", () => {
    const r = ProblemDetailsSchema.parse({ title: "Bad Request", status: 400 });
    expect(r.type).toBe("about:blank");
    expect(r.status).toBe(400);
  });

  it("rejects an invalid status", () => {
    expect(() => ProblemDetailsSchema.parse({ title: "x", status: 200 })).toThrow();
    expect(() => ProblemDetailsSchema.parse({ title: "x", status: 600 })).toThrow();
  });

  it("createProblem output validates", () => {
    const p = createProblem({ status: 404, title: "Not Found", detail: "missing" });
    expect(ProblemDetailsSchema.parse(p)).toEqual(p);
    expect(p.correlationId).toBeUndefined();
  });
});
