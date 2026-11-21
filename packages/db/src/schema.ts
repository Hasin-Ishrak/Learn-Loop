import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

// Placeholder table. Proves the migration pipeline works end to end; real
// domain tables land in later phases. Do not build features on this table.
export const institutions = pgTable("institutions", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
