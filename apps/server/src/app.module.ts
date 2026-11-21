import { DynamicModule, Module } from "@nestjs/common";
import { AppConfigModule } from "./common/config/config.module.js";
import type { Env } from "./common/config/env.js";
import { ContextModule } from "./common/context/context.module.js";
import { DatabaseModule } from "./common/database/database.module.js";
import { RedisModule } from "./common/redis/redis.module.js";
import { getBullMQConnectionOptions } from "./common/redis/redis.service.js";
import { AppLoggerModule } from "./common/logging/logger.module.js";
import { BullModule } from "@nestjs/bullmq";
import { BullBoardModule } from "@bull-board/nestjs";
import { ExpressAdapter } from "@bull-board/express";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { QUEUE_NAMES } from "@learnloop/shared";
import { DemoModule } from "./modules/demo/demo.module.js";
import { HealthModule } from "./modules/health/health.module.js";

/**
 * API root module. Env is passed in explicitly so entry points can validate it
 * (and fail fast) before Nest is created.
 */
@Module({})
export class AppModule {
  static forRoot(env: Env): DynamicModule {
    return {
      module: AppModule,
      imports: [
        AppConfigModule.forRoot(env),
        AppLoggerModule.forRoot(env),
        ContextModule.forRoot(),
        DatabaseModule.forRoot(env),
        RedisModule.forRoot(env),
        BullModule.forRoot({
          connection: getBullMQConnectionOptions(env.REDIS_URL, false),
        }),
        DemoModule,
        HealthModule,
        ...(env.NODE_ENV !== "production"
          ? [
              // Bull Board is dev-only. Real auth/ABAC lands in Module 1;
              // it must never be public in production.
              BullBoardModule.forRoot({
                route: "/admin/queues",
                adapter: ExpressAdapter,
              }),
              BullBoardModule.forFeature({
                name: QUEUE_NAMES.demo,
                adapter: BullMQAdapter,
              }),
            ]
          : []),
      ],
    };
  }
}
