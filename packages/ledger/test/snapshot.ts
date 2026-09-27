import {currencyCode, money} from '@caton-ai/core';
import type {Account, Transaction} from '@caton-ai/core';

import type {SyncSnapshot} from '../src/index.ts';

// Synthetic data only: the repository is public.

export const account: Account = {
  id: 'eb:hash-abc',
  sourceRef: 'session-uid-1',
  source: 'enable-banking',
  institution: 'Example Bank',
  name: 'Current account',
  currency: currencyCode('EUR'),
};

export function movement(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'eb:hash-abc:ref-1',
    accountId: account.id,
    status: 'booked',
    bookingDate: '2026-09-15',
    valueDate: '2026-09-15',
    transactionDate: '2026-09-13',
    amount: money(-16_000, 'EUR'),
    counterparty: 'Example AI Inc',
    description: 'PURCHASE EXAMPLE AI CREDIT',
    merchantCategoryCode: '5734',
    ...overrides,
  };
}

export function snapshot(
  transactions: readonly Transaction[],
  finishedAt = '2026-09-27T10:00:00Z',
): SyncSnapshot {
  return {
    source: 'millennium',
    startedAt: new Date('2026-09-27T09:59:00Z'),
    finishedAt: new Date(finishedAt),
    accounts: [
      {
        account,
        transactions,
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
  };
}
