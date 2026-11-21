import "reflect-metadata";
import { HttpStatus } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "./app.module.js";
import { DatabaseService } from "./common/database/database.service.js";
import { parseEnv } from "./common/config/env.js";

const testEnv = parseEnv({
  NODE_ENV: "test",
  LOG_LEVEL: "silent",
  DATABASE_URL: "postgresql://learnloop_app:learnloop_app_dev@localhost:5432/learnloop",
  REDIS_URL: "redis://localhost:6379",
});

describe("health endpoints", () => {
  describe("database up", () => {
    let app: INestApplication;

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [AppModule.forRoot(testEnv)],
      })
        .overrideProvider(DatabaseService)
        .useValue({
          db: { execute: () => Promise.resolve() },
          pool: { query: () => Promise.resolve(), end: () => Promise.resolve() },
        })
        .compile();
      app = moduleRef.createNestApplication();
      await app.init();
    });

    afterAll(async () => {
      await app.close();
    });

    it("live returns 200 with status ok and a correlation ID", async () => {
      const response = await request(app.getHttpServer())
        .get("/health/live")
        .expect(200);

      expect(response.body).toEqual({ status: "ok" });
      expect(response.headers["x-request-id"]).toBeTruthy();
    });

    it("ready returns 200 with database up", async () => {
      const response = await request(app.getHttpServer())
        .get("/health/ready")
        .expect(200);

      expect(response.body).toEqual({
        status: "ok",
        checks: { database: "up", redis: "not_configured" },
      });
    });
  });

  describe("database down", () => {
    let app: INestApplication;

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [AppModule.forRoot(testEnv)],
      })
        .overrideProvider(DatabaseService)
        .useValue({
          db: { execute: () => Promise.reject(new Error("boom")) },
          pool: { query: () => Promise.reject(new Error("boom")), end: () => Promise.resolve() },
        })
        .compile();
      app = moduleRef.createNestApplication();
      await app.init();
    });

    afterAll(async () => {
      await app.close();
    });

    it("live returns 200 (independent of the database)", async () => {
      await request(app.getHttpServer()).get("/health/live").expect(200);
    });

    it("ready returns 503 with database down", async () => {
      const response = await request(app.getHttpServer())
        .get("/health/ready")
        .expect(HttpStatus.SERVICE_UNAVAILABLE);

      expect(response.body.status).toBe("unavailable");
      expect(response.body.checks.database).toBe("down");
    });
  });
});
