import { describe, expect, it } from "vitest";
import { DemoPingJobSchema, DemoPingRequestSchema } from "@learnloop/shared";

describe("DemoPingJobSchema", () => {
  it("applies default shouldFail=false", () => {
    const r = DemoPingJobSchema.parse({ message: "hi" });
    expect(r.shouldFail).toBe(false);
  });

  it("rejects empty message", () => {
    expect(() => DemoPingJobSchema.parse({ message: "" })).toThrow();
  });

  it("rejects message over 200 chars", () => {
    expect(() => DemoPingJobSchema.parse({ message: "a".repeat(201) })).toThrow();
  });
});

describe("DemoPingRequestSchema", () => {
  it("accepts minimal", () => {
    const r = DemoPingRequestSchema.parse({ message: "hi" });
    expect(r.message).toBe("hi");
  });

  it("rejects jobKey over 100", () => {
    expect(() =>
      DemoPingRequestSchema.parse({ message: "hi", jobKey: "a".repeat(101) }),
    ).toThrow();
  });
});
