import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { QUEUE_NAMES } from "@learnloop/shared";
import { DemoController } from "./demo.controller.js";

/**
 * TEMPORARY demo queue. Remove this module (and the processor) once real
 * queues exist. Registered queue: "demo".
 */
@Module({
  imports: [
    BullModule.registerQueue({
      name: QUEUE_NAMES.demo,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 1000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    }),
  ],
  controllers: [DemoController],
})
export class DemoModule {}
