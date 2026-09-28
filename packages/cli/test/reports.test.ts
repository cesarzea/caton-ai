import {money} from '@caton-ai/core';
import type {FinancialDocument} from '@caton-ai/core';
import {openLedger} from '@caton-ai/ledger';
import {describe, expect, it} from 'vitest';

import {ledgerReports} from '../src/reports.ts';

const document = (overrides: Partial<FinancialDocument>): FinancialDocument => ({
  id: 'email:<1@x>',
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
  origin: 'email from alerts@card.example: Charge',
  ...overrides,
});

/** Reports over a ledger holding a card charge and a renewal notice. */
function seeded(): ReturnType<typeof ledgerReports> {
  const ledger = openLedger(':memory:');
  const at = new Date('2026-09-20T10:00:00Z');
  const renewal = document({id: 'email:<2@x>', kind: 'renewal', dueOn: '2026-10-05', amount: null});
  const documents = [document({}), renewal];
  ledger.saveSync({source: 'mail', startedAt: at, finishedAt: at, accounts: [], documents});
  return ledgerReports(
    () => ({...ledger, close: () => undefined}),
    () => at,
  );
}

describe('ledgerReports', () => {
  it('reads spending and documents from the ledger', () => {
    const reports = seeded();

    expect(reports.spend().cash).toEqual([
      {
        month: '2026-09',
        currency: 'EUR',
        total: '25.00',
        onlyInDocuments: '25.00',
        notSeen: '0.00',
      },
    ]);
    expect(
      reports.documents().documents.map(item => [item.kind, item.amount, item.linked]),
    ).toEqual([
      ['charge', '25.00', false],
      ['renewal', null, false],
    ]);
  });
});

describe('ledgerReports of renewals', () => {
  it('reads the charges renewal notices announce', () => {
    expect(seeded().upcoming().charges).toEqual([
      {
        issuer: 'Store',
        amount: null,
        currency: null,
        date: '2026-10-05',
        account: 'ending in 1234',
        verified: true,
      },
    ]);
  });
});

describe('ledgerReports without a ledger', () => {
  it('shows nothing while there is no ledger', () => {
    const reports = ledgerReports(
      () => null,
      () => new Date(),
    );

    expect([reports.spend(), reports.documents(), reports.upcoming()]).toEqual([
      {cash: [], accrual: []},
      {documents: []},
      {charges: []},
    ]);
  });
});
