import type {RawAccountDetails, RawTransaction} from '../src/schemas.ts';

// Synthetic data only: the repository is public, never use real account or merchant details.

export function rawTransaction(overrides: Partial<RawTransaction> = {}): RawTransaction {
  return {
    entry_reference: 'ref-001',
    transaction_amount: {amount: '160.00', currency: 'EUR'},
    credit_debit_indicator: 'DBIT',
    status: 'BOOK',
    booking_date: '2026-09-15',
    value_date: '2026-09-15',
    transaction_date: '2026-09-13',
    creditor: {name: 'Example AI Inc'},
    debtor: {name: 'Account Holder'},
    remittance_information: ['PURCHASE 0000 EXAMPLE AI CREDIT'],
    merchant_category_code: '5734',
    ...overrides,
  };
}

export function rawAccount(overrides: Partial<RawAccountDetails> = {}): RawAccountDetails {
  return {
    uid: 'session-uid-1',
    identification_hash: 'hash-abc',
    account_id: {iban: 'PT50000000000000000000000'},
    details: 'Current account',
    currency: 'EUR',
    ...overrides,
  };
}
