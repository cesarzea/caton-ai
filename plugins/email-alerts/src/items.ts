import {createHash} from 'node:crypto';

import {moneyFromDecimal, negateMoney} from '@caton-ai/core';
import type {FinancialDocument, Money, Transaction} from '@caton-ai/core';

import {currencyOf, parseWrittenAmount} from './amount.ts';
import {belongsTo} from './authenticity.ts';
import {parseDate} from './date.ts';
import type {Extracted} from './extraction.ts';
import type {MailMessage} from './message.ts';

/** What one email yields: its document, and a movement when it is an alert of an email-only card. */
export interface ReadItems {
  readonly document: FinancialDocument;
  readonly transaction: Transaction | null;
}

const squeeze = (text: string): string => text.replaceAll(/\s+/gu, ' ').toLowerCase();

/** Whether the model's copy of a field appears in the email as it is written there. */
function written(value: string | null, text: string): boolean {
  return value !== null && value.trim() !== '' && squeeze(text).includes(squeeze(value.trim()));
}

const isoDate = (value: string | null): string | null =>
  value === null ? null : parseDate(value, 'YYYY-MM-DD');

/** The amount parsed here from what is written; the currency must be written too. */
/** The currency written in the amount, else the model's code if the email writes it. */
function writtenCurrency(
  inAmount: string | null,
  extracted: Extracted,
  text: string,
): string | null {
  const code = extracted.currency === null ? null : currencyOf(extracted.currency);
  return inAmount ?? (code !== null && text.includes(code) ? code : null);
}

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

const hash = (value: string): string =>
  createHash('sha256').update(value).digest('hex').slice(0, 16);

/** The account of an email-only card, named by the sender domain of its alerts. */
export const cardAccountId = (domain: string): string => `email:${domain}`;

export interface ItemContext {
  readonly message: MailMessage;
  readonly text: string;
  readonly senderDomain: string;
  /** Sender domains of cards that have no other feed, such as `americanexpress.com`. */
  readonly cardDomains: readonly string[];
}

function movementOf(document: FinancialDocument, context: ItemContext): Transaction | null {
  const card = context.cardDomains.find(domain => belongsTo(context.senderDomain, domain));
  const {amount} = document;
  if (card === undefined || amount === null || !document.verified) {
    return null;
  }
  if (document.kind !== 'charge' && document.kind !== 'refund') {
    return null;
  }
  const accountId = cardAccountId(card);
  return {
    id: `${accountId}:${hash(context.message.messageId)}`,
    accountId,
    status: 'booked',
    bookingDate: document.issuedOn,
    valueDate: null,
    transactionDate: document.issuedOn,
    amount: document.kind === 'refund' ? amount : negateMoney(amount),
    counterparty: document.issuer,
    description: context.message.subject,
    merchantCategoryCode: null,
  };
}

/**
 * The document an email is, verified only when amount, issuer and date are all written in it as
 * the model copied them; which card it feeds comes from the authenticated sender, never the model.
 */
export function itemsOf(extracted: Extracted, context: ItemContext): ReadItems | null {
  const {message, text} = context;
  if (extracted.kind === 'none') {
    return null;
  }
  const amount = amountOf(extracted, text);
  const grounded =
    written(extracted.amount_written, text) &&
    written(extracted.date_written, text) &&
    (written(extracted.issuer, text) || written(extracted.issuer, context.senderDomain));
  const document: FinancialDocument = {
    id: `email:${message.messageId}`,
    kind: extracted.kind,
    issuer: extracted.issuer ?? context.senderDomain,
    amount,
    issuedOn: isoDate(extracted.date) ?? message.date.toISOString().slice(0, 10),
    periodStart: isoDate(extracted.period_start),
    periodEnd: isoDate(extracted.period_end),
    dueOn: isoDate(extracted.due_date),
    reference: extracted.reference,
    verified: grounded && amount !== null,
    origin: `email from ${message.from}: ${message.subject}`,
  };
  return {document, transaction: movementOf(document, context)};
}
