import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config();

const url = process.env.DATABASE_MIGRATION_URL;
if (!url) {
  throw new Error(
    "DATABASE_MIGRATION_URL is required for drizzle-kit. " +
      "Copy packages/db/.env.example to packages/db/.env and set it.",
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
  out: "./migrations",
  dbCredentials: { url },
});
