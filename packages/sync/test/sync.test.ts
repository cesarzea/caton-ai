import {currencyCode, money, PartialReadError} from '@caton-ai/core';
import type {Account, Transaction, TransactionSource} from '@caton-ai/core';
import {openLedger} from '@caton-ai/ledger';
import {describe, expect, it} from 'vitest';

import {syncConnection} from '../src/index.ts';

const account: Account = {
  id: 'eb:hash-abc',
  sourceRef: 'uid-1',
  source: 'fake',
  institution: 'Example Bank',
  name: 'Current account',
  currency: currencyCode('EUR'),
};

const movement: Transaction = {
  id: 'eb:hash-abc:ref-1',
  accountId: account.id,
  status: 'booked',
  bookingDate: '2026-09-15',
  valueDate: null,
  transactionDate: null,
  amount: money(-9_000, 'EUR'),
  counterparty: 'Example AI Inc',
  description: 'Subscription',
  merchantCategoryCode: null,
};

function fakeSource(requestedFrom: string[]): TransactionSource {
  return {
    name: 'fake',
    listAccounts: () => Promise.resolve([account]),
    listTransactions: (_account, fromDate) => {
      requestedFrom.push(fromDate);
      return Promise.resolve([movement]);
    },
    listBalances: () => Promise.resolve([]),
  };
}

describe('syncConnection', () => {
  it('stores the data and fetches 90 days first, then from 10 days before the last success', async () => {
    const ledger = openLedger(':memory:');
    const requestedFrom: string[] = [];
    const source = fakeSource(requestedFrom);

    const first = await syncConnection({
      name: 'bank',
      source: () => source,
      ledger,
      now: () => new Date('2026-09-27T10:00:00Z'),
    });
    await syncConnection({
      name: 'bank',
      source: () => source,
      ledger,
      now: () => new Date('2026-09-28T10:00:00Z'),
    });

    expect(first).toEqual({name: 'bank', ok: true, accounts: 1, transactions: 1, documents: 0});
    expect(requestedFrom).toEqual(['2026-06-29', '2026-09-17']);
    expect(ledger.transactions('2026-01-01')).toEqual([movement]);
  });
});

describe('syncConnection failures', () => {
  it('records a failure and reports it instead of throwing', async () => {
    const ledger = openLedger(':memory:');
    const broken: TransactionSource = {
      ...fakeSource([]),
      listAccounts: () => Promise.reject(new Error('consent expired')),
    };

    const outcome = await syncConnection({name: 'bank', source: () => broken, ledger});

    expect(outcome).toEqual({name: 'bank', ok: false, error: 'consent expired'});
    expect(ledger.lastRun('bank')).toMatchObject({outcome: 'failed', error: 'consent expired'});
  });

  it('records a connection whose source cannot even be built', async () => {
    const ledger = openLedger(':memory:');
    const misconfigured = (): TransactionSource => {
      throw new Error('Invalid settings');
    };

    const outcome = await syncConnection({name: 'bank', source: misconfigured, ledger});

    expect(outcome).toEqual({name: 'bank', ok: false, error: 'Invalid settings'});
    expect(ledger.lastRun('bank')?.outcome).toBe('failed');
  });
});

const document = {
  id: 'email:<1@x>',
  kind: 'receipt',
  issuer: 'X',
  amount: money(100, 'EUR'),
  issuedOn: '2026-09-10',
  periodStart: null,
  periodEnd: null,
  dueOn: null,
  reference: null,
  verified: true,
  origin: 'email',
} as const;

describe('sources with documents', () => {
  it('save what a partial read got, with its state, and report the failure', async () => {
    const ledger = openLedger(':memory:');
    const source: TransactionSource = {
      ...fakeSource([]),
      listDocuments: () => Promise.reject(new PartialReadError('the model stopped', [document])),
    };

    const outcome = await syncConnection({
      name: 'mail',
      source: () => source,
      ledger,
      state: () => ({value: {uid: 7}}),
    });

    expect(outcome).toEqual({name: 'mail', ok: false, error: 'the model stopped'});
    expect(ledger.documents('2026-01-01')).toEqual([{document, transactionId: null}]);
    expect(ledger.connectorState('mail')).toEqual({uid: 7});
  });
});
