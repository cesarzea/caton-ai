import {money} from '@caton-ai/core';
import {describe, expect, it} from 'vitest';

import {openLedger} from '../src/index.ts';
import type {Ledger} from '../src/index.ts';
import {movement, snapshot} from './snapshot.ts';

function ledgerWithMovements(): Ledger {
  const ledger = openLedger(':memory:');
  ledger.saveSync(
    snapshot([
      movement({id: 'm-aug', bookingDate: '2026-08-10', description: 'Rent August'}),
      movement({id: 'm-sep', bookingDate: '2026-09-15'}),
      movement({
        id: 'm-salary',
        bookingDate: '2026-09-01',
        amount: money(250_000, 'EUR'),
        counterparty: 'Example Employer SL',
        description: 'PAYROLL',
      }),
      movement({
        id: 'm-pending',
        status: 'pending',
        bookingDate: null,
        transactionDate: '2026-09-20',
      }),
    ]),
  );
  return ledger;
}

const ids = (ledger: Ledger, query: Parameters<Ledger['searchTransactions']>[0]): string[] =>
  ledger.searchTransactions(query).transactions.map(item => item.id);

describe('searchTransactions', () => {
  it('returns every movement newest first, pending ones by operation date', () => {
    expect(ids(ledgerWithMovements(), {limit: 10})).toEqual([
      'm-pending',
      'm-sep',
      'm-salary',
      'm-aug',
    ]);
  });
});

describe('searchTransactions filters', () => {
  it('filters by inclusive date range, account and direction', () => {
    const ledger = ledgerWithMovements();

    expect(ids(ledger, {limit: 10, from: '2026-09-01', to: '2026-09-15'})).toEqual([
      'm-sep',
      'm-salary',
    ]);
    expect(ids(ledger, {limit: 10, direction: 'in'})).toEqual(['m-salary']);
    expect(ids(ledger, {limit: 10, direction: 'out', to: '2026-08-31'})).toEqual(['m-aug']);
    expect(ids(ledger, {limit: 10, accountId: 'eb:other'})).toEqual([]);
  });

  it('searches text in description and counterparty, ignoring case and wildcards', () => {
    const ledger = ledgerWithMovements();

    expect(ids(ledger, {limit: 10, text: 'employer'})).toEqual(['m-salary']);
    expect(ids(ledger, {limit: 10, text: 'rent aug'})).toEqual(['m-aug']);
    expect(ids(ledger, {limit: 10, text: '%'})).toEqual([]);
  });

  it('pages results and reports how many match in total', () => {
    const page = ledgerWithMovements().searchTransactions({limit: 2, offset: 1});

    expect(page.transactions.map(item => item.id)).toEqual(['m-sep', 'm-salary']);
    expect(page.total).toBe(4);
  });
});

describe('searchTransactions text', () => {
  it('ignores accents and non-ASCII case, as Spanish and Portuguese descriptions need', () => {
    const ledger = openLedger(':memory:');
    ledger.saveSync(snapshot([movement({id: 'm-cafe', description: 'COMPRA CAFETERÍA SÃO JOÃO'})]));

    for (const text of ['cafeteria', 'Cafetería', 'sao joao', 'SÃO']) {
      expect(ids(ledger, {limit: 10, text})).toEqual(['m-cafe']);
    }
  });
});
