import { Injectable } from "@nestjs/common";
import {
  HealthResponseSchema,
  type HealthCheckState,
  type HealthResponse,
} from "@learnloop/shared";

@Injectable()
export class HealthService {
  live(): HealthResponse {
    return HealthResponseSchema.parse({ status: "ok" });
  }

  /**
   * Readiness is always 200 for now. Each check is a separate method so real
   * database/Redis probes can replace the placeholders without changing the
   * response shape.
   */
  ready(): HealthResponse {
    const checks: Record<string, HealthCheckState> = {
      database: this.checkDatabase(),
      redis: this.checkRedis(),
    };

    return HealthResponseSchema.parse({ status: "ok", checks });
  }

  private checkDatabase(): HealthCheckState {
    return "not_configured";
  }

  private checkRedis(): HealthCheckState {
    return "not_configured";
  }
}
