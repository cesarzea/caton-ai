import type {Money} from './money.ts';

/**
 * What a document is (ADR 0016): a card's `charge` alert, a `refund`, a `receipt` or invoice, a
 * `renewal` or `cancellation` notice, or an account `statement`.
 */
export const DOCUMENT_KINDS = [
  'charge',
  'refund',
  'receipt',
  'renewal',
  'cancellation',
  'statement',
] as const;

export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

/** A document about money, kept next to transactions and never merged into them. */
export interface FinancialDocument {
  /** Stable identifier from the source, identical across repeated syncs. */
  readonly id: string;
  readonly kind: DocumentKind;
  /** Who issued it, such as the merchant of a receipt. */
  readonly issuer: string;
  /** Positive: what was charged, refunded or is due. */
  readonly amount: Money | null;
  /** Dates are ISO `YYYY-MM-DD`. */
  readonly issuedOn: string;
  readonly periodStart: string | null;
  readonly periodEnd: string | null;
  readonly dueOn: string | null;
  /** Its reference, such as an invoice number. */
  readonly reference: string | null;
  /** Whether its origin and fields were checked, or it waits for the user's review. */
  readonly verified: boolean;
  /** Where it came from, for the user, such as the sender and subject of an email. */
  readonly origin: string;
}

/** A source that read some of its data before failing: what it read is still worth keeping. */
export class PartialReadError extends Error {
  override readonly name = 'PartialReadError';
  readonly documents: readonly FinancialDocument[];

  constructor(message: string, documents: readonly FinancialDocument[]) {
    super(message);
    this.documents = documents;
  }
}
