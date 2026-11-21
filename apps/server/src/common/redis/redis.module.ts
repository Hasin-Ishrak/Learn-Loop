import { DynamicModule, Module } from "@nestjs/common";
import type { Env } from "../config/env.js";
import { RedisService } from "./redis.service.js";

@Module({})
export class RedisModule {
  static forRoot(env: Env): DynamicModule {
    return {
      module: RedisModule,
      global: true,
      providers: [
        {
          provide: RedisService,
          useFactory: () => new RedisService(env.REDIS_URL),
        },
      ],
      exports: [RedisService],
    };
  }
}
