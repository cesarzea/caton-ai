import {money} from '../src/index.ts';
import type {Transaction} from '../src/index.ts';

/** Builds a synthetic transaction; tests override only what they care about. */
export function transaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'acc-1:ref-1',
    accountId: 'acc-1',
    status: 'booked',
    bookingDate: '2026-09-15',
    valueDate: '2026-09-15',
    transactionDate: '2026-09-14',
    amount: money(-1_000, 'EUR'),
    counterparty: 'Example Merchant',
    description: 'Card payment',
    merchantCategoryCode: '5734',
    ...overrides,
  };
}
