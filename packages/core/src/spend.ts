import {addMoney, money} from './money.ts';
import type {Money} from './money.ts';
import {splitByMonth} from './split.ts';
import {spendItems} from './spend-items.ts';
import type {LinkedDocument, SpendItem} from './spend-items.ts';
import type {Transaction} from './transaction.ts';

/**
 * `cash` counts spending when money left; `accrual` spreads it over the service period its
 * documents state, and counts it when it left otherwise.
 */
export type SpendBasis = 'cash' | 'accrual';

export interface MonthlySpend {
  /** Calendar month, `YYYY-MM`. */
  readonly month: string;
  /** Spending known from accounts and from documents alone. */
  readonly total: Money;
  /** The part of `total` that only documents report, such as charges of a card no account reads. */
  readonly onlyInDocuments: Money;
  /** Receipts no account shows, not in `total`: they may already be in a card's statement. */
  readonly notSeen: Money;
}

interface Bucket {
  total: Money;
  onlyInDocuments: Money;
  notSeen: Money;
}

function add(totals: Map<string, Bucket>, month: string, amount: Money, item: SpendItem): void {
  const key = `${month} ${amount.currency}`;
  const zero = money(0, amount.currency);
  const bucket = totals.get(key) ?? {total: zero, onlyInDocuments: zero, notSeen: zero};
  const plus = (value: Money, counts: boolean): Money => (counts ? addMoney(value, amount) : value);
  totals.set(key, {
    total: plus(bucket.total, item.source !== 'not-seen'),
    onlyInDocuments: plus(bucket.onlyInDocuments, item.source === 'documents'),
    notSeen: plus(bucket.notSeen, item.source === 'not-seen'),
  });
}

function partsOf(item: SpendItem, basis: SpendBasis): {month: string; amount: Money}[] {
  return basis === 'accrual' && item.period !== null
    ? splitByMonth(item.amount, item.period.start, item.period.end)
    : [{month: item.date.slice(0, 7), amount: item.amount}];
}

/** Spending per calendar month and currency, oldest first, on either basis. */
export function monthlySpend(
  transactions: readonly Transaction[],
  documents: readonly LinkedDocument[],
  basis: SpendBasis = 'cash',
): MonthlySpend[] {
  const totals = new Map<string, Bucket>();
  for (const item of spendItems(transactions, documents)) {
    partsOf(item, basis).forEach(({month, amount}) => {
      add(totals, month, amount, item);
    });
  }
  return [...totals.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => ({month: key.slice(0, 7), ...value}));
}
