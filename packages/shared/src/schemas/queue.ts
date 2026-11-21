import { z } from "zod";

/**
 * Single source of truth for BullMQ queue names.
 * New queues must be added here first, then registered via BullModule.registerQueue.
 */
export const QUEUE_NAMES = {
  demo: "demo",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

/** Payload consumed by the demo processor (worker side). */
export const DemoPingJobSchema = z.object({
  message: z.string().min(1).max(200),
  shouldFail: z.boolean().default(false),
  correlationId: z.string().optional(),
});

export type DemoPingJob = z.infer<typeof DemoPingJobSchema>;

/** Request body for POST /demo/ping (API side). */
export const DemoPingRequestSchema = z.object({
  message: z.string().min(1).max(200),
  shouldFail: z.boolean().optional(),
  jobKey: z.string().max(100).optional(),
});

export type DemoPingRequest = z.infer<typeof DemoPingRequestSchema>;
