import { DynamicModule, Module } from "@nestjs/common";
import type { Env } from "../config/env.js";
import { DatabaseService } from "./database.service.js";

/**
 * Global database module. Only the API imports this today; worker and scheduler
 * do not connect to Postgres yet (they will in later phases).
 */
@Module({})
export class DatabaseModule {
  static forRoot(env: Env): DynamicModule {
    return {
      module: DatabaseModule,
      global: true,
      providers: [
        {
          provide: DatabaseService,
          useFactory: () => new DatabaseService(env.DATABASE_URL),
        },
      ],
      exports: [DatabaseService],
    };
  }
}
