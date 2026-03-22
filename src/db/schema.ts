/**
 * Drizzle schema helpers for Claudestack.
 * Re-exports Drizzle's SQLite schema builders for convenience.
 *
 * Usage:
 *   import { sqliteTable, text, integer } from "claudestack/db/schema";
 *   import { getDatabase } from "claudestack/db/database";
 *
 *   export const users = sqliteTable("users", {
 *     id: integer("id").primaryKey({ autoIncrement: true }),
 *     name: text("name").notNull(),
 *     email: text("email").notNull().unique(),
 *   });
 */

export {
  sqliteTable,
  text,
  integer,
  real,
  blob,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export { relations } from "drizzle-orm";
export { eq, ne, gt, gte, lt, lte, like, and, or, desc, asc, sql } from "drizzle-orm";
