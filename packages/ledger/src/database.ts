import {chmodSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';

import {MIGRATIONS} from './migrations.ts';

const IN_MEMORY = ':memory:';

/**
 * Opens the ledger database, restricting the file to its owner before any data is written,
 * and applies pending migrations.
 */
export function openDatabase(path: string): DatabaseSync {
  const database = new DatabaseSync(path);
  if (path !== IN_MEMORY) {
    chmodSync(path, 0o600);
    database.exec('PRAGMA journal_mode = WAL');
  }
  database.exec('PRAGMA foreign_keys = ON');
  migrate(database);
  return database;
}

function migrate(database: DatabaseSync): void {
  const current = Number(database.prepare('PRAGMA user_version').get()?.['user_version'] ?? 0);
  MIGRATIONS.slice(current).forEach((migration, index) => {
    inTransaction(database, () => {
      database.exec(migration);
      database.exec(`PRAGMA user_version = ${String(current + index + 1)}`);
    });
  });
}

/** Runs `work` atomically: everything is committed, or nothing is. */
export function inTransaction(database: DatabaseSync, work: () => void): void {
  database.exec('BEGIN IMMEDIATE');
  try {
    work();
    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}
