import {addMoney, money, negateMoney} from './money.ts';
import type {Money} from './money.ts';
import type {Transaction} from './transaction.ts';

export interface MonthlyTotal {
  /** Calendar month, `YYYY-MM`. */
  readonly month: string;
  /** Positive total of the money that left the accounts in that month. */
  readonly total: Money;
}

/** Booked outflows per calendar month and currency (cash basis), oldest month first. */
export function monthlyOutflows(transactions: readonly Transaction[]): MonthlyTotal[] {
  const totals = new Map<string, Money>();
  for (const transaction of transactions) {
    const {bookingDate, amount, status} = transaction;
    if (status !== 'booked' || bookingDate === null || amount.minorUnits >= 0) {
      continue;
    }
    const key = `${bookingDate.slice(0, 7)} ${amount.currency}`;
    const previous = totals.get(key) ?? money(0, amount.currency);
    totals.set(key, addMoney(previous, negateMoney(amount)));
  }
  return [...totals.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, total]) => ({month: key.slice(0, 7), total}));
}
