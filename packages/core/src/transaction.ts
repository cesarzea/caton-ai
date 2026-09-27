import type {Money} from './money.ts';

export type TransactionStatus = 'booked' | 'pending';

/** A movement on an account, normalised from any source. Dates are ISO `YYYY-MM-DD`. */
export interface Transaction {
  /** Stable identifier, namespaced by account, identical across repeated syncs. */
  readonly id: string;
  readonly accountId: string;
  readonly status: TransactionStatus;
  /** Date the bank booked the movement; `null` while it is still pending. */
  readonly bookingDate: string | null;
  readonly valueDate: string | null;
  /** Date the operation happened (for example the card payment), when the source provides it. */
  readonly transactionDate: string | null;
  /** Signed amount: negative when money leaves the account. */
  readonly amount: Money;
  readonly counterparty: string | null;
  readonly description: string;
  /** ISO 18245 merchant category code of card payments, when available. */
  readonly merchantCategoryCode: string | null;
}
