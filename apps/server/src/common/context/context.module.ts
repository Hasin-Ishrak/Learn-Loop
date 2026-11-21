import { DynamicModule, Module } from "@nestjs/common";
import type { IncomingMessage } from "node:http";
import { randomUUID } from "node:crypto";
import { ClsModule } from "nestjs-cls";
import { getCorrelationId } from "../logging/correlation-id.js";

export const CORRELATION_ID_KEY = "correlationId";

/**
 * Global CLS setup. The middleware runs for every HTTP request and stores the
 * correlation ID so any service can read it via ClsService#get.
 */
@Module({})
export class ContextModule {
  static forRoot(): DynamicModule {
    return {
      module: ContextModule,
      imports: [
        ClsModule.forRoot({
          global: true,
          middleware: {
            mount: true,
            generateId: true,
            idGenerator: (req: IncomingMessage) => {
              // Mirror the ID onto req.id so pino's genReqId reuses the same
              // value regardless of which middleware runs first.
              const correlationId = getCorrelationId(req) ?? randomUUID();
              (req as IncomingMessage & { id?: string }).id = correlationId;
              return correlationId;
            },
            setup: (cls) => {
              cls.set(CORRELATION_ID_KEY, cls.getId());
            },
          },
        }),
      ],
      exports: [ClsModule],
    };
  }
}
