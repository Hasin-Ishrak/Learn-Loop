import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { Logger } from "nestjs-pino";
import { loadEnv } from "./common/config/env.js";
import { WorkerModule } from "./worker.module.js";

async function bootstrap(): Promise<void> {
  const env = loadEnv();

  const app = await NestFactory.createApplicationContext(
    WorkerModule.forRoot(env),
    { bufferLogs: true },
  );

  app.useLogger(app.get(Logger));
  // Graceful shutdown on SIGTERM/SIGINT.
  app.enableShutdownHooks();

  // An application context has no HTTP listener, so Node would exit as soon as
  // bootstrap resolves. Hold the event loop open until a signal shuts us down.
  setInterval(() => {}, 60_000);

  app.get(Logger).log("worker started");
}

bootstrap().catch((error: unknown) => {
  console.error("Worker failed to start:", error);
  process.exit(1);
});
