import "reflect-metadata";
import { HttpStatus } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { AppModule } from "./app.module.js";
import { DatabaseService } from "./common/database/database.service.js";
import { RedisService } from "./common/redis/redis.service.js";
import { getQueueToken } from "@nestjs/bullmq";
import { QUEUE_NAMES } from "@learnloop/shared";
import { parseEnv } from "./common/config/env.js";

const testEnv = parseEnv({
  // production disables Bull Board, which requires a real BullMQ queue;
  // this test fakes the queue, so Bull Board must stay off here.
  NODE_ENV: "production",
  LOG_LEVEL: "silent",
  DATABASE_URL: "postgresql://learnloop_app:learnloop_app_dev@localhost:5432/learnloop",
  REDIS_URL: "redis://localhost:6379",
});

describe("POST /demo/ping", () => {
  let app: INestApplication;
  const addMock = vi.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule.forRoot(testEnv)],
    })
      .overrideProvider(DatabaseService)
      .useValue({ pool: { query: () => Promise.resolve(), end: () => Promise.resolve() } })
      .overrideProvider(RedisService)
      .useValue({ ping: () => Promise.resolve("PONG"), quit: () => Promise.resolve() })
      .overrideProvider(getQueueToken(QUEUE_NAMES.demo))
      .useValue({ add: addMock })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => app.close());

  it("returns 202 and calls add with correct data + jobId", async () => {
    addMock.mockReset();
    addMock.mockResolvedValue({ id: "job-42" });

    const res = await request(app.getHttpServer())
      .post("/demo/ping")
      .set("x-request-id", "corr-123")
      .send({ message: "hello", jobKey: "key-1" })
      .expect(HttpStatus.ACCEPTED);

    expect(res.body).toEqual({ jobId: "job-42", queue: "demo" });
    expect(addMock).toHaveBeenCalledWith(
      "ping",
      expect.objectContaining({ message: "hello", correlationId: "corr-123" }),
      { jobId: "key-1" },
    );
  });

  it("returns 400 for empty message", async () => {
    await request(app.getHttpServer())
      .post("/demo/ping")
      .send({ message: "" })
      .expect(HttpStatus.BAD_REQUEST);
  });
});
