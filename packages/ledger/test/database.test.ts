import {mkdtempSync, rmSync, statSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import {afterEach, describe, expect, it} from 'vitest';

import {openLedger} from '../src/index.ts';
import {movement, snapshot} from './snapshot.ts';

const directories: string[] = [];

function temporaryLedgerPath(): string {
  const directory = mkdtempSync(join(tmpdir(), 'caton-ledger-'));
  directories.push(directory);
  return join(directory, 'ledger.sqlite');
}

afterEach(() => {
  directories.splice(0).forEach(directory => {
    rmSync(directory, {recursive: true, force: true});
  });
});

describe('ledger file', () => {
  it('is readable only by its owner', () => {
    const path = temporaryLedgerPath();
    openLedger(path).close();

    expect(statSync(path).mode & 0o777).toBe(0o600);
  });

  it('keeps its data and schema version across reopenings', () => {
    const path = temporaryLedgerPath();
    const first = openLedger(path);
    first.saveSync(snapshot([movement()]));
    first.close();

    const reopened = openLedger(path);
    expect(reopened.transactions('2026-01-01')).toHaveLength(1);
    reopened.close();
    const raw = new DatabaseSync(path);
    expect(raw.prepare('PRAGMA user_version').get()).toEqual({user_version: 4});
    raw.close();
  });
});
