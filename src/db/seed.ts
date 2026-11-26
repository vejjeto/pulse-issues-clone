import { getEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createDatabase, resolveSqlitePath } from "./index";
import { seedDatabaseIfEmpty } from "./seed-data";

function main(): void {
  const env = getEnv();
  const dbPath = resolveSqlitePath(env.DATABASE_URL);
  const { sqlite } = createDatabase(dbPath, { autoSeed: false });
  const result = seedDatabaseIfEmpty(sqlite);
  sqlite.close();
  logger.info(
    { dbPath, seeded: result.seeded, issueCount: result.issueCount },
    result.seeded
      ? `Seeded ${result.issueCount} issues`
      : `Database already seeded (${result.issueCount} issues)`,
  );
}

main();
