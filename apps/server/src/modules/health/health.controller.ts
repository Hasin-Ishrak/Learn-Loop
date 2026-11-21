import { Controller, Get, HttpException, HttpStatus } from "@nestjs/common";
import type { HealthResponse } from "@learnloop/shared";
import { HealthService } from "./health.service.js";

@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get("live")
  live(): HealthResponse {
    return this.healthService.live();
  }

  @Get("ready")
  async ready(): Promise<HealthResponse> {
    const result = await this.healthService.ready();
    if (result.status !== "ok") {
      throw new HttpException(result, HttpStatus.SERVICE_UNAVAILABLE);
    }
    return result;
  }
}
