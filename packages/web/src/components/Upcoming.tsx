import type {UpcomingCharge} from '@caton-ai/api';
import type {ReactNode} from 'react';

import {formatAmount} from '../money.ts';
import {text} from '../text.ts';
import {DataTable} from './DataTable.tsx';

/** What renewal notices say will be charged next. */
export function Upcoming({charges}: Readonly<{charges: readonly UpcomingCharge[]}>): ReactNode {
  const words = text.reports;
  return (
    <section className="card">
      <h2>{words.upcomingTitle}</h2>
      <p className="muted">{words.upcomingIntro}</p>
      {charges.length === 0 ? (
        <p className="muted">{words.upcomingEmpty}</p>
      ) : (
        <DataTable
          columns={words.upcomingColumns}
          keys={charges.map((charge, index) => `${charge.date} ${charge.issuer} ${String(index)}`)}
          rows={charges.map(charge => [
            charge.date,
            charge.issuer,
            formatAmount(charge.amount, charge.currency),
            charge.account ?? words.unknown,
          ])}
        />
      )}
    </section>
  );
}
