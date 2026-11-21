import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import type { Queue } from "bullmq";
import { ClsService } from "nestjs-cls";
import { BadRequestException } from "@nestjs/common";
import { QUEUE_NAMES, DemoPingRequestSchema } from "@learnloop/shared";
import type { DemoPingJob } from "@learnloop/shared";

@Controller("demo")
export class DemoController {
  constructor(
    @InjectQueue(QUEUE_NAMES.demo) private readonly queue: Queue,
    private readonly cls: ClsService,
  ) {}

  @Post("ping")
  @HttpCode(HttpStatus.ACCEPTED)
  async ping(@Body() body: unknown) {
    const parsed = DemoPingRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues.map((i) => i.message).join("; "),
      );
    }

    const { message, shouldFail, jobKey } = parsed.data;
    const correlationId = this.cls.get<string>("correlationId");

    const data: DemoPingJob = {
      message,
      shouldFail: shouldFail ?? false,
      correlationId,
    };

    const job = await this.queue.add(
      "ping",
      data,
      jobKey ? { jobId: jobKey } : undefined,
    );

    return { jobId: job.id, queue: QUEUE_NAMES.demo };
  }
}
