import { Logger } from "@nestjs/common";
import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import type { Job } from "bullmq";
import { QUEUE_NAMES, DemoPingJobSchema } from "@learnloop/shared";

/**
 * TEMPORARY demo processor. Runs in the worker process only.
 */
@Processor(QUEUE_NAMES.demo)
export class DemoProcessor extends WorkerHost {
  private readonly logger = new Logger(DemoProcessor.name);

  async process(job: Job): Promise<void> {
    const parsed = DemoPingJobSchema.safeParse(job.data);
    if (!parsed.success) {
      throw new Error(`invalid job data: ${parsed.error.message}`);
    }
    const { message, shouldFail, correlationId } = parsed.data;

    this.logger.log({
      msg: "demo job processed",
      jobId: job.id,
      attempt: job.attemptsMade + 1,
      message,
      correlationId,
    });

    // Simulate ~500ms of work.
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (shouldFail) {
      throw new Error("demo job forced failure");
    }
  }

  @OnWorkerEvent("completed")
  onCompleted(job: Job): void {
    this.logger.log({
      msg: "demo job completed",
      jobId: job.id,
      attempts: job.attemptsMade,
    });
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job | undefined, err: Error): void {
    this.logger.warn({
      msg: "demo job failed",
      jobId: job?.id,
      attempts: job?.attemptsMade,
      error: err?.message,
    });
  }
}
