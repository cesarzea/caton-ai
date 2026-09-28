import {describe, expect, it} from 'vitest';

import {money, monthlySpend} from '../src/index.ts';
import type {FinancialDocument} from '../src/index.ts';
import {transaction} from './transactions.ts';

const zero = (currency: string) => money(0, currency);

const document = (overrides: Partial<FinancialDocument>): FinancialDocument => ({
  id: 'doc',
  kind: 'charge',
  issuer: 'Store',
  amount: money(2_500, 'EUR'),
  issuedOn: '2026-09-10',
  periodStart: null,
  periodEnd: null,
  dueOn: null,
  reference: null,
  account: 'ending in 1234',
  verified: true,
  origin: 'email',
  ...overrides,
});

const row = (month: string, minorUnits: number, currency: string) => ({
  month,
  total: money(minorUnits, currency),
  onlyInDocuments: zero(currency),
  notSeen: zero(currency),
});

describe('monthlySpend from transactions', () => {
  it('adds booked outflows per month and currency as positive totals', () => {
    const totals = monthlySpend(
      [
        transaction({bookingDate: '2026-09-04', amount: money(-16_000, 'EUR')}),
        transaction({bookingDate: '2026-09-15', amount: money(-16_000, 'EUR')}),
        transaction({bookingDate: '2026-08-18', amount: money(-9_000, 'EUR')}),
        transaction({bookingDate: '2026-08-01', amount: money(-62, 'USD')}),
      ],
      [],
    );

    expect(totals).toEqual([
      row('2026-08', 9_000, 'EUR'),
      row('2026-08', 62, 'USD'),
      row('2026-09', 32_000, 'EUR'),
    ]);
  });
});

describe('monthlySpend of what did not leave', () => {
  it('ignores income, pending movements and undated entries', () => {
    const totals = monthlySpend(
      [
        transaction({amount: money(250_000, 'EUR')}),
        transaction({status: 'pending', bookingDate: null}),
        transaction({bookingDate: null}),
      ],
      [],
    );

    expect(totals).toEqual([]);
  });
});

describe('monthlySpend with documents', () => {
  it('counts charges no transaction reports, and not the payment that settles a statement', () => {
    const payment = transaction({
      id: 'pay',
      bookingDate: '2026-09-20',
      amount: money(-9_000, 'EUR'),
    });
    const totals = monthlySpend(
      [payment, transaction({id: 'bread', bookingDate: '2026-09-02', amount: money(-300, 'EUR')})],
      [
        {document: document({}), transactionId: null},
        {document: document({id: 'linked'}), transactionId: 'bread'},
        {document: document({id: 'unverified', verified: false}), transactionId: null},
        {document: document({id: 'receipt', kind: 'receipt'}), transactionId: null},
        {
          document: document({id: 'statement', kind: 'statement', amount: money(9_000, 'EUR')}),
          transactionId: 'pay',
        },
      ],
    );

    expect(totals).toEqual([
      {
        month: '2026-09',
        total: money(2_800, 'EUR'),
        onlyInDocuments: money(2_500, 'EUR'),
        notSeen: money(2_500, 'EUR'),
      },
    ]);
  });
});

describe('monthlySpend on an accrual basis', () => {
  it('spreads spending over the service period its document states', () => {
    const yearly = transaction({
      id: 'yearly',
      bookingDate: '2026-07-01',
      amount: money(-36_500, 'EUR'),
    });
    const invoice = document({
      id: 'invoice',
      kind: 'receipt',
      amount: money(36_500, 'EUR'),
      periodStart: '2026-07-01',
      periodEnd: '2026-09-29',
    });
    const linked = [{document: invoice, transactionId: 'yearly'}];

    expect(
      monthlySpend([yearly], linked, 'cash').map(({month, total}) => [month, total.minorUnits]),
    ).toEqual([['2026-07', 36_500]]);
    expect(
      monthlySpend([yearly], linked, 'accrual').map(({month, total}) => [month, total.minorUnits]),
    ).toEqual([
      ['2026-07', 12_434],
      ['2026-08', 12_434],
      ['2026-09', 11_632],
    ]);
  });
});
