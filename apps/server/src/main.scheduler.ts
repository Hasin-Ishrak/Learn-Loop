import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { Logger } from "nestjs-pino";
import { loadEnv } from "./common/config/env.js";
import { SchedulerModule } from "./scheduler.module.js";

async function bootstrap(): Promise<void> {
  const env = loadEnv();

  const app = await NestFactory.createApplicationContext(
    SchedulerModule.forRoot(env),
    { bufferLogs: true },
  );

  app.useLogger(app.get(Logger));
  // Graceful shutdown on SIGTERM/SIGINT.
  app.enableShutdownHooks();

  // An application context has no HTTP listener, so Node would exit as soon as
  // bootstrap resolves. Hold the event loop open until a signal shuts us down.
  setInterval(() => {}, 60_000);

  app.get(Logger).log("scheduler started");
}

bootstrap().catch((error: unknown) => {
  console.error("Scheduler failed to start:", error);
  process.exit(1);
});
