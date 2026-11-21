import "reflect-metadata";
import type { INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "./app.module.js";
import { parseEnv } from "./common/config/env.js";

const testEnv = parseEnv({
  NODE_ENV: "test",
  LOG_LEVEL: "silent",
  DATABASE_URL: "postgresql://learnloop:learnloop@localhost:5432/learnloop",
  REDIS_URL: "redis://localhost:6379",
});

describe("GET /health/live", () => {
  let app: INestApplication;

  beforeAll(async () => {
    // Boots the real API module (middleware included) without listening.
    app = await NestFactory.create(AppModule.forRoot(testEnv), { logger: false });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns 200 with status ok and a correlation ID", async () => {
    const response = await request(app.getHttpServer())
      .get("/health/live")
      .expect(200);

    expect(response.body).toEqual({ status: "ok" });
    expect(response.headers["x-request-id"]).toBeTruthy();
  });
});
