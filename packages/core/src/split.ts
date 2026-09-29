import {money} from './money.ts';
import type {Money} from './money.ts';

const DAY_MS = 86_400_000;

const monthOf = (day: number): string => new Date(day).toISOString().slice(0, 7);

/**
 * Splits an amount over the calendar months of a period, in proportion to its days, both ends
 * included. The parts add up exactly: the last month takes what rounding leaves.
 */
export function splitByMonth(
  amount: Money,
  start: string,
  end: string,
): {readonly month: string; readonly amount: Money}[] {
  const first = Date.parse(start);
  const last = Math.max(first, Date.parse(end));
  const days = new Map<string, number>();
  for (let day = first; day <= last; day += DAY_MS) {
    days.set(monthOf(day), (days.get(monthOf(day)) ?? 0) + 1);
  }
  const total = (last - first) / DAY_MS + 1;
  let given = 0;
  return [...days].map(([month, count], index, all) => {
    const share =
      index === all.length - 1
        ? amount.minorUnits - given
        : Math.round((amount.minorUnits * count) / total);
    given += share;
    return {month, amount: money(share, amount.currency)};
  });
}
