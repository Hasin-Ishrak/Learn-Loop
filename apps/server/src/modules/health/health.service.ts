import { Injectable, Logger } from "@nestjs/common";
import {
  HealthResponseSchema,
  type HealthCheckState,
  type HealthResponse,
  type HealthStatus,
} from "@learnloop/shared";
import { DatabaseService } from "../../common/database/database.service.js";

const DB_TIMEOUT_MS = 2000;

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly database: DatabaseService) {}

  live(): HealthResponse {
    return HealthResponseSchema.parse({ status: "ok" });
  }

  async ready(): Promise<HealthResponse> {
    const databaseState = await this.checkDatabase();
    const checks: Record<string, HealthCheckState> = {
      database: databaseState,
      redis: "not_configured",
    };

    const status: HealthStatus = databaseState === "up" ? "ok" : "unavailable";
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
            DB_TIMEOUT_MS,
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
}
