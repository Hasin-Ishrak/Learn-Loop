
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { Logger } from "nestjs-pino";
import { AppModule } from "./app.module.js";
import { loadEnv } from "./common/config/env.js";

async function bootstrap(): Promise<void> {
  // Validate env before Nest is constructed so misconfiguration fails fast.
  const env = loadEnv();

  const app = await NestFactory.create(AppModule.forRoot(env), {
    bufferLogs: true,
  });

  app.useLogger(app.get(Logger));
  // Handles SIGTERM/SIGINT and runs OnModuleDestroy/OnApplicationShutdown hooks.
  app.enableShutdownHooks();

  await app.listen(env.API_PORT);
  app.get(Logger).log(`API listening on port ${env.API_PORT}`);
}

bootstrap().catch((error: unknown) => {
  console.error("API failed to start:", error);
  process.exit(1);
});
