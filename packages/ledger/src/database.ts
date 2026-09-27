import {chmodSync, existsSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import type {SQLOutputValue} from 'node:sqlite';

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
  registerFunctions(database);
  migrate(database);
  return database;
}

/** The ledger cannot be read: it does not exist yet, or its schema is not the expected one. */
export class LedgerUnavailableError extends Error {
  override readonly name = 'LedgerUnavailableError';
}

/**
 * Opens an existing ledger for reading only: it is never created or migrated, and SQLite refuses
 * any write on the connection.
 */
export function openDatabaseReadOnly(path: string): DatabaseSync {
  if (!existsSync(path)) {
    throw new LedgerUnavailableError('The ledger does not exist yet: run `caton sync` first');
  }
  const database = new DatabaseSync(path, {readOnly: true});
  database.exec('PRAGMA query_only = ON');
  registerFunctions(database);
  const version = schemaVersion(database);
  if (version !== MIGRATIONS.length) {
    database.close();
    throw new LedgerUnavailableError(
      version < MIGRATIONS.length
        ? 'The ledger uses an older schema: run `caton sync` to upgrade it'
        : 'The ledger was written by a newer version of Catón AI: upgrade it',
    );
  }
  return database;
}

/** Lower-cases and strips accents, so that "CAFETERÍA" and "cafeteria" compare equal. */
function fold(value: SQLOutputValue): string | null {
  return typeof value === 'string'
    ? value
        .normalize('NFD')
        .replaceAll(/\p{Diacritic}/gu, '')
        .toLowerCase()
    : null;
}

/** SQL functions the queries rely on; SQLite's own `lower()` only folds ASCII letters. */
function registerFunctions(database: DatabaseSync): void {
  database.function('fold', {deterministic: true}, fold);
}

function schemaVersion(database: DatabaseSync): number {
  return Number(database.prepare('PRAGMA user_version').get()?.['user_version'] ?? 0);
}

function migrate(database: DatabaseSync): void {
  const current = schemaVersion(database);
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
