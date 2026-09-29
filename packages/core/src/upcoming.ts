import type {FinancialDocument} from './document.ts';
import type {Money} from './money.ts';

/** A charge a renewal notice announces. */
export interface UpcomingCharge {
  readonly issuer: string;
  readonly amount: Money | null;
  readonly date: string;
  readonly account: string | null;
  readonly verified: boolean;
}

const dateOf = (notice: FinancialDocument): string =>
  notice.dueOn ?? notice.periodStart ?? notice.issuedOn;

const sameIssuer = (left: string, right: string): boolean =>
  left.trim().toLowerCase() === right.trim().toLowerCase();

/**
 * The charges renewal notices announce from `today` on, soonest first. A notice is dropped when
 * the same issuer sent a cancellation after it.
 */
export function upcomingCharges(
  documents: readonly FinancialDocument[],
  today: string,
): UpcomingCharge[] {
  const cancellations = documents.filter(document => document.kind === 'cancellation');
  return documents
    .filter(document => document.kind === 'renewal' && dateOf(document) >= today)
    .filter(
      notice =>
        !cancellations.some(
          cancel => sameIssuer(cancel.issuer, notice.issuer) && cancel.issuedOn >= notice.issuedOn,
        ),
    )
    .map(notice => ({
      issuer: notice.issuer,
      amount: notice.amount,
      date: dateOf(notice),
      account: notice.account,
      verified: notice.verified,
    }))
    .sort((left, right) => left.date.localeCompare(right.date));
}
