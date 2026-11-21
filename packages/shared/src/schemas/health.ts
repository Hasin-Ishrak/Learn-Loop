import { z } from "zod";

/** Overall health of a service. */
export const HealthStatusSchema = z.enum(["ok", "degraded", "error"]);

/** State of a single dependency. `not_configured` is used until real checks exist. */
export const HealthCheckStateSchema = z.enum(["ok", "error", "not_configured"]);

/**
 * Response body for the health endpoints.
 * `checks` is optional so liveness can return only the status.
 */
export const HealthResponseSchema = z.object({
  status: HealthStatusSchema,
  checks: z.record(z.string(), HealthCheckStateSchema).optional(),
});

export type HealthStatus = z.infer<typeof HealthStatusSchema>;
export type HealthCheckState = z.infer<typeof HealthCheckStateSchema>;
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
