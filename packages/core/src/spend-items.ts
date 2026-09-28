import type {FinancialDocument} from './document.ts';
import {negateMoney} from './money.ts';
import type {Money} from './money.ts';
import type {Transaction} from './transaction.ts';

/** A document with the transaction it was linked to, if any. */
export interface LinkedDocument {
  readonly document: FinancialDocument;
  readonly transactionId: string | null;
}

/**
 * Where a spending item is known from: a movement of an account; only a document, such as a
 * charge of a card no connection reads; or a receipt no account shows, which may already be in
 * a card statement and so is kept apart.
 */
export type SpendSource = 'account' | 'documents' | 'not-seen';

export interface SpendItem {
  readonly amount: Money;
  readonly date: string;
  /** The service period it pays for, when a document states it. */
  readonly period: {readonly start: string; readonly end: string} | null;
  readonly source: SpendSource;
}

function periodOf(document: FinancialDocument): SpendItem['period'] {
  const {periodStart, periodEnd} = document;
  return periodStart === null || periodEnd === null ? null : {start: periodStart, end: periodEnd};
}

const isOutflow = ({status, bookingDate, amount}: Transaction): boolean =>
  status === 'booked' && bookingDate !== null && amount.minorUnits < 0;

/** Verified charges and receipts no transaction reports. */
function documented(documents: readonly LinkedDocument[]): SpendItem[] {
  return documents.flatMap(({document, transactionId}) => {
    const {kind, verified, amount} = document;
    if (transactionId !== null || !verified || amount === null) {
      return [];
    }
    if (kind !== 'charge' && kind !== 'receipt') {
      return [];
    }
    const source: SpendSource = kind === 'charge' ? 'documents' : 'not-seen';
    return [{amount, date: document.issuedOn, period: periodOf(document), source}];
  });
}

/**
 * What was spent: booked outflows except payments that settle a statement (the card's own
 * charges are the spending), each with the service period of a document linked to it, plus
 * what only documents report.
 */
export function spendItems(
  transactions: readonly Transaction[],
  documents: readonly LinkedDocument[],
): SpendItem[] {
  const settlements = new Set(
    documents
      .filter(({document}) => document.kind === 'statement')
      .map(({transactionId}) => transactionId),
  );
  const periods = new Map(
    documents.flatMap(({document, transactionId}) => {
      const period = periodOf(document);
      return transactionId === null || period === null ? [] : [[transactionId, period] as const];
    }),
  );
  const fromAccounts = transactions
    .filter(transaction => isOutflow(transaction) && !settlements.has(transaction.id))
    .map(({id, bookingDate, amount}) => ({
      amount: negateMoney(amount),
      date: bookingDate ?? '',
      period: periods.get(id) ?? null,
      source: 'account' as const,
    }));
  return [...fromAccounts, ...documented(documents)];
}
