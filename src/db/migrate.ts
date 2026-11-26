import { getEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createDatabase, resolveSqlitePath } from "./index";

function main(): void {
  const env = getEnv();
  const dbPath = resolveSqlitePath(env.DATABASE_URL);
  const { sqlite } = createDatabase(dbPath, { autoSeed: false });
  sqlite.close();
  logger.info({ dbPath }, "Database schema initialized");
}

main();
