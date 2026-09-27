import {currencyCode, money} from '@caton-ai/core';
import type {Account, TransactionSource} from '@caton-ai/core';
import {openLedger} from '@caton-ai/ledger';
import type {Ledger} from '@caton-ai/ledger';
import type {ServerContext} from '@caton-ai/mcp';

import type {CommandContext} from '../src/context.ts';

// Synthetic data only: the repository is public.

const account: Account = {
  id: 'eb:hash-abc',
  sourceRef: 'uid-1',
  source: 'fake',
  institution: 'Example Bank',
  name: 'Current account',
  currency: currencyCode('EUR'),
};

export const workingSource: TransactionSource = {
  name: 'fake',
  listAccounts: () => Promise.resolve([account]),
  listTransactions: () =>
    Promise.resolve([
      {
        id: 'eb:hash-abc:1',
        accountId: account.id,
        status: 'booked',
        bookingDate: '2026-09-15',
        valueDate: null,
        transactionDate: null,
        amount: money(-16_000, 'EUR'),
        counterparty: 'Example AI Inc',
        description: 'Credit purchase',
        merchantCategoryCode: null,
      },
    ]),
  listBalances: () =>
    Promise.resolve([
      {accountId: account.id, type: 'CLBD', amount: money(123_456, 'EUR'), referenceDate: null},
    ]),
};

export const failingSource: TransactionSource = {
  ...workingSource,
  listAccounts: () => Promise.reject(new Error('Enable Banking consent is not active')),
};

export interface TestContext extends CommandContext {
  readonly lines: string[];
  readonly errors: string[];
  readonly served: ServerContext[];
}

/** A context over one shared in-memory ledger whose `close` is a no-op. */
export function testContext(sources: Readonly<Record<string, TransactionSource>>): TestContext {
  const shared = openLedger(':memory:');
  const ledger: Ledger = {...shared, close: () => undefined};
  const lines: string[] = [];
  const errors: string[] = [];
  const served: ServerContext[] = [];
  return {
    config: () => ({
      enableBanking: {appId: 'app', privateKeyPath: '~/key.pem'},
      connections: Object.keys(sources).map(name => ({name, sessionId: `session-${name}`})),
    }),
    ledger: () => ledger,
    readOnlyLedger: () => ledger,
    serveMcp: server => served.push(server),
    source: connection => sources[connection.name] ?? workingSource,
    output: {line: text => lines.push(text), error: text => errors.push(text)},
    now: () => new Date('2026-09-27T10:00:00Z'),
    locale: 'en-US',
    lines,
    errors,
    served,
  };
}
