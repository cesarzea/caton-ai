import type {TransactionSource} from '@caton-ai/core';
import type {AccountSnapshot, Ledger} from '@caton-ai/ledger';

import {syncFromDate} from './window.ts';

export interface SyncRequest {
  /** Name of the configured connection, e.g. "millennium". */
  readonly name: string;
  readonly source: TransactionSource;
  readonly ledger: Ledger;
  readonly now?: () => Date;
}

export type SyncOutcome =
  | {
      readonly name: string;
      readonly ok: true;
      readonly accounts: number;
      readonly transactions: number;
    }
  | {readonly name: string; readonly ok: false; readonly error: string};

/**
 * Syncs one connection into the ledger. A failure never throws: it is recorded in the ledger
 * (which is what turns the totals red) and returned, so other connections still sync.
 */
export async function syncConnection(request: SyncRequest): Promise<SyncOutcome> {
  const now = request.now ?? (() => new Date());
  const startedAt = now();
  const fromDate = syncFromDate(request.ledger.lastSuccessfulRun(request.name), startedAt);
  try {
    const accounts = await readAccounts(request.source, fromDate);
    request.ledger.saveSync({source: request.name, startedAt, finishedAt: now(), accounts});
    const transactions = accounts.reduce((sum, item) => sum + item.transactions.length, 0);
    return {name: request.name, ok: true, accounts: accounts.length, transactions};
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
