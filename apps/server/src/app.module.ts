import { DynamicModule, Module } from "@nestjs/common";
import { AppConfigModule } from "./common/config/config.module.js";
import type { Env } from "./common/config/env.js";
import { ContextModule } from "./common/context/context.module.js";
import { DatabaseModule } from "./common/database/database.module.js";
import { AppLoggerModule } from "./common/logging/logger.module.js";
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
        HealthModule,
      ],
    };
  }
}
