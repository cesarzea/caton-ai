import type {DatabaseSync} from 'node:sqlite';

import type {Transaction} from '@caton-ai/core';

import {transactionFrom} from './rows.ts';

/** Filters for a bounded search of movements; an absent or undefined filter is not applied. */
export interface TransactionQuery {
  /** Inclusive ISO dates, compared with the booking date (operation date while pending). */
  readonly from?: string | undefined;
  readonly to?: string | undefined;
  readonly accountId?: string | undefined;
  /** `in` for money received, `out` for money that left the account. */
  readonly direction?: 'in' | 'out' | undefined;
  /** Text searched in the description and the counterparty, ignoring case and accents. */
  readonly text?: string | undefined;
  readonly limit: number;
  readonly offset?: number | undefined;
}

/** One page of matching movements, newest first, and how many match in total. */
export interface TransactionPage {
  readonly transactions: Transaction[];
  readonly total: number;
}

const MATCHING = `
  WITH dated AS (
    SELECT *, COALESCE(booking_date, transaction_date, value_date) AS effective_date
    FROM transactions
  )
  SELECT %COLUMNS% FROM dated
  WHERE ($from IS NULL OR effective_date >= $from)
    AND ($to IS NULL OR effective_date <= $to)
    AND ($accountId IS NULL OR account_id = $accountId)
    AND ($direction IS NULL
      OR ($direction = 'in' AND amount_minor > 0)
      OR ($direction = 'out' AND amount_minor < 0))
    AND ($text IS NULL
      OR instr(fold(description || ' ' || COALESCE(counterparty, '')), fold($text)) > 0)`;

const PAGE_SQL = `${MATCHING.replace('%COLUMNS%', '*')}
  ORDER BY effective_date DESC, id LIMIT $limit OFFSET $offset`;

const COUNT_SQL = MATCHING.replace('%COLUMNS%', 'COUNT(*) AS total');

/** SQL parameters for the filters; an absent filter is bound as NULL, which disables it. */
function filterParameters(query: TransactionQuery): Record<string, string | null> {
  return {
    from: query.from ?? null,
    to: query.to ?? null,
    accountId: query.accountId ?? null,
    direction: query.direction ?? null,
    text: query.text ?? null,
  };
}

export function searchTransactions(
  database: DatabaseSync,
  query: TransactionQuery,
): TransactionPage {
  const filters = filterParameters(query);
  const transactions = database
    .prepare(PAGE_SQL)
    .all({...filters, limit: query.limit, offset: query.offset ?? 0})
    .map(transactionFrom);
  const total = Number(database.prepare(COUNT_SQL).get(filters)?.['total'] ?? 0);
  return {transactions, total};
}
