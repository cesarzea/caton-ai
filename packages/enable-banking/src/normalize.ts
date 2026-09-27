import {currencyCode, moneyFromDecimal, negateMoney} from '@caton-ai/core';
import type {Account, Balance, Money, Transaction, TransactionStatus} from '@caton-ai/core';

import {stableAccountId, stableTransactionId} from './identity.ts';
import type {RawAccountDetails, RawBalances, RawTransaction} from './schemas.ts';

/** ISO 20022 statuses of movements that never happened (cancelled, rejected). */
const DISCARDED_STATUSES = new Set(['CNCL', 'RJCT']);
/** ISO 20022 statuses of movements that are not booked yet. */
const PENDING_STATUSES = new Set(['PDNG', 'HOLD', 'SCHD']);

export function toAccount(details: RawAccountDetails, institution: string): Account {
  return {
    id: stableAccountId(details),
    sourceRef: details.uid,
    source: 'enable-banking',
    institution,
    name: details.details ?? details.product ?? details.name ?? details.uid,
    currency: currencyCode(details.currency),
  };
}

export function toTransactions(raws: readonly RawTransaction[], account: Account): Transaction[] {
  return raws
    .filter(raw => !DISCARDED_STATUSES.has(raw.status ?? ''))
    .map(raw => toTransaction(raw, account));
}

function toTransaction(raw: RawTransaction, account: Account): Transaction {
  const counterparty = counterpartyOf(raw);
  return {
    id: stableTransactionId(account.id, raw),
    accountId: account.id,
    status: statusOf(raw),
    bookingDate: raw.booking_date ?? null,
    valueDate: raw.value_date ?? null,
    transactionDate: raw.transaction_date ?? null,
    amount: signedAmount(raw),
    counterparty,
    description: descriptionOf(raw, counterparty),
    merchantCategoryCode: raw.merchant_category_code ?? null,
  };
}

/** Amount signed by direction: negative when money leaves the account. */
function signedAmount(raw: RawTransaction): Money {
  const parsed = moneyFromDecimal(raw.transaction_amount.amount, raw.transaction_amount.currency);
  const magnitude = parsed.minorUnits < 0 ? negateMoney(parsed) : parsed;
  return raw.credit_debit_indicator === 'DBIT' ? negateMoney(magnitude) : magnitude;
}

/** Who was paid for outgoing movements, who paid for incoming ones. */
function counterpartyOf(raw: RawTransaction): string | null {
  const party = raw.credit_debit_indicator === 'DBIT' ? raw.creditor : raw.debtor;
  return party?.name ?? null;
}

function descriptionOf(raw: RawTransaction, counterparty: string | null): string {
  const remittance = (raw.remittance_information ?? []).join(' ').trim();
  return remittance === '' ? (counterparty ?? 'Unknown transaction') : remittance;
}

function statusOf(raw: RawTransaction): TransactionStatus {
  if (PENDING_STATUSES.has(raw.status ?? '')) {
    return 'pending';
  }
  return raw.booking_date === undefined || raw.booking_date === null ? 'pending' : 'booked';
}

export function toBalances(raw: RawBalances, account: Account): Balance[] {
  return raw.balances.map(balance => ({
    accountId: account.id,
    type: balance.balance_type,
    amount: moneyFromDecimal(balance.balance_amount.amount, balance.balance_amount.currency),
    referenceDate: balance.reference_date ?? null,
  }));
}
