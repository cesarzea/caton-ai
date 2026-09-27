import {createHash} from 'node:crypto';

import {EnableBankingError} from './errors.ts';
import type {RawAccountDetails, RawTransaction} from './schemas.ts';

/**
 * Identifier that survives consent renewals. Enable Banking's `uid` changes with every new
 * session, so the account is keyed by its identification hash, then IBAN, then other id.
 */
export function stableAccountId(details: RawAccountDetails): string {
  const other = details.account_id?.other?.identification;
  const key =
    details.identification_hash ??
    details.account_id?.iban ??
    (other === undefined ? undefined : `${other}:${details.currency}`);
  if (key === undefined) {
    throw new EnableBankingError(`Account ${details.uid} has no stable identifier`);
  }
  return `eb:${key}`;
}

/**
 * Identifier that is identical across repeated syncs: the bank reference when there is one,
 * otherwise a hash of the movement's content. Never derived from the current time.
 */
export function stableTransactionId(accountId: string, raw: RawTransaction): string {
  const reference = raw.entry_reference ?? raw.transaction_id;
  if (reference !== undefined && reference !== null && reference !== '') {
    return `${accountId}:${reference}`;
  }
  const content = JSON.stringify([
    raw.booking_date,
    raw.value_date,
    raw.transaction_date,
    raw.transaction_amount,
    raw.credit_debit_indicator,
    raw.creditor?.name,
    raw.debtor?.name,
    raw.remittance_information,
  ]);
  const digest = createHash('sha256').update(content).digest('hex').slice(0, 32);
  return `${accountId}:sha256:${digest}`;
}
