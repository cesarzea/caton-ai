import {mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import {afterEach, describe, expect, it} from 'vitest';

import {LedgerUnavailableError, openLedger, openLedgerReadOnly} from '../src/index.ts';
import {account, movement, snapshot} from './snapshot.ts';

const directories: string[] = [];

function temporaryLedgerPath(): string {
  const directory = mkdtempSync(join(tmpdir(), 'caton-ledger-'));
  directories.push(directory);
  return join(directory, 'ledger.sqlite');
}

function databaseWithVersion(version: number): string {
  const path = temporaryLedgerPath();
  const database = new DatabaseSync(path);
  database.exec(`PRAGMA user_version = ${String(version)}`);
  database.close();
  return path;
}

afterEach(() => {
  directories.splice(0).forEach(directory => {
    rmSync(directory, {recursive: true, force: true});
  });
});

describe('read-only ledger', () => {
  it('reads what a writer saved, even while the writer stays open', () => {
    const path = temporaryLedgerPath();
    const writer = openLedger(path);
    writer.saveSync(snapshot([movement()]));

    const reader = openLedgerReadOnly(path);
    expect(reader.accounts()).toEqual([account]);
    expect(reader.transactions('2026-09-01')).toEqual([movement()]);
    expect(reader.lastSuccessfulRun('millennium')?.outcome).toBe('ok');
    reader.close();
    writer.close();
  });

  it('leaves the file byte for byte as it was', () => {
    const path = temporaryLedgerPath();
    const writer = openLedger(path);
    writer.saveSync(snapshot([movement()]));
    writer.close();
    const before = readFileSync(path);

    const reader = openLedgerReadOnly(path);
    reader.searchTransactions({limit: 10});
    reader.close();

    expect(readFileSync(path).equals(before)).toBe(true);
  });
});

describe('read-only ledger that cannot be read', () => {
  it('is reported when the ledger does not exist, without creating it', () => {
    const path = temporaryLedgerPath();

    expect(() => openLedgerReadOnly(path)).toThrow(LedgerUnavailableError);
    expect(() => readFileSync(path)).toThrow();
  });

  it('is reported, and never migrated, when the schema is older', () => {
    const path = databaseWithVersion(0);

    expect(() => openLedgerReadOnly(path)).toThrow(/older schema/u);
    const raw = new DatabaseSync(path);
    expect(raw.prepare('PRAGMA user_version').get()).toEqual({user_version: 0});
    raw.close();
  });

  it('is reported when the schema is newer than this version understands', () => {
    expect(() => openLedgerReadOnly(databaseWithVersion(99))).toThrow(/newer version/u);
  });
});
