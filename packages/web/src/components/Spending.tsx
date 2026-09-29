import type {SpendMonth, SpendReport} from '@caton-ai/api';
import {useState} from 'react';
import type {ReactNode} from 'react';

import {formatAmount} from '../money.ts';
import {text} from '../text.ts';
import {DataTable} from './DataTable.tsx';

type Basis = keyof SpendReport;

const shown = (amount: string, currency: string): string =>
  Number(amount) === 0 ? text.reports.unknown : formatAmount(amount, currency);

function BasisChoice({
  basis,
  onChoose,
}: Readonly<{basis: Basis; onChoose: (basis: Basis) => void}>): ReactNode {
  return (
    <div className="heading-actions" role="group" aria-label={text.reports.spendTitle}>
      {(['cash', 'accrual'] as const).map(option => (
        <button
          key={option}
          type="button"
          className={option === basis ? 'button primary' : 'button secondary'}
          aria-pressed={option === basis}
          onClick={() => {
            onChoose(option);
          }}
        >
          {text.reports[option]}
        </button>
      ))}
    </div>
  );
}

const row = (month: SpendMonth): string[] => [
  month.month,
  formatAmount(month.total, month.currency),
  shown(month.onlyInDocuments, month.currency),
  shown(month.notSeen, month.currency),
];

/** Spending per month, when it was paid or over the period it paid for. */
export function Spending({report}: Readonly<{report: SpendReport}>): ReactNode {
  const [basis, setBasis] = useState<Basis>('cash');
  const months = [...report[basis]].reverse();
  return (
    <section className="card">
      <div className="card-heading">
        <h2>{text.reports.spendTitle}</h2>
        <BasisChoice basis={basis} onChoose={setBasis} />
      </div>
      <p className="muted">{text.reports.spendIntro}</p>
      {months.length === 0 ? (
        <p className="muted">{text.reports.spendEmpty}</p>
      ) : (
        <DataTable
          columns={text.reports.spendColumns}
          keys={months.map(month => `${month.month} ${month.currency}`)}
          rows={months.map(row)}
        />
      )}
    </section>
  );
}
