/**
 * Auto-migration for Claudeopt.
 * Scans route schema files and creates tables using raw SQL from Drizzle table definitions.
 */

import { getSQLite } from "./database.ts";
import { getTableConfig } from "drizzle-orm/sqlite-core";
import type { Route } from "../router/types.ts";

/** Map Drizzle column types to SQLite types */
function columnToSQL(col: any): string {
  const parts: string[] = [`"${col.name}"`];

  // Map Drizzle type to SQLite type
  if (col.columnType === "SQLiteInteger") parts.push("integer");
  else if (col.columnType === "SQLiteText") parts.push("text");
  else if (col.columnType === "SQLiteReal") parts.push("real");
  else if (col.columnType === "SQLiteBlob") parts.push("blob");
  else parts.push("text"); // fallback

  if (col.primary) parts.push("primary key");
  if (col.autoIncrement) parts.push("autoincrement");
  if (col.notNull && !col.primary) parts.push("not null");
  if (col.isUnique) parts.push("unique");
  if (col.hasDefault && col.default !== undefined) {
    const d = col.default;
    if (typeof d === "string") parts.push(`default '${d}'`);
    else if (typeof d === "number" || typeof d === "boolean") parts.push(`default ${d}`);
  }

  return parts.join(" ");
}

/** Run table creation for all schema files in routes */
export async function syncSchemas(routes: Route[]) {
  const tablesCreated: string[] = [];

  for (const route of routes) {
    if (!route.schemaPath) continue;

    try {
      const schemaMod = await import(route.schemaPath);

      for (const [exportName, value] of Object.entries(schemaMod)) {
        if (!value || typeof value !== "object") continue;

        try {
          const config = getTableConfig(value as any);
          const columns = config.columns.map(columnToSQL);
          const sql = `CREATE TABLE IF NOT EXISTS "${config.name}" (${columns.join(", ")})`;
          getSQLite().exec(sql);
          tablesCreated.push(config.name);
        } catch {
          // Not a Drizzle table, skip
        }
      }
    } catch (err) {
      console.error(`  [WARN] Failed to sync schema from ${route.schemaPath}: ${err}`);
    }
  }

  if (tablesCreated.length > 0) {
    console.log(`  Synced ${tablesCreated.length} table(s): ${tablesCreated.join(", ")}`);
  }
}
