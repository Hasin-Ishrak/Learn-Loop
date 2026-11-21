import { DynamicModule, Module } from "@nestjs/common";
import { AppConfigModule } from "./common/config/config.module.js";
import type { Env } from "./common/config/env.js";
import { AppLoggerModule } from "./common/logging/logger.module.js";

/**
 * Worker root module. Job processors arrive in a later phase; for now this is
 * only the process shell (config + logging).
 */
@Module({})
export class WorkerModule {
  static forRoot(env: Env): DynamicModule {
    return {
      module: WorkerModule,
      imports: [AppConfigModule.forRoot(env), AppLoggerModule.forRoot(env)],
    };
  }
}
