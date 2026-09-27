import {money} from '@caton-ai/core';
import {describe, expect, it} from 'vitest';

import {toAccount, toTransactions} from '../src/normalize.ts';
import {rawAccount, rawTransaction} from './raw.ts';

const account = toAccount(rawAccount(), 'Example Bank');

describe('toAccount', () => {
  it('keys the account by a stable identifier, not the session uid', () => {
    expect(account).toMatchObject({id: 'eb:hash-abc', sourceRef: 'session-uid-1'});
    expect(toAccount(rawAccount({identification_hash: null}), 'Bank').id).toBe(
      'eb:PT50000000000000000000000',
    );
    const noIban = rawAccount({
      identification_hash: null,
      account_id: {other: {identification: '831'}},
    });
    expect(toAccount({...noIban, currency: 'USD'}, 'Bank').id).toBe('eb:831:USD');
  });

  it('fails when the account cannot be identified across renewals', () => {
    expect(() =>
      toAccount(rawAccount({identification_hash: null, account_id: null}), 'Bank'),
    ).toThrow(/no stable identifier/u);
  });
});

describe('toTransactions', () => {
  it('signs amounts by direction and keeps the counterparty and merchant code', () => {
    const [debit, credit] = toTransactions(
      [
        rawTransaction(),
        rawTransaction({credit_debit_indicator: 'CRDT', entry_reference: 'ref-2'}),
      ],
      account,
    );

    expect(debit).toMatchObject({amount: money(-16_000, 'EUR'), counterparty: 'Example AI Inc'});
    expect(debit?.merchantCategoryCode).toBe('5734');
    expect(credit).toMatchObject({amount: money(16_000, 'EUR'), counterparty: 'Account Holder'});
  });
});

describe('toTransactions status', () => {
  it('keeps pending movements undated instead of dating them today', () => {
    const [pending] = toTransactions(
      [rawTransaction({status: 'PDNG', booking_date: null})],
      account,
    );

    expect(pending).toMatchObject({status: 'pending', bookingDate: null});
  });

  it('drops cancelled and rejected movements', () => {
    const statuses = ['CNCL', 'RJCT'];
    expect(
      toTransactions(
        statuses.map(status => rawTransaction({status})),
        account,
      ),
    ).toEqual([]);
  });
});

describe('transaction identity', () => {
  it('namespaces the bank reference by account', () => {
    expect(toTransactions([rawTransaction()], account)[0]?.id).toBe('eb:hash-abc:ref-001');
  });

  it('hashes the content when there is no reference, identically on every sync', () => {
    const unreferenced = rawTransaction({entry_reference: null, transaction_id: null});
    const first = toTransactions([unreferenced], account)[0]?.id;

    expect(first).toMatch(/^eb:hash-abc:sha256:[0-9a-f]{32}$/u);
    expect(toTransactions([{...unreferenced}], account)[0]?.id).toBe(first);
  });
});
