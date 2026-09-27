import {createHash} from 'node:crypto';

import {moneyToDecimal} from '@caton-ai/core';
import type {Account, Money, Transaction} from '@caton-ai/core';
import * as z from 'zod';

import {ToolError} from './ledger-access.ts';

export const AMOUNT = z.object({
  amount: z
    .string()
    .regex(/^-?\d+(?:\.\d+)?$/u)
    .describe('Exact decimal amount; never round it or convert it to a float'),
  currency: z.string().length(3).describe('ISO 4217 currency code'),
});

export const ISO_DATE = z.iso.date();

/**
 * Opaque, stable handle of an account. Ledger ids come from the bank and could embed account
 * identifiers, so they never leave the machine.
 */
export function accountHandle(accountId: string): string {
  return `acct_${createHash('sha256').update(accountId).digest('hex').slice(0, 12)}`;
}

/** The ledger id of the account behind `handle`. */
export function accountIdOf(accounts: readonly Account[], handle: string): string {
  const account = accounts.find(candidate => accountHandle(candidate.id) === handle);
  if (account === undefined) {
    throw new ToolError(`Unknown account "${handle}"; list_accounts gives the valid handles`);
  }
  return account.id;
}

export function amountOf(value: Money): z.infer<typeof AMOUNT> {
  return {amount: moneyToDecimal(value), currency: value.currency};
}

export const TRANSACTION = AMOUNT.extend({
  date: z.string().nullable().describe('Booking date, or operation date while pending'),
  status: z.enum(['booked', 'pending']),
  account: z.string().describe('Account handle, as given by list_accounts'),
  counterparty: z.string().nullable(),
  description: z.string(),
  merchantCategoryCode: z.string().nullable().describe('ISO 18245 merchant category code'),
});

export function transactionView(transaction: Transaction): z.infer<typeof TRANSACTION> {
  return {
    date: transaction.bookingDate ?? transaction.transactionDate ?? transaction.valueDate,
    status: transaction.status,
    account: accountHandle(transaction.accountId),
    ...amountOf(transaction.amount),
    counterparty: transaction.counterparty,
    description: transaction.description,
    merchantCategoryCode: transaction.merchantCategoryCode,
  };
}
