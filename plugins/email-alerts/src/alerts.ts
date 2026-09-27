import {createHash} from 'node:crypto';

import {currencyCode} from '@caton-ai/core';
import type {Account, Transaction} from '@caton-ai/core';

import {isAuthentic} from './authenticity.ts';
import {extract, isFor} from './extract.ts';
import type {Alert} from './extract.ts';
import type {MailMessage} from './message.ts';
import type {Recipe} from './recipe.ts';

export const SOURCE_NAME = 'email-alerts';

export interface AlertsOptions {
  /** Receiving server whose `Authentication-Results` are trusted, e.g. `mx.google.com`. */
  readonly authServer: string;
}

/** What a batch of messages yields: movements, and messages that failed a recipe. */
export interface AlertsReport {
  readonly transactions: Transaction[];
  readonly unreadable: string[];
  /** Messages claiming a recipe's sender that their receiving server did not authenticate. */
  readonly rejected: number;
}

const hash = (value: string): string =>
  createHash('sha256').update(value).digest('hex').slice(0, 16);

/**
 * The account a recipe feeds. Its id depends only on the institution and account name, so that
 * recipes and connections (mailboxes) describing the same card feed one account.
 */
export function accountOf(recipe: Recipe): Account {
  const {institution, name, currency} = recipe.account;
  const id = `email:${hash([institution, name].join('\n'))}`;
  return {
    id,
    sourceRef: id,
    source: SOURCE_NAME,
    institution,
    name,
    currency: currencyCode(currency),
  };
}

function transactionOf(
  recipe: Recipe,
  alert: Alert,
  message: MailMessage,
  accountId: string,
): Transaction {
  return {
    id: `${accountId}:${hash([recipe.id, message.messageId].join('\n'))}`,
    accountId,
    status: 'booked',
    bookingDate: alert.date,
    valueDate: null,
    transactionDate: alert.date,
    amount: alert.amount,
    counterparty: alert.merchant,
    description: message.subject,
    merchantCategoryCode: null,
  };
}

/** Applies the first recipe meant for each message; messages no recipe is meant for are ignored. */
export function readAlerts(
  messages: readonly MailMessage[],
  recipes: readonly Recipe[],
  options: AlertsOptions,
): AlertsReport {
  const report: AlertsReport = {transactions: [], unreadable: [], rejected: 0};
  let rejected = 0;
  for (const message of messages) {
    const recipe = recipes.find(candidate => isFor(candidate, message));
    if (recipe === undefined) {
      continue;
    }
    if (!isAuthentic(message, recipe.senderDomain, options.authServer)) {
      rejected += 1;
      continue;
    }
    const extraction = extract(recipe, message);
    if (extraction.ok) {
      const account = accountOf(recipe);
      report.transactions.push(transactionOf(recipe, extraction.alert, message, account.id));
    } else {
      const sent = message.date.toISOString();
      report.unreadable.push(`${recipe.id}, email of ${sent}: ${extraction.reason}`);
    }
  }
  return {...report, rejected};
}
