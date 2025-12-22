/**
 * Database Connection Module
 *
 * Configures and exports the SQLite database connection using better-sqlite3 and Drizzle ORM.
 * Handles database file creation, directory setup, and performance optimizations.
 */

import "./config"; // Load environment variables first
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from "@shared/schema";
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

// Determine database path from environment variable or default to ./data/distaf.db
const dbDir = process.env.DB_PATH || join(process.cwd(), 'data');
const dbPath = join(dbDir, 'distaf.db');

// Ensure data directory exists before creating database file
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

console.log(`SQLite database path: ${dbPath}`);

// Create SQLite connection (file is created automatically if it doesn't exist)
const sqlite = new Database(dbPath);

/**
 * Enable foreign key constraints
 * CRITICAL: Without this, ON DELETE CASCADE won't work,
 * leading to orphaned records when deleting related data
 */
sqlite.pragma('foreign_keys = ON');

/**
 * Performance optimizations:
 *
 * journal_mode = WAL (Write-Ahead Logging):
 * - Allows concurrent reads while writing
 * - Improves performance for applications with many readers
 *
 * synchronous = NORMAL:
 * - Balances durability with performance
 * - Faster than FULL, but still protects against corruption
 */
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('synchronous = NORMAL');

// Create Drizzle ORM instance with schema for type-safe queries
export const db = drizzle(sqlite, { schema });

// Export raw SQLite connection for use in session store
export { sqlite };
