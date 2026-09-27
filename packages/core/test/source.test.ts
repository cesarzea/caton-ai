import {describe, expect, it} from 'vitest';

import {currencyCode, money} from '../src/index.ts';
import type {Account, Balance, TransactionSource} from '../src/index.ts';
import {transaction} from './transactions.ts';

const account: Account = {
  id: 'hash-1',
  sourceRef: 'session-scoped-uid',
  source: 'in-memory',
  institution: 'Example Bank',
  name: 'Current account',
  currency: currencyCode('EUR'),
};

const balance: Balance = {
  accountId: account.id,
  type: 'CLBD',
  amount: money(123_456, 'EUR'),
  referenceDate: '2026-09-27',
};

function inMemorySource(): TransactionSource {
  const movements = [
    transaction({bookingDate: '2026-08-31'}),
    transaction({id: 'acc-1:ref-2', bookingDate: '2026-09-01'}),
  ];
  return {
    name: 'in-memory',
    listAccounts: () => Promise.resolve([account]),
    listTransactions: (_account, fromDate) =>
      Promise.resolve(movements.filter(item => (item.bookingDate ?? '') >= fromDate)),
    listBalances: () => Promise.resolve([balance]),
  };
}

describe('TransactionSource port', () => {
  it('can be implemented by any source', async () => {
    const source = inMemorySource();
    const [first] = await source.listAccounts();

    expect(first).toEqual(account);
    expect(await source.listTransactions(account, '2026-09-01')).toHaveLength(1);
    expect(await source.listBalances(account)).toEqual([balance]);
  });
});
