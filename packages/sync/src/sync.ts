import {PartialReadError} from '@caton-ai/core';
import type {FinancialDocument, TransactionSource} from '@caton-ai/core';
import type {AccountSnapshot, Ledger} from '@caton-ai/ledger';

import {syncFromDate} from './window.ts';

export interface SyncRequest {
  /** Name of the configured connection, e.g. "millennium". */
  readonly name: string;
  /**
   * Builds the source. It is called inside the sync, so that a misconfigured connection is
   * recorded as a failure like any other and the remaining connections still sync.
   */
  readonly source: () => TransactionSource;
  readonly ledger: Ledger;
  readonly now?: () => Date;
  /** The instance's state as the source left it after reading, saved with what it read. */
  readonly state?: () => {readonly value: unknown} | undefined;
}

export type SyncOutcome =
  | {
      readonly name: string;
      readonly ok: true;
      readonly accounts: number;
      readonly transactions: number;
      readonly documents: number;
    }
  | {readonly name: string; readonly ok: false; readonly error: string};

/** Reads the source and saves what it read, with its state, even when it stopped midway. */
async function readAndSave(
  request: SyncRequest,
  startedAt: Date,
  fromDate: string,
  now: () => Date,
): Promise<SyncOutcome> {
  const source = request.source();
  const accounts = await readAccounts(source, fromDate);
  const {documents, error} = await readDocuments(source, fromDate);
  const state = request.state?.();
  request.ledger.saveSync({
    source: request.name,
    startedAt,
    finishedAt: now(),
    accounts,
    documents,
    ...(state === undefined ? {} : {state}),
    error,
  });
  if (error !== null) {
    return {name: request.name, ok: false, error};
  }
  const transactions = accounts.reduce((sum, item) => sum + item.transactions.length, 0);
  const counts = {accounts: accounts.length, transactions, documents: documents.length};
  return {name: request.name, ok: true, ...counts};
}

/**
 * Syncs one connection into the ledger. A failure never throws: it is recorded in the ledger
 * (which is what turns the totals red) and returned, so other connections still sync.
 */
export async function syncConnection(request: SyncRequest): Promise<SyncOutcome> {
  const now = request.now ?? (() => new Date());
  const startedAt = now();
  const fromDate = syncFromDate(request.ledger.lastSuccessfulRun(request.name), startedAt);
  try {
    return await readAndSave(request, startedAt, fromDate, now);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    request.ledger.recordFailure({
      source: request.name,
      startedAt,
      finishedAt: now(),
      error: message,
    });
    return {name: request.name, ok: false, error: message};
  }
}

/** The source's documents; after a partial failure, what it read and why it stopped. */
async function readDocuments(
  source: TransactionSource,
  fromDate: string,
): Promise<{documents: readonly FinancialDocument[]; error: string | null}> {
  if (source.listDocuments === undefined) {
    return {documents: [], error: null};
  }
  try {
    return {documents: await source.listDocuments(fromDate), error: null};
  } catch (error) {
    if (error instanceof PartialReadError) {
      return {documents: error.documents, error: error.message};
    }
    throw error;
  }
}

async function readAccounts(
  source: TransactionSource,
  fromDate: string,
): Promise<AccountSnapshot[]> {
  const snapshots: AccountSnapshot[] = [];
  for (const account of await source.listAccounts()) {
    const transactions = await source.listTransactions(account, fromDate);
    const balances = await source.listBalances(account);
    snapshots.push({account, transactions, balances});
  }
  return snapshots;
}
