import { Logger, OnModuleDestroy } from "@nestjs/common";
import { Redis } from "ioredis";
import type { ConnectionOptions } from "bullmq";

/**
 * Creates ONE general-purpose ioredis client for health checks, caching, etc.
 * Do NOT reuse this client for BullMQ workers — BullMQ needs its own
 * connections with `maxRetriesPerRequest: null` (see getBullMQConnectionOptions).
 */
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;

  constructor(connectionString: string) {
    this.client = new Redis(connectionString, {
      // Fail fast-ish but never crash the process on connection errors.
      lazyConnect: false,
    });

    this.client.on("error", (err: Error) => {
      this.logger.error({ err }, "redis client error");
    });
  }

  get redis(): Redis {
    return this.client;
  }

  async ping(): Promise<string> {
    return this.client.ping();
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.client.quit();
    } catch (err) {
      this.logger.warn({ err }, "redis quit failed");
    }
  }
}

/**
 * Build BullMQ connection options from a Redis URL.
 *
 * Workers issue blocking commands (BRPOPLPUSH / XREADGROUP) and BullMQ
 * requires `maxRetriesPerRequest: null` for those, otherwise ioredis throws
 * "maxRetriesPerRequest reached" and the worker dies. Producers (API) can keep
 * the default, but passing `null` everywhere is harmless; we only force it for
 * workers to make the intent explicit.
 */
export function getBullMQConnectionOptions(
  connectionString: string,
  worker = false,
): ConnectionOptions {
  return {
    url: connectionString,
    ...(worker ? { maxRetriesPerRequest: null } : {}),
  } as ConnectionOptions;
}
