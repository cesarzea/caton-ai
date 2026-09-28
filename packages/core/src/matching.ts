import type {FinancialDocument} from './document.ts';
import type {Transaction} from './transaction.ts';

/** A document linked to the one transaction it is about. */
export interface DocumentLink {
  readonly documentId: string;
  readonly transactionId: string;
}

const DAY_MS = 86_400_000;

/** When a movement may be booked, in days from the document's date. */
interface Window {
  readonly from: number;
  readonly to: number;
}

/** A charge, refund or receipt is booked a few days around it; a statement is paid by its due date. */
function windowOf(document: FinancialDocument): Window | null {
  switch (document.kind) {
    case 'charge':
    case 'refund':
    case 'receipt':
      return {from: -3, to: 7};
    case 'statement': {
      const due =
        document.dueOn === null
          ? 35
          : (Date.parse(document.dueOn) - Date.parse(document.issuedOn)) / DAY_MS;
      return {from: -3, to: due + 7};
    }
    case 'renewal':
    case 'cancellation':
      return null;
  }
}

function dateOf(transaction: Transaction): string | null {
  return transaction.transactionDate ?? transaction.bookingDate ?? transaction.valueDate;
}

function fits(document: FinancialDocument, window: Window, transaction: Transaction): boolean {
  const {amount} = document;
  const date = dateOf(transaction);
  if (amount === null || date === null || amount.currency !== transaction.amount.currency) {
    return false;
  }
  const signed = document.kind === 'refund' ? amount.minorUnits : -amount.minorUnits;
  const days = (Date.parse(date) - Date.parse(document.issuedOn)) / DAY_MS;
  return transaction.amount.minorUnits === signed && days >= window.from && days <= window.to;
}

/**
 * Links each charge, refund or receipt to the one transaction that fits it, and each statement to
 * the one payment that settles it: same currency, the exact amount with the right sign, and a
 * date in the document's window. A document that several transactions fit, or none, stays
 * unlinked: it is reported, never guessed.
 */
export function matchDocuments(
  documents: readonly FinancialDocument[],
  transactions: readonly Transaction[],
): DocumentLink[] {
  return documents.flatMap(document => {
    const window = windowOf(document);
    const candidates =
      window === null
        ? []
        : transactions.filter(transaction => fits(document, window, transaction));
    const [only] = candidates;
    return candidates.length === 1 && only !== undefined
      ? [{documentId: document.id, transactionId: only.id}]
      : [];
  });
}
