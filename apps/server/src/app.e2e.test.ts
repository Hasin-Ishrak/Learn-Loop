import "reflect-metadata";
import { HttpStatus } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "./app.module.js";
import { DatabaseService } from "./common/database/database.service.js";
import { RedisService } from "./common/redis/redis.service.js";
import { getCorsOptions } from "./common/cors/cors-options.js";
import { parseEnv } from "./common/config/env.js";

const testEnv = parseEnv({
  NODE_ENV: "test",
  LOG_LEVEL: "silent",
  DATABASE_URL: "postgresql://learnloop_app:learnloop_app_dev@localhost:5432/learnloop",
  REDIS_URL: "redis://localhost:6379",
  WEB_ORIGIN: "http://localhost:5173",
});



describe("health endpoints", () => {
  describe("both up", () => {
    let app: INestApplication;
    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [AppModule.forRoot(testEnv)],
      })
        .overrideProvider(DatabaseService)
        .useValue({ pool: { query: () => Promise.resolve(), end: () => Promise.resolve() } })
        .overrideProvider(RedisService)
        .useValue({ ping: () => Promise.resolve("PONG"), quit: () => Promise.resolve() })
        .compile();
      app = moduleRef.createNestApplication();
      app.enableCors(getCorsOptions(testEnv));
      await app.init();
    });
    afterAll(async () => app.close());

    it("live returns 200", async () => {
      const res = await request(app.getHttpServer()).get("/health/live").expect(200);
      expect(res.body).toEqual({ status: "ok" });
      expect(res.headers["x-request-id"]).toBeTruthy();
    });

    it("ready returns 200 with both up", async () => {
      const res = await request(app.getHttpServer()).get("/health/ready").expect(200);
      expect(res.body).toEqual({
        status: "ok",
        checks: { database: "up", redis: "up" },
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
        .useValue({ pool: { query: () => Promise.reject(new Error("boom")), end: () => Promise.resolve() } })
        .overrideProvider(RedisService)
        .useValue({ ping: () => Promise.resolve("PONG"), quit: () => Promise.resolve() })
        .compile();
      app = moduleRef.createNestApplication();
      app.enableCors(getCorsOptions(testEnv));
      await app.init();
    });
    afterAll(async () => app.close());

    it("live returns 200", async () => {
      await request(app.getHttpServer()).get("/health/live").expect(200);
    });

    it("ready returns 503", async () => {
      const res = await request(app.getHttpServer())
        .get("/health/ready")
        .expect(HttpStatus.SERVICE_UNAVAILABLE);
      expect(res.body.status).toBe("unavailable");
      expect(res.body.checks.database).toBe("down");
    });
  });

  describe("redis down", () => {
    let app: INestApplication;
    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [AppModule.forRoot(testEnv)],
      })
        .overrideProvider(DatabaseService)
        .useValue({ pool: { query: () => Promise.resolve(), end: () => Promise.resolve() } })
        .overrideProvider(RedisService)
        .useValue({ ping: () => Promise.reject(new Error("boom")), quit: () => Promise.resolve() })
        .compile();
      app = moduleRef.createNestApplication();
      app.enableCors(getCorsOptions(testEnv));
      await app.init();
    });
    afterAll(async () => app.close());

    it("ready returns 503", async () => {
      const res = await request(app.getHttpServer())
        .get("/health/ready")
        .expect(HttpStatus.SERVICE_UNAVAILABLE);
      expect(res.body.checks.redis).toBe("down");
    });
  });
});

describe("CORS", () => {
  let app: INestApplication;
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule.forRoot(testEnv)],
    })
      .overrideProvider(DatabaseService)
      .useValue({ pool: { query: () => Promise.resolve(), end: () => Promise.resolve() } })
      .overrideProvider(RedisService)
      .useValue({ ping: () => Promise.resolve("PONG"), quit: () => Promise.resolve() })
      .compile();
    app = moduleRef.createNestApplication();
    app.enableCors(getCorsOptions(testEnv));
    await app.init();
  });
  afterAll(async () => app.close());

  it("allowlisted origin gets Access-Control-Allow-Origin", async () => {
    const res = await request(app.getHttpServer())
      .get("/health/live")
      .set("Origin", "http://localhost:5173")
      .expect(200);
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
  });

  it("unknown origin gets no Access-Control-Allow-Origin", async () => {
    const res = await request(app.getHttpServer())
      .get("/health/live")
      .set("Origin", "https://evil.example")
      .expect(200);
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
