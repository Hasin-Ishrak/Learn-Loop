import { z } from "zod";

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  WEB_ORIGIN: z.string().url().default("http://localhost:5173"),
});

export type Env = z.infer<typeof envSchema>;

export class EnvValidationError extends Error {
  readonly problems: string[];

  constructor(problems: string[]) {
    super(
      ["Invalid environment variables:", ...problems.map((p) => `  - ${p}`)].join(
        "\n",
      ),
    );
    this.name = "EnvValidationError";
    this.problems = problems;
  }
}

/**
 * Pure parser: reads a source object and either returns typed env or throws.
 * Keeping this separate from `loadEnv` makes it testable without touching
 * `process.env` or the process exit.
 */
export function parseEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    const problems = result.error.issues.map(
      (issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`,
    );
    throw new EnvValidationError(problems);
  }

  return result.data;
}

function isMissingFileError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}

/**
 * Entry-point loader. Loads `.env` (Node built-in, no dotenv dependency),
 * validates `process.env`, and exits with code 1 before Nest starts if
 * anything is wrong.
 */
export function loadEnv(): Env {
  try {
    try {
      process.loadEnvFile();
    } catch (error) {
      // No .env file is perfectly fine; the process env may provide values.
      if (!isMissingFileError(error)) {
        throw error;
      }
    }

    return parseEnv();
  } catch (error) {
    if (error instanceof EnvValidationError) {
      console.error(error.message);
      console.error("\nSee apps/server/.env.example for the full list of variables.");
    } else {
      console.error("Failed to load environment configuration:");
      console.error(error);
    }

    process.exit(1);
  }
}
