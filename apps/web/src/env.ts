import { z } from "zod";

const EnvSchema = z.object({
  VITE_API_URL: z.string().url().default("http://localhost:3000"),
});

const parsed = EnvSchema.safeParse(import.meta.env);
if (!parsed.success) {
  const problems = parsed.error.issues
    .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("\n");
  throw new Error(`Invalid environment variables:\n${problems}`);
}

export const env = parsed.data;
