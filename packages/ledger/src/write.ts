import type {DatabaseSync} from 'node:sqlite';

import type {Account, Balance, Transaction} from '@caton-ai/core';

import {inTransaction} from './database.ts';

/** Everything one sync read from one account. */
export interface AccountSnapshot {
  readonly account: Account;
  readonly transactions: readonly Transaction[];
  readonly balances: readonly Balance[];
}

export interface SyncSnapshot {
  readonly source: string;
  readonly startedAt: Date;
  readonly finishedAt: Date;
  readonly accounts: readonly AccountSnapshot[];
}

export interface SyncFailure {
  readonly source: string;
  readonly startedAt: Date;
  readonly finishedAt: Date;
  readonly error: string;
}

/**
 * Stores a successful sync atomically. Pending movements of each account are replaced by the
 * fresh ones, so a pending movement that becomes booked under a new id is never counted twice.
 */
export function saveSnapshot(database: DatabaseSync, snapshot: SyncSnapshot): void {
  const seenAt = snapshot.finishedAt.toISOString();
  inTransaction(database, () => {
    for (const {account, transactions, balances} of snapshot.accounts) {
      upsertAccount(database, account, seenAt);
      database
        .prepare(`DELETE FROM transactions WHERE account_id = $id AND status = 'pending'`)
        .run({id: account.id});
      transactions.forEach(item => {
        upsertTransaction(database, item, seenAt);
      });
      balances.forEach(item => {
        insertBalance(database, item, seenAt);
      });
    }
    insertRun(database, {...snapshot, error: null});
  });
}

export function saveFailure(database: DatabaseSync, failure: SyncFailure): void {
  insertRun(database, failure);
}

function upsertAccount(database: DatabaseSync, account: Account, seenAt: string): void {
  database
    .prepare(
      `INSERT INTO accounts (id, source, source_ref, institution, name, currency, updated_at)
       VALUES ($id, $source, $sourceRef, $institution, $name, $currency, $seenAt)
       ON CONFLICT (id) DO UPDATE SET source_ref = excluded.source_ref, name = excluded.name,
         institution = excluded.institution, updated_at = excluded.updated_at`,
    )
    .run({
      id: account.id,
      source: account.source,
      sourceRef: account.sourceRef,
      institution: account.institution,
      name: account.name,
      currency: account.currency,
      seenAt,
    });
}

function upsertTransaction(database: DatabaseSync, item: Transaction, seenAt: string): void {
  database
    .prepare(
      `INSERT INTO transactions (id, account_id, status, booking_date, value_date, transaction_date,
         amount_minor, currency, counterparty, description, merchant_category_code, first_seen_at, last_seen_at)
       VALUES ($id, $accountId, $status, $bookingDate, $valueDate, $transactionDate, $amountMinor,
         $currency, $counterparty, $description, $merchantCategoryCode, $seenAt, $seenAt)
       ON CONFLICT (id) DO UPDATE SET status = excluded.status, booking_date = excluded.booking_date,
         value_date = excluded.value_date, transaction_date = excluded.transaction_date,
         amount_minor = excluded.amount_minor, currency = excluded.currency,
         counterparty = excluded.counterparty, description = excluded.description,
         merchant_category_code = excluded.merchant_category_code, last_seen_at = excluded.last_seen_at`,
    )
    .run({
      id: item.id,
      accountId: item.accountId,
      status: item.status,
      bookingDate: item.bookingDate,
      valueDate: item.valueDate,
      transactionDate: item.transactionDate,
      amountMinor: item.amount.minorUnits,
      currency: item.amount.currency,
      counterparty: item.counterparty,
      description: item.description,
      merchantCategoryCode: item.merchantCategoryCode,
      seenAt,
    });
}

function insertBalance(database: DatabaseSync, balance: Balance, seenAt: string): void {
  database
    .prepare(
      `INSERT INTO balances (account_id, type, amount_minor, currency, reference_date, observed_at)
       VALUES ($accountId, $type, $amountMinor, $currency, $referenceDate, $seenAt)`,
    )
    .run({
      accountId: balance.accountId,
      type: balance.type,
      amountMinor: balance.amount.minorUnits,
      currency: balance.amount.currency,
      referenceDate: balance.referenceDate,
      seenAt,
    });
}

interface RunRecord {
  readonly source: string;
  readonly startedAt: Date;
  readonly finishedAt: Date;
  readonly error: string | null;
}

function insertRun(database: DatabaseSync, run: RunRecord): void {
  database
    .prepare(
      `INSERT INTO sync_runs (source, started_at, finished_at, outcome, error)
       VALUES ($source, $startedAt, $finishedAt, $outcome, $error)`,
    )
    .run({
      source: run.source,
      startedAt: run.startedAt.toISOString(),
      finishedAt: run.finishedAt.toISOString(),
      outcome: run.error === null ? 'ok' : 'failed',
      error: run.error,
    });
}
