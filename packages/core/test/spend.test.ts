import {describe, expect, it} from 'vitest';

import {money, monthlyOutflows} from '../src/index.ts';
import {transaction} from './transactions.ts';

describe('monthlyOutflows', () => {
  it('adds booked outflows per month and currency as positive totals', () => {
    const totals = monthlyOutflows([
      transaction({bookingDate: '2026-09-04', amount: money(-16_000, 'EUR')}),
      transaction({bookingDate: '2026-09-15', amount: money(-16_000, 'EUR')}),
      transaction({bookingDate: '2026-08-18', amount: money(-9_000, 'EUR')}),
      transaction({bookingDate: '2026-08-01', amount: money(-62, 'USD')}),
    ]);

    expect(totals).toEqual([
      {month: '2026-08', total: money(9_000, 'EUR')},
      {month: '2026-08', total: money(62, 'USD')},
      {month: '2026-09', total: money(32_000, 'EUR')},
    ]);
  });

  it('ignores income, pending movements and undated entries', () => {
    const totals = monthlyOutflows([
      transaction({amount: money(250_000, 'EUR')}),
      transaction({status: 'pending', bookingDate: null}),
      transaction({bookingDate: null}),
    ]);

    expect(totals).toEqual([]);
  });
});
