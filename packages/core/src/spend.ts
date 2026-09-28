import {addMoney, money, negateMoney} from './money.ts';
import type {Money} from './money.ts';
import type {FinancialDocument} from './document.ts';
import type {Transaction} from './transaction.ts';

export interface MonthlyTotal {
  /** Calendar month, `YYYY-MM`. */
  readonly month: string;
  /** Positive total of the money that left the accounts in that month. */
  readonly total: Money;
}

/** A document with the transaction it was linked to, if any. */
export interface LinkedDocument {
  readonly document: FinancialDocument;
  readonly transactionId: string | null;
}

export interface MonthlySpend extends MonthlyTotal {
  /** The part of `total` that only documents report, such as charges of a card no account reads. */
  readonly onlyInDocuments: Money;
}

type Totals = Map<string, {total: Money; onlyInDocuments: Money}>;

function add(totals: Totals, day: string, amount: Money, onlyInDocuments: boolean): void {
  const key = `${day.slice(0, 7)} ${amount.currency}`;
  const zero = money(0, amount.currency);
  const previous = totals.get(key) ?? {total: zero, onlyInDocuments: zero};
  totals.set(key, {
    total: addMoney(previous.total, amount),
    onlyInDocuments: onlyInDocuments
      ? addMoney(previous.onlyInDocuments, amount)
      : previous.onlyInDocuments,
  });
}

const isOutflow = ({status, bookingDate, amount}: Transaction): boolean =>
  status === 'booked' && bookingDate !== null && amount.minorUnits < 0;

/** A verified charge that no transaction reports, such as one of a card no connection reads. */
const onlyDocumented = ({document, transactionId}: LinkedDocument): boolean =>
  document.kind === 'charge' &&
  document.verified &&
  document.amount !== null &&
  transactionId === null;

/**
 * Spending per calendar month and currency, oldest first: booked outflows except payments that
 * settle a statement (the card's own charges are the spending), plus verified charges that no
 * transaction reports, such as those of a card no connection reads.
 */
export function monthlySpend(
  transactions: readonly Transaction[],
  documents: readonly LinkedDocument[],
): MonthlySpend[] {
  const settlements = new Set(
    documents
      .filter(({document}) => document.kind === 'statement')
      .map(({transactionId}) => transactionId),
  );
  const totals: Totals = new Map();
  transactions
    .filter(transaction => isOutflow(transaction) && !settlements.has(transaction.id))
    .forEach(({bookingDate, amount}) => {
      add(totals, bookingDate ?? '', negateMoney(amount), false);
    });
  documents.filter(onlyDocumented).forEach(({document}) => {
    if (document.amount !== null) {
      add(totals, document.issuedOn, document.amount, true);
    }
  });
  return [...totals.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => ({month: key.slice(0, 7), ...value}));
}
