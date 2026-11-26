import fs from "node:fs";
import path from "node:path";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { type SqliteRemoteDatabase, drizzle } from "drizzle-orm/sqlite-proxy";
import * as schema from "./schema";
import { seedDatabaseIfEmpty } from "./seed-data";

export type AppDb = SqliteRemoteDatabase<typeof schema>;

export interface DatabaseBundle {
  db: AppDb;
  sqlite: DatabaseSync;
}

const CREATE_TABLES_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  issue_counter INTEGER NOT NULL DEFAULT 100
);

CREATE TABLE IF NOT EXISTS issues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  identifier TEXT NOT NULL UNIQUE,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Todo',
  priority TEXT NOT NULL DEFAULT 'Medium',
  type TEXT NOT NULL DEFAULT 'feature',
  time_spent_seconds INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS labels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS issue_labels (
  issue_id INTEGER NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  label_id INTEGER NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  PRIMARY KEY (issue_id, label_id)
);

CREATE TABLE IF NOT EXISTS focus_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  issue_id INTEGER NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  duration_seconds INTEGER NOT NULL,
  mode TEXT NOT NULL DEFAULT 'pomodoro',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_issues_project_status ON issues(project_id, status);
CREATE INDEX IF NOT EXISTS idx_issues_completed_at ON issues(completed_at);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_issue_id ON focus_sessions(issue_id);
`;

export function resolveSqlitePath(rawUrl?: string): string {
  const target = (rawUrl ?? process.env.DATABASE_URL ?? "").trim();
  if (target === ":memory:") {
    return ":memory:";
  }
  if (target.startsWith("file:")) {
    return path.resolve(process.cwd(), target.slice(5));
  }
  if (target.length > 0 && !target.startsWith("postgres")) {
    return path.resolve(process.cwd(), target);
  }
  return path.resolve(process.cwd(), "data/app.db");
}

export function initSchema(sqlite: DatabaseSync): void {
  sqlite.exec(CREATE_TABLES_SQL);
}

export function createDatabase(
  location?: string,
  options?: { autoSeed?: boolean },
): DatabaseBundle {
  const resolved = resolveSqlitePath(location);
  if (resolved !== ":memory:") {
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
  }

  const sqlite = new DatabaseSync(resolved);
  initSchema(sqlite);

  const db = drizzle<typeof schema>(
    async (
      sql: string,
      params: unknown[],
      method: "run" | "all" | "values" | "get",
    ) => {
      const stmt = sqlite.prepare(sql);
      const bound = params as SQLInputValue[];
      if (method === "run") {
        stmt.run(...bound);
        return { rows: [] };
      }
      stmt.setReturnArrays(true);
      if (method === "get") {
        const row = stmt.get(...bound);
        return { rows: (row ?? undefined) as unknown as unknown[] };
      }
      const rows = stmt.all(...bound);
      return { rows: rows as unknown as unknown[][] };
    },
    { schema },
  );

  if (options?.autoSeed !== false) {
    seedDatabaseIfEmpty(sqlite);
  }

  return { db, sqlite };
}

let cachedBundle: DatabaseBundle | null = null;
let cachedPath: string | null = null;

export function getDatabase(): DatabaseBundle {
  const resolved = resolveSqlitePath();
  if (!cachedBundle || cachedPath !== resolved) {
    cachedBundle = createDatabase(resolved, { autoSeed: true });
    cachedPath = resolved;
  }
  return cachedBundle;
}

export function getDb(): AppDb {
  return getDatabase().db;
}

export function resetCachedDatabase(): void {
  if (cachedBundle) {
    cachedBundle.sqlite.close();
    cachedBundle = null;
    cachedPath = null;
  }
}
