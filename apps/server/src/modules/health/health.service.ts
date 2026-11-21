import { Injectable, Logger } from "@nestjs/common";
import {
  HealthResponseSchema,
  type HealthCheckState,
  type HealthResponse,
  type HealthStatus,
} from "@learnloop/shared";
import { DatabaseService } from "../../common/database/database.service.js";
import { RedisService } from "../../common/redis/redis.service.js";

const CHECK_TIMEOUT_MS = 2000;

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly redis: RedisService,
  ) {}

  live(): HealthResponse {
    return HealthResponseSchema.parse({ status: "ok" });
  }

  async ready(): Promise<HealthResponse> {
    const [dbResult, redisResult] = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const databaseState: HealthCheckState =
      dbResult.status === "fulfilled" ? dbResult.value : "down";
    const redisState: HealthCheckState =
      redisResult.status === "fulfilled" ? redisResult.value : "down";

    const checks: Record<string, HealthCheckState> = {
      database: databaseState,
      redis: redisState,
    };

    const status: HealthStatus =
      databaseState === "up" && redisState === "up" ? "ok" : "unavailable";

    return HealthResponseSchema.parse({ status, checks });
  }

  private async checkDatabase(): Promise<HealthCheckState> {
    let timer: NodeJS.Timeout | undefined;
    try {
      await Promise.race([
        this.database.pool.query("SELECT 1"),
        new Promise((_, reject) => {
          timer = setTimeout(
            () => reject(new Error("database check timed out")),
            CHECK_TIMEOUT_MS,
          );
        }),
      ]);
      return "up";
    } catch (error) {
      this.logger.error({ err: error }, "database readiness check failed");
      return "down";
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private async checkRedis(): Promise<HealthCheckState> {
    let timer: NodeJS.Timeout | undefined;
    try {
      await Promise.race([
        this.redis.ping(),
        new Promise((_, reject) => {
          timer = setTimeout(
            () => reject(new Error("redis check timed out")),
            CHECK_TIMEOUT_MS,
          );
        }),
      ]);
      return "up";
    } catch (error) {
      this.logger.error({ err: error }, "redis readiness check failed");
      return "down";
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
