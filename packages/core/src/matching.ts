import type {FinancialDocument} from './document.ts';
import type {Transaction} from './transaction.ts';

/** A document linked to the one transaction it is about. */
export interface DocumentLink {
  readonly documentId: string;
  readonly transactionId: string;
}

const DAY_MS = 86_400_000;
/** How far a charge may be booked before or after the document's date. */
const DAYS_BEFORE = 3;
const DAYS_AFTER = 7;

const LINKABLE = new Set(['charge', 'refund', 'receipt']);

function dateOf(transaction: Transaction): string | null {
  return transaction.transactionDate ?? transaction.bookingDate ?? transaction.valueDate;
}

function fits(document: FinancialDocument, transaction: Transaction): boolean {
  const {amount} = document;
  const date = dateOf(transaction);
  if (amount === null || date === null || amount.currency !== transaction.amount.currency) {
    return false;
  }
  const signed = document.kind === 'refund' ? amount.minorUnits : -amount.minorUnits;
  const days = (Date.parse(date) - Date.parse(document.issuedOn)) / DAY_MS;
  return transaction.amount.minorUnits === signed && days >= -DAYS_BEFORE && days <= DAYS_AFTER;
}

/**
 * Links each charge, refund or receipt to the one transaction that fits it: same currency, the
 * exact amount with the right sign, and a date a few days around the document's. A document that
 * several transactions fit, or none, stays unlinked: it is reported, never guessed.
 */
export function matchDocuments(
  documents: readonly FinancialDocument[],
  transactions: readonly Transaction[],
): DocumentLink[] {
  return documents
    .filter(document => LINKABLE.has(document.kind))
    .flatMap(document => {
      const candidates = transactions.filter(transaction => fits(document, transaction));
      const [only] = candidates;
      return candidates.length === 1 && only !== undefined
        ? [{documentId: document.id, transactionId: only.id}]
        : [];
    });
}
