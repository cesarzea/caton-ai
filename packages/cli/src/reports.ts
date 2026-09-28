import type {DocumentInfo, SpendMonth, UpcomingCharge as UpcomingInfo} from '@caton-ai/api';
import {firstDayOfLastMonths, moneyToDecimal, monthlySpend, upcomingCharges} from '@caton-ai/core';
import type {MonthlySpend, UpcomingCharge} from '@caton-ai/core';
import type {LedgerDocument, LedgerReader} from '@caton-ai/ledger';
import type {Reports} from '@caton-ai/server';

const DAY_MS = 86_400_000;
/** How far back the page looks for spending and documents. */
const MONTHS = 12;

const day = (date: Date): string => date.toISOString().slice(0, 10);

const monthView = ({month, total, onlyInDocuments, notSeen}: MonthlySpend): SpendMonth => ({
  month,
  currency: total.currency,
  total: moneyToDecimal(total),
  onlyInDocuments: moneyToDecimal(onlyInDocuments),
  notSeen: moneyToDecimal(notSeen),
});

function documentView({document, transactionId}: LedgerDocument): DocumentInfo {
  const {id: _id, amount, ...fields} = document;
  return {
    ...fields,
    amount: amount === null ? null : moneyToDecimal(amount),
    currency: amount?.currency ?? null,
    linked: transactionId !== null,
  };
}

const upcomingView = ({amount, ...fields}: UpcomingCharge): UpcomingInfo => ({
  ...fields,
  amount: amount === null ? null : moneyToDecimal(amount),
  currency: amount?.currency ?? null,
});

/** Reads the ledger for one report; empty while there is no ledger yet. */
function reading<T>(
  open: () => LedgerReader | null,
  empty: T,
  read: (ledger: LedgerReader) => T,
): T {
  const ledger = open();
  if (ledger === null) {
    return empty;
  }
  try {
    return read(ledger);
  } finally {
    ledger.close();
  }
}

/** Spending on both bases, documents and upcoming charges, as the page shows them. */
export function ledgerReports(open: () => LedgerReader | null, now: () => Date): Reports {
  const since = (): string => firstDayOfLastMonths(now(), MONTHS);
  return {
    spend: () =>
      reading(open, {cash: [], accrual: []}, ledger => {
        const [transactions, documents] = [ledger.transactions(since()), ledger.documents(since())];
        return {
          cash: monthlySpend(transactions, documents, 'cash').map(monthView),
          accrual: monthlySpend(transactions, documents, 'accrual').map(monthView),
        };
      }),
    documents: () =>
      reading(open, {documents: []}, ledger => ({
        documents: ledger.documents(since()).map(documentView),
      })),
    upcoming: () =>
      reading(open, {charges: []}, ledger => ({
        charges: upcomingCharges(
          ledger
            .documents(day(new Date(now().getTime() - 400 * DAY_MS)))
            .map(item => item.document),
          day(now()),
        ).map(upcomingView),
      })),
  };
}
