import {money} from '@caton-ai/core';
import {describe, expect, it} from 'vitest';

import {ConsentExpiredError, createEnableBankingSource} from '../src/index.ts';
import {fakeFetch, json, privateKeyPem} from './fake-api.ts';
import {rawAccount, rawTransaction} from './raw.ts';

const now = (): Date => new Date('2026-09-27T12:00:00Z');
const session = {
  status: 'AUTHORIZED',
  access: {valid_until: '2027-03-25T11:19:12Z'},
  aspsp: {name: 'Example Bank'},
  accounts: ['session-uid-1'],
};

function pagedTransactions(url: URL): Response {
  return url.searchParams.get('continuation_key') === 'page-2'
    ? json({transactions: [rawTransaction({entry_reference: 'ref-2'})], continuation_key: null})
    : json({transactions: [rawTransaction()], continuation_key: 'page-2'});
}

const routes = {
  '/sessions/session-1': () => json(session),
  '/accounts/session-uid-1/details': () => json(rawAccount()),
  '/accounts/session-uid-1/transactions': pagedTransactions,
  '/accounts/session-uid-1/balances': () =>
    json({
      balances: [{balance_amount: {amount: '1234.56', currency: 'EUR'}, balance_type: 'CLBD'}],
    }),
};

const source = createEnableBankingSource({
  appId: 'app-123',
  privateKeyPem,
  sessionId: 'session-1',
  fetch: fakeFetch(routes),
  now,
});

describe('createEnableBankingSource', () => {
  it('lists the accounts of an active consent with their institution', async () => {
    const [account] = await source.listAccounts();

    expect(account).toMatchObject({
      id: 'eb:hash-abc',
      institution: 'Example Bank',
      name: 'Current account',
    });
  });

  it('follows pagination to the end and reads balances', async () => {
    const [account] = await source.listAccounts();
    if (account === undefined) {
      throw new Error('expected an account');
    }

    expect((await source.listTransactions(account, '2026-09-01')).map(item => item.id)).toEqual([
      'eb:hash-abc:ref-001',
      'eb:hash-abc:ref-2',
    ]);
    expect((await source.listBalances(account))[0]?.amount).toEqual(money(123_456, 'EUR'));
  });
});

describe('createEnableBankingSource consent', () => {
  it('reports an expired consent before touching any account', async () => {
    const expired = {...routes, '/sessions/session-1': () => json({...session, status: 'EXPIRED'})};
    const stale = createEnableBankingSource({
      appId: 'a',
      privateKeyPem,
      sessionId: 'session-1',
      fetch: fakeFetch(expired),
      now,
    });

    await expect(stale.listAccounts()).rejects.toBeInstanceOf(ConsentExpiredError);
  });
});
