import { describe, expect, it } from "vitest";
import { EnvValidationError, parseEnv } from "./env.js";

const validSource = {
  NODE_ENV: "development",
  API_PORT: "3000",
  LOG_LEVEL: "info",
  DATABASE_URL: "postgresql://learnloop:learnloop@localhost:5432/learnloop",
  REDIS_URL: "redis://localhost:6379",
};

describe("parseEnv", () => {
  it("parses a valid environment and applies defaults", () => {
    const { API_PORT: _apiPort, ...withoutPort } = validSource;

    const env = parseEnv(withoutPort);

    expect(env.NODE_ENV).toBe("development");
    expect(env.API_PORT).toBe(3000);
    expect(env.LOG_LEVEL).toBe("info");
    expect(env.DATABASE_URL).toBe(validSource.DATABASE_URL);
    expect(env.REDIS_URL).toBe(validSource.REDIS_URL);
  });

  it("fails with a readable problem when DATABASE_URL is missing", () => {
    const { DATABASE_URL: _databaseUrl, ...withoutDatabase } = validSource;

    expect(() => parseEnv(withoutDatabase)).toThrow(EnvValidationError);

    try {
      parseEnv(withoutDatabase);
    } catch (error) {
      expect(error).toBeInstanceOf(EnvValidationError);
      expect((error as EnvValidationError).problems.join("\n")).toContain(
        "DATABASE_URL",
      );
    }
  });
});
