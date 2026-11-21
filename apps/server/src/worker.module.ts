import { DynamicModule, Module } from "@nestjs/common";
import { AppConfigModule } from "./common/config/config.module.js";
import type { Env } from "./common/config/env.js";
import { RedisModule } from "./common/redis/redis.module.js";
import { getBullMQConnectionOptions } from "./common/redis/redis.service.js";
import { AppLoggerModule } from "./common/logging/logger.module.js";
import { BullModule } from "@nestjs/bullmq";
import { DemoProcessorModule } from "./modules/demo/demo.processor.module.js";

/**
 * Worker root module. Processes BullMQ jobs. Does NOT connect to Postgres.
 */
@Module({})
export class WorkerModule {
  static forRoot(env: Env): DynamicModule {
    return {
      module: WorkerModule,
      imports: [
        AppConfigModule.forRoot(env),
        AppLoggerModule.forRoot(env),
        RedisModule.forRoot(env),
        BullModule.forRoot({
          connection: getBullMQConnectionOptions(env.REDIS_URL, true),
        }),
        DemoProcessorModule,
      ],
    };
  }
}
