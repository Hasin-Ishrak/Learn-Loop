import { z } from "zod";

export const CursorPageQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CursorPageQuery = z.infer<typeof CursorPageQuerySchema>;

export function cursorPageSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    nextCursor: z.string().nullable(),
  });
}

export type CursorPage<T> = {
  items: T[];
  nextCursor: string | null;
};
