import {addMoney, money, negateMoney} from './money.ts';
import type {Money} from './money.ts';
import type {Transaction} from './transaction.ts';

export interface CounterpartyTotal {
  /** The counterparty, or the description when the bank gives none. */
  readonly name: string;
  /** Positive total of the money paid to it. */
  readonly total: Money;
  readonly movements: number;
}

/**
 * Who received the most money: booked outflows grouped by counterparty (or by description when
 * the bank gives no counterparty) and currency, largest first.
 */
export function topCounterparties(
  transactions: readonly Transaction[],
  limit: number,
): CounterpartyTotal[] {
  const totals = new Map<string, CounterpartyTotal>();
  for (const {status, amount, counterparty, description} of transactions) {
    if (status !== 'booked' || amount.minorUnits >= 0) {
      continue;
    }
    const name = (counterparty ?? description).trim();
    const key = `${amount.currency} ${name}`;
    const previous = totals.get(key) ?? {name, total: money(0, amount.currency), movements: 0};
    totals.set(key, {
      name,
      total: addMoney(previous.total, negateMoney(amount)),
      movements: previous.movements + 1,
    });
  }
  return [...totals.values()]
    .sort(
      (left, right) =>
        right.total.minorUnits - left.total.minorUnits || left.name.localeCompare(right.name),
    )
    .slice(0, limit);
}
