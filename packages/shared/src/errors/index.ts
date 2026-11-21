import { z } from "zod";

export const ProblemDetailsSchema = z.object({
  type: z.string().default("about:blank"),
  title: z.string(),
  status: z.number().int().min(400).max(599),
  detail: z.string().optional(),
  instance: z.string().optional(),
  correlationId: z.string().optional(),
  errors: z
    .array(z.object({ path: z.string(), message: z.string() }))
    .optional(),
});

export type ProblemDetails = z.infer<typeof ProblemDetailsSchema>;

export type CreateProblemInput = {
  status: number;
  title: string;
  detail?: string | undefined;
  instance?: string | undefined;
  correlationId?: string | undefined;
  type?: string | undefined;
  errors?: { path: string; message: string }[] | undefined;
};

export function createProblem(input: CreateProblemInput): ProblemDetails {
  const base: Record<string, unknown> = {
    status: input.status,
    title: input.title,
  };
  if (input.detail !== undefined) base.detail = input.detail;
  if (input.instance !== undefined) base.instance = input.instance;
  if (input.correlationId !== undefined) base.correlationId = input.correlationId;
  if (input.type !== undefined) base.type = input.type;
  if (input.errors !== undefined) base.errors = input.errors;
  return ProblemDetailsSchema.parse(base);
}
