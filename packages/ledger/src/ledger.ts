import type {DatabaseSync} from 'node:sqlite';

import type {Account, Balance, DocumentLink, FinancialDocument, Transaction} from '@caton-ai/core';

import {openDatabase, openDatabaseReadOnly} from './database.ts';
import {insertLinks, readDocuments, readState, readUnlinkedDocuments} from './documents.ts';
import type {LedgerDocument} from './documents.ts';
import {insertModelCall, readModelSpend} from './model-calls.ts';
import type {ModelCallRecord, ModelSpend} from './model-calls.ts';
import {searchTransactions} from './query.ts';
import type {TransactionPage, TransactionQuery} from './query.ts';
import {readAccounts, readLastRun, readLatestBalances, readTransactions} from './read.ts';
import type {SyncRun} from './read.ts';
import {saveFailure, saveSnapshot} from './write.ts';
import type {SyncFailure, SyncSnapshot} from './write.ts';

/** Everything that can be read from the ledger. */
export interface LedgerReader {
  accounts(): Account[];
  transactions(fromDate: string): Transaction[];
  searchTransactions(query: TransactionQuery): TransactionPage;
  latestBalances(): Balance[];
  /** Latest run of a source, successful or not: what decides whether totals are trustworthy. */
  lastRun(source: string): SyncRun | null;
  lastSuccessfulRun(source: string): SyncRun | null;
  documents(fromDate: string): LedgerDocument[];
  unlinkedDocuments(): FinancialDocument[];
  /** The value a connection kept at its last saved sync, or null. */
  connectorState(source: string): unknown;
  /** What language model calls made since `from` cost, per model. */
  modelSpend(from: string): ModelSpend[];
  close(): void;
}

/** The local ledger: the single store of every account, movement and balance. */
export interface Ledger extends LedgerReader {
  saveSync(snapshot: SyncSnapshot): void;
  recordFailure(failure: SyncFailure): void;
  recordModelCall(call: ModelCallRecord): void;
  /** Links made by matching; a document already linked keeps its link. */
  linkDocuments(links: readonly DocumentLink[], linkedAt: Date): void;
}

/** Opens (creating and migrating if needed) the ledger at `path`; `:memory:` for tests. */
export function openLedger(path: string): Ledger {
  const database = openDatabase(path);
  return {
    ...readerOver(database),
    saveSync: snapshot => {
      saveSnapshot(database, snapshot);
    },
    recordFailure: failure => {
      saveFailure(database, failure);
    },
    recordModelCall: call => {
      insertModelCall(database, call);
    },
    linkDocuments: (links, linkedAt) => {
      insertLinks(database, links, linkedAt.toISOString());
    },
  };
}

/** Opens an existing ledger that can only be read, never created, migrated or written. */
export function openLedgerReadOnly(path: string): LedgerReader {
  return readerOver(openDatabaseReadOnly(path));
}

function readerOver(database: DatabaseSync): LedgerReader {
  return {
    accounts: () => readAccounts(database),
    transactions: fromDate => readTransactions(database, fromDate),
    searchTransactions: query => searchTransactions(database, query),
    latestBalances: () => readLatestBalances(database),
    lastRun: source => readLastRun(database, source, false),
    lastSuccessfulRun: source => readLastRun(database, source, true),
    modelSpend: from => readModelSpend(database, from),
    documents: fromDate => readDocuments(database, fromDate),
    unlinkedDocuments: () => readUnlinkedDocuments(database),
    connectorState: source => readState(database, source),
    close: () => {
      database.close();
    },
  };
}
