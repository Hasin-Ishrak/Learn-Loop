import { DynamicModule, Module } from "@nestjs/common";
import { LoggerModule } from "nestjs-pino";
import type { Env } from "../config/env.js";
import { getCorrelationId, resolveCorrelationId } from "./correlation-id.js";

@Module({})
export class AppLoggerModule {
  static forRoot(env: Env): DynamicModule {
    const isDevelopment = env.NODE_ENV === "development";

    return {
      module: AppLoggerModule,
      imports: [
        LoggerModule.forRoot({
          pinoHttp: {
            level: env.LOG_LEVEL,
            // Human-readable locally, newline-delimited JSON in production.
            ...(isDevelopment
              ? {
                  transport: {
                    target: "pino-pretty",
                    options: {
                      colorize: true,
                      singleLine: true,
                      translateTime: "SYS:standard",
                    },
                  },
                }
              : {}),
            // Assigns req.id, sets the response header, and lets pino reuse
            // an incoming x-request-id header.
            genReqId: (req, res) => resolveCorrelationId(req, res),
            customProps: (req) => ({
              correlationId: getCorrelationId(req),
            }),
            redact: {
              paths: [
                "req.headers.authorization",
                "req.headers.cookie",
                'res.headers["set-cookie"]',
              ],
              censor: "[REDACTED]",
            },
          },
        }),
      ],
      exports: [LoggerModule],
    };
  }
}
