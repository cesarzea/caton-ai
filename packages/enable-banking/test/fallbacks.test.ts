import {money} from '@caton-ai/core';
import {describe, expect, it} from 'vitest';

import {toAccount, toBalances, toTransactions} from '../src/normalize.ts';
import {rawAccount, rawTransaction} from './raw.ts';

const account = toAccount(rawAccount(), 'Example Bank');

describe('account name fallbacks', () => {
  it('prefers details, then product, then name, then the uid', () => {
    const bare = {details: null, product: null, name: null};
    expect(toAccount(rawAccount({...bare, product: 'Savings'}), 'B').name).toBe('Savings');
    expect(toAccount(rawAccount({...bare, name: 'Holder'}), 'B').name).toBe('Holder');
    expect(toAccount(rawAccount(bare), 'B').name).toBe('session-uid-1');
  });
});

describe('transaction fallbacks', () => {
  it('keeps missing dates, merchant code and counterparty as null', () => {
    const sparse = rawTransaction({
      value_date: null,
      transaction_date: null,
      merchant_category_code: null,
      creditor: null,
    });

    expect(toTransactions([sparse], account)[0]).toMatchObject({
      valueDate: null,
      transactionDate: null,
      merchantCategoryCode: null,
      counterparty: null,
    });
  });

  it('describes a movement by its counterparty, or as unknown, without remittance text', () => {
    const [byName, unknown] = toTransactions(
      [
        rawTransaction({remittance_information: null}),
        rawTransaction({entry_reference: 'r2', remittance_information: [], creditor: {name: null}}),
      ],
      account,
    );

    expect(byName?.description).toBe('Example AI Inc');
    expect(unknown?.description).toBe('Unknown transaction');
  });
});

describe('transaction edge cases', () => {
  it('signs by direction even when the bank sends a negative amount', () => {
    const negative = rawTransaction({transaction_amount: {amount: '-5.00', currency: 'EUR'}});

    expect(toTransactions([negative], account)[0]?.amount).toEqual(money(-500, 'EUR'));
  });

  it('treats a movement without status and booking date as pending', () => {
    const undated = rawTransaction({status: null, booking_date: null});

    expect(toTransactions([undated], account)[0]?.status).toBe('pending');
  });
});

describe('balance fallbacks', () => {
  it('keeps a missing reference date as null', () => {
    const [balance] = toBalances(
      {balances: [{balance_amount: {amount: '10.00', currency: 'EUR'}, balance_type: 'ITAV'}]},
      account,
    );

    expect(balance).toEqual({
      accountId: 'eb:hash-abc',
      type: 'ITAV',
      amount: money(1_000, 'EUR'),
      referenceDate: null,
    });
  });
});
