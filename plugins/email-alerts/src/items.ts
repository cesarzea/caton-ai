import {moneyFromDecimal} from '@caton-ai/core';
import type {FinancialDocument, Money} from '@caton-ai/core';

import {currencyOf, parseWrittenAmount} from './amount.ts';
import {parseDate} from './date.ts';
import type {Extracted} from './extraction.ts';
import type {MailMessage} from './message.ts';

const squeeze = (text: string): string => text.replaceAll(/\s+/gu, ' ').toLowerCase();

/** Whether the model's copy of a field appears in the email as it is written there. */
function written(value: string | null, text: string): boolean {
  return value !== null && value.trim() !== '' && squeeze(text).includes(squeeze(value.trim()));
}

const isoDate = (value: string | null): string | null =>
  value === null ? null : parseDate(value, 'YYYY-MM-DD');

/** The currency written in the amount, else the model's code if the email writes it. */
function writtenCurrency(
  inAmount: string | null,
  extracted: Extracted,
  text: string,
): string | null {
  const code = extracted.currency === null ? null : currencyOf(extracted.currency);
  return inAmount ?? (code !== null && text.includes(code) ? code : null);
}

/** The amount parsed here from what is written; the currency must be written too. */
function amountOf(extracted: Extracted, text: string): Money | null {
  const parsed =
    extracted.amount_written === null ? null : parseWrittenAmount(extracted.amount_written);
  const currency = parsed === null ? null : writtenCurrency(parsed.currency, extracted, text);
  if (parsed === null || currency === null) {
    return null;
  }
  try {
    return moneyFromDecimal(parsed.decimal, currency);
  } catch {
    return null;
  }
}

export interface ItemContext {
  readonly message: MailMessage;
  readonly text: string;
  readonly senderDomain: string;
}

/**
 * The document an email is, verified only when amount, issuer and date are all written in it as
 * the model copied them. The card or account is kept only when written as copied.
 */
export function documentOf(extracted: Extracted, context: ItemContext): FinancialDocument | null {
  const {message, text} = context;
  if (extracted.kind === 'none') {
    return null;
  }
  const amount = amountOf(extracted, text);
  const grounded =
    written(extracted.amount_written, text) &&
    written(extracted.date_written, text) &&
    (written(extracted.issuer, text) || written(extracted.issuer, context.senderDomain));
  return {
    id: `email:${message.messageId}`,
    kind: extracted.kind,
    issuer: extracted.issuer ?? context.senderDomain,
    amount,
    issuedOn: isoDate(extracted.date) ?? message.date.toISOString().slice(0, 10),
    periodStart: isoDate(extracted.period_start),
    periodEnd: isoDate(extracted.period_end),
    dueOn: isoDate(extracted.due_date),
    reference: extracted.reference,
    account: written(extracted.account, text) ? extracted.account : null,
    verified: grounded && amount !== null,
    origin: `email from ${message.from}: ${message.subject}`,
  };
}
