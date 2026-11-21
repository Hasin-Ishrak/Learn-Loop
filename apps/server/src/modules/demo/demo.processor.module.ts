import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { QUEUE_NAMES } from "@learnloop/shared";
import { DemoProcessor } from "./demo.processor.js";

/**
 * TEMPORARY. Imported by WorkerModule only; the API process never registers
 * the processor, so it never consumes jobs.
 */
@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_NAMES.demo })],
  providers: [DemoProcessor],
})
export class DemoProcessorModule {}
