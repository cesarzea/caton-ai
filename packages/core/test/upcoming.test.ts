import {describe, expect, it} from 'vitest';

import {money, splitByMonth, upcomingCharges} from '../src/index.ts';
import type {FinancialDocument} from '../src/index.ts';

const notice = (overrides: Partial<FinancialDocument>): FinancialDocument => ({
  id: 'n',
  kind: 'renewal',
  issuer: 'Streaming',
  amount: money(999, 'EUR'),
  issuedOn: '2026-09-01',
  periodStart: null,
  periodEnd: null,
  dueOn: '2026-10-06',
  reference: null,
  account: null,
  verified: true,
  origin: 'email',
  ...overrides,
});

describe('upcomingCharges', () => {
  it('lists the charges renewal notices announce from today, soonest first', () => {
    const later = notice({id: 'later', issuer: 'Cloud', dueOn: null, periodStart: '2026-11-01'});
    const past = notice({id: 'past', dueOn: '2026-09-10'});

    expect(
      upcomingCharges([later, notice({}), past], '2026-09-28').map(charge => [
        charge.issuer,
        charge.date,
      ]),
    ).toEqual([
      ['Streaming', '2026-10-06'],
      ['Cloud', '2026-11-01'],
    ]);
  });

  it('drops a renewal that the same issuer cancelled afterwards', () => {
    const cancelled = notice({
      id: 'c',
      kind: 'cancellation',
      issuer: ' streaming ',
      issuedOn: '2026-09-15',
    });

    expect(upcomingCharges([notice({}), cancelled], '2026-09-28')).toEqual([]);
  });
});

describe('splitByMonth', () => {
  it('splits by days and adds up exactly, even for a single day or a reversed period', () => {
    const parts = splitByMonth(money(1_000, 'EUR'), '2026-01-31', '2026-02-02');

    expect(parts.map(({month, amount}) => [month, amount.minorUnits])).toEqual([
      ['2026-01', 333],
      ['2026-02', 667],
    ]);
    expect(splitByMonth(money(5, 'EUR'), '2026-03-10', '2026-03-01')).toEqual([
      {month: '2026-03', amount: money(5, 'EUR')},
    ]);
  });
});
