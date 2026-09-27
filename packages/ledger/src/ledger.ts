import type {Account, Balance, Transaction} from '@caton-ai/core';

import {openDatabase} from './database.ts';
import {readAccounts, readLastRun, readLatestBalances, readTransactions} from './read.ts';
import type {SyncRun} from './read.ts';
import {saveFailure, saveSnapshot} from './write.ts';
import type {SyncFailure, SyncSnapshot} from './write.ts';

/** The local ledger: the single store of every account, movement and balance. */
export interface Ledger {
  saveSync(snapshot: SyncSnapshot): void;
  recordFailure(failure: SyncFailure): void;
  accounts(): Account[];
  transactions(fromDate: string): Transaction[];
  latestBalances(): Balance[];
  lastRun(source: string): SyncRun | null;
  close(): void;
}

/** Opens (creating and migrating if needed) the ledger at `path`; `:memory:` for tests. */
export function openLedger(path: string): Ledger {
  const database = openDatabase(path);
  return {
    saveSync: snapshot => {
      saveSnapshot(database, snapshot);
    },
    recordFailure: failure => {
      saveFailure(database, failure);
    },
    accounts: () => readAccounts(database),
    transactions: fromDate => readTransactions(database, fromDate),
    latestBalances: () => readLatestBalances(database),
    lastRun: source => readLastRun(database, source),
    close: () => {
      database.close();
    },
  };
}
