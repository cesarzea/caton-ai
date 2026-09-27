import {currencyCode, money} from '@caton-ai/core';
import type {Account, Transaction} from '@caton-ai/core';
import {openLedger} from '@caton-ai/ledger';
import type {LedgerReader} from '@caton-ai/ledger';

import type {ServerContext} from '../src/index.ts';

// Synthetic data only: the repository is public.

const account: Account = {
  id: 'eb:hash-abc',
  sourceRef: 'session-uid-1',
  source: 'enable-banking',
  institution: 'Example Bank',
  name: 'Current account',
  currency: currencyCode('EUR'),
};

function movement(overrides: Partial<Transaction>): Transaction {
  return {
    id: 'eb:hash-abc:ref-1',
    accountId: account.id,
    status: 'booked',
    bookingDate: '2026-09-15',
    valueDate: null,
    transactionDate: null,
    amount: money(-16_000, 'EUR'),
    counterparty: 'Example AI Inc',
    description: 'PURCHASE EXAMPLE AI CREDIT',
    merchantCategoryCode: '5734',
    ...overrides,
  };
}

const MOVEMENTS = [
  movement({}),
  movement({
    id: 'ref-2',
    bookingDate: '2026-09-01',
    amount: money(250_000, 'EUR'),
    counterparty: 'Example Employer',
    description: 'PAYROLL',
  }),
  movement({
    id: 'ref-3',
    bookingDate: '2026-08-10',
    amount: money(-9_000, 'EUR'),
    counterparty: null,
    description: 'Rent August',
  }),
];

export const SESSION_UID = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

/** A ledger where `millennium` synced and `revolut` failed. */
function seededLedger(): LedgerReader {
  const ledger = openLedger(':memory:');
  ledger.saveSync({
    source: 'millennium',
    startedAt: new Date('2026-09-27T09:59:00Z'),
    finishedAt: new Date('2026-09-27T10:00:00Z'),
    accounts: [
      {
        account,
        transactions: MOVEMENTS,
        balances: [
          {
            accountId: account.id,
            type: 'CLBD',
            amount: money(123_456, 'EUR'),
            referenceDate: '2026-09-26',
          },
        ],
      },
    ],
  });
  ledger.recordFailure({
    source: 'revolut',
    startedAt: new Date('2026-09-27T10:01:00Z'),
    finishedAt: new Date('2026-09-27T10:02:00Z'),
    error: `Enable Banking returned HTTP 500 for /accounts/${SESSION_UID}/transactions`,
  });
  return ledger;
}

export interface TestContext extends ServerContext {
  readonly logged: unknown[];
  readonly closes: () => number;
}

/** A context over one shared in-memory ledger that counts how often a tool call closes it. */
export function testContext(open?: () => LedgerReader): TestContext {
  const shared = seededLedger();
  const logged: unknown[] = [];
  let closes = 0;
  return {
    ledger:
      open ??
      (() => ({
        ...shared,
        close: () => {
          closes += 1;
        },
      })),
    connections: ['millennium', 'revolut'],
    now: () => new Date('2026-09-27T12:00:00Z'),
    logError: error => logged.push(error),
    logged,
    closes: () => closes,
  };
}
