import type {DatabaseSync} from 'node:sqlite';

import type {Account, Balance, Transaction} from '@caton-ai/core';

import {accountFrom, balanceFrom, optionalText, text, transactionFrom} from './rows.ts';

export interface SyncRun {
  readonly source: string;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly outcome: 'ok' | 'failed';
  readonly error: string | null;
}

export function readAccounts(database: DatabaseSync): Account[] {
  return database
    .prepare('SELECT * FROM accounts ORDER BY institution, name')
    .all()
    .map(accountFrom);
}

/** Transactions on or after `fromDate` (booking date, or operation date while pending). */
export function readTransactions(database: DatabaseSync, fromDate: string): Transaction[] {
  return database
    .prepare(
      `SELECT * FROM transactions
       WHERE COALESCE(booking_date, transaction_date, value_date, '9999-12-31') >= $fromDate
       ORDER BY COALESCE(booking_date, transaction_date, value_date) DESC, id`,
    )
    .all({fromDate})
    .map(transactionFrom);
}

/** The most recent observation of every balance type of every account. */
export function readLatestBalances(database: DatabaseSync): Balance[] {
  return database
    .prepare(
      `SELECT b.* FROM balances b
       WHERE b.observed_at = (SELECT MAX(observed_at) FROM balances WHERE account_id = b.account_id)
       ORDER BY b.account_id, b.type`,
    )
    .all()
    .map(balanceFrom);
}

export function readLastRun(database: DatabaseSync, source: string): SyncRun | null {
  const row = database
    .prepare('SELECT * FROM sync_runs WHERE source = $source ORDER BY id DESC LIMIT 1')
    .get({source});
  if (row === undefined) {
    return null;
  }
  return {
    source: text(row, 'source'),
    startedAt: text(row, 'started_at'),
    finishedAt: text(row, 'finished_at'),
    outcome: text(row, 'outcome') === 'ok' ? 'ok' : 'failed',
    error: optionalText(row, 'error'),
  };
}
