import { DynamicModule, Global, Injectable, Module } from "@nestjs/common";
import type { Env } from "./env.js";

/**
 * Typed replacement for @nestjs/config. Inject it anywhere and read keys
 * with full type safety.
 */
@Injectable()
export class ConfigService {
  constructor(private readonly env: Env) {}

  get<K extends keyof Env>(key: K): Env[K] {
    return this.env[key];
  }

  get all(): Readonly<Env> {
    return this.env;
  }
}

/**
 * Global module so every feature module can inject ConfigService without
 * importing this module explicitly.
 */
@Global()
@Module({})
export class AppConfigModule {
  static forRoot(env: Env): DynamicModule {
    return {
      module: AppConfigModule,
      providers: [{ provide: ConfigService, useValue: new ConfigService(env) }],
      exports: [ConfigService],
    };
  }
}
