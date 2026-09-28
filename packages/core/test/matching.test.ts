import {describe, expect, it} from 'vitest';

import {matchDocuments, money} from '../src/index.ts';
import type {FinancialDocument, Transaction} from '../src/index.ts';

const receipt = (overrides: Partial<FinancialDocument>): FinancialDocument => ({
  id: 'email:<r1@apple.com>',
  kind: 'receipt',
  issuer: 'Apple',
  amount: money(999, 'EUR'),
  issuedOn: '2026-09-10',
  periodStart: null,
  periodEnd: null,
  dueOn: null,
  reference: null,
  account: null,
  verified: true,
  origin: 'email from no_reply@email.apple.com',
  ...overrides,
});

const charge = (id: string, minorUnits: number, bookingDate: string): Transaction => ({
  id,
  accountId: 'bank',
  status: 'booked',
  bookingDate,
  valueDate: null,
  transactionDate: null,
  amount: money(minorUnits, 'EUR'),
  counterparty: 'APPLE.COM/BILL',
  description: 'Card payment',
  merchantCategoryCode: null,
});

describe('matching documents', () => {
  it('links a receipt to the one charge of that amount a few days around it', () => {
    const transactions = [
      charge('t1', -999, '2026-09-12'),
      charge('t2', -999, '2026-10-12'),
      charge('t3', -1999, '2026-09-11'),
    ];

    expect(matchDocuments([receipt({})], transactions)).toEqual([
      {documentId: 'email:<r1@apple.com>', transactionId: 't1'},
    ]);
  });

  it('links refunds to money coming back, and leaves ambiguous or other documents alone', () => {
    const refund = receipt({id: 'refund', kind: 'refund'});
    const renewal = receipt({id: 'renewal', kind: 'renewal'});
    const twins = [charge('t1', -999, '2026-09-11'), charge('t2', -999, '2026-09-12')];

    expect(matchDocuments([refund], [charge('back', 999, '2026-09-11')])).toEqual([
      {documentId: 'refund', transactionId: 'back'},
    ]);
    expect(matchDocuments([receipt({}), renewal], twins)).toEqual([]);
    expect(matchDocuments([receipt({amount: null})], twins)).toEqual([]);
    expect(matchDocuments([receipt({amount: money(999, 'USD')})], twins)).toEqual([]);
  });
});

describe('matching statements', () => {
  it('links a statement to the one payment of its total by its due date', () => {
    const statement = receipt({
      id: 'statement',
      kind: 'statement',
      amount: money(45_572, 'EUR'),
      issuedOn: '2026-08-20',
      dueOn: '2026-09-01',
    });
    const payments = [charge('late', -45_572, '2026-10-20'), charge('paid', -45_572, '2026-09-01')];

    expect(matchDocuments([statement], payments)).toEqual([
      {documentId: 'statement', transactionId: 'paid'},
    ]);
    expect(
      matchDocuments([{...statement, dueOn: null}], [charge('paid', -45_572, '2026-09-20')]),
    ).toEqual([{documentId: 'statement', transactionId: 'paid'}]);
  });
});
