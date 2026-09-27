import {describe, expect, it} from 'vitest';

import {callTool, textOf} from './clients.ts';
import {testContext} from './fixture.ts';

async function accountHandle(): Promise<string> {
  const result = await callTool(testContext(), 'list_accounts');
  const {accounts} = result.structuredContent as {accounts: {account: string}[]};
  return accounts[0]?.account ?? '';
}

describe('list_transactions', () => {
  it('returns exact amounts, newest first, without ledger ids', async () => {
    const result = await callTool(testContext(), 'list_transactions', {limit: 1});

    expect(result.structuredContent).toMatchObject({
      transactions: [
        {
          date: '2026-09-15',
          status: 'booked',
          amount: '-160.00',
          currency: 'EUR',
          counterparty: 'Example AI Inc',
          merchantCategoryCode: '5734',
        },
      ],
      total: 3,
      truncated: true,
    });
    expect(textOf(result)).not.toContain('eb:');
  });

  it('filters by account handle, direction and text', async () => {
    const account = await accountHandle();
    const context = testContext();

    const incoming = await callTool(context, 'list_transactions', {account, direction: 'in'});
    const rent = await callTool(context, 'list_transactions', {text: 'rent', from: '2026-08-01'});

    expect(incoming.structuredContent).toMatchObject({total: 1, truncated: false});
    expect(rent.structuredContent).toMatchObject({transactions: [{amount: '-90.00'}]});
  });
});

describe('list_transactions input', () => {
  it('rejects unknown account handles with a useful message', async () => {
    const result = await callTool(testContext(), 'list_transactions', {account: 'acct_000'});

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain('list_accounts gives the valid handles');
  });

  it('refuses pages larger than 200 and malformed dates', async () => {
    const context = testContext();

    expect((await callTool(context, 'list_transactions', {limit: 201})).isError).toBe(true);
    expect((await callTool(context, 'list_transactions', {from: '27/09/2026'})).isError).toBe(true);
  });
});

describe('top_counterparties', () => {
  it('ranks who received the most money over the last months', async () => {
    const result = await callTool(testContext(), 'top_counterparties', {months: 2, limit: 1});

    expect(result.structuredContent).toMatchObject({
      from: '2026-08-01',
      counterparties: [{name: 'Example AI Inc', amount: '160.00', currency: 'EUR', movements: 1}],
    });
  });
});
