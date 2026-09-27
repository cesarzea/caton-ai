import type {Money} from './money.ts';

/** A balance reported by the account's institution. */
export interface Balance {
  readonly accountId: string;
  /** ISO 20022 balance type, e.g. "CLBD" (closing booked) or "ITAV" (interim available). */
  readonly type: string;
  readonly amount: Money;
  readonly referenceDate: string | null;
}
