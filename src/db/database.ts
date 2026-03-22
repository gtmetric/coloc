/**
 * Claudestack database — Drizzle ORM with Bun's built-in SQLite.
 */

import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { mkdirSync, existsSync } from "fs";

let _sqlite: Database | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

/** Get the raw Bun SQLite database instance */
export function getSQLite(path = "data/claudestack.db"): Database {
  if (!_sqlite) {
    const dir = path.substring(0, path.lastIndexOf("/"));
    if (dir && !existsSync(dir)) mkdirSync(dir, { recursive: true });

    _sqlite = new Database(path, { create: true });
    _sqlite.exec("PRAGMA journal_mode = WAL");
    _sqlite.exec("PRAGMA foreign_keys = ON");
  }
  return _sqlite;
}

/** Get the Drizzle database instance */
export function getDatabase(path = "data/claudestack.db") {
  if (!_db) {
    _db = drizzle(getSQLite(path));
  }
  return _db;
}

export function closeDatabase(): void {
  if (_sqlite) {
    _sqlite.close();
    _sqlite = null;
    _db = null;
  }
}
