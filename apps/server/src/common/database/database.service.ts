import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { createDb, type Db } from "@learnloop/db";

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  readonly db: Db;
  readonly pool: ReturnType<typeof createDb>["pool"];

  constructor(connectionString: string) {
    const { db, pool } = createDb(connectionString);
    this.db = db;
    this.pool = pool;
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
