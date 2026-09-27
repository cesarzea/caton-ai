import {moneyFromDecimal, negateMoney} from '@caton-ai/core';
import type {Money} from '@caton-ai/core';

import {currencyOf, normalizeAmount} from './amount.ts';
import {belongsTo} from './authenticity.ts';
import {parseDate} from './date.ts';
import type {MailMessage} from './message.ts';
import {captured} from './recipe.ts';
import type {Recipe} from './recipe.ts';
import {bodyText} from './text.ts';

/** A movement read from one email. */
export interface Alert {
  readonly date: string;
  readonly amount: Money;
  readonly merchant: string;
}

export type Extraction =
  {readonly ok: true; readonly alert: Alert} | {readonly ok: false; readonly reason: string};

/** A field a recipe expects is missing or malformed in the email. */
class Unreadable extends Error {
  override readonly name = 'Unreadable';
}

/** Whether a recipe is meant for this message: sender domain and, if set, subject. */
export function isFor(recipe: Recipe, message: MailMessage): boolean {
  const domain = message.from.split('@').at(-1) ?? '';
  const subject =
    recipe.subject === undefined || new RegExp(recipe.subject, 'iu').test(message.subject);
  return belongsTo(domain, recipe.senderDomain) && subject;
}

function required(value: string | null, what: string): string {
  if (value === null || value === '') {
    throw new Unreadable(`no ${what} found`);
  }
  return value;
}

function currencyIn(recipe: Recipe, text: string): string {
  if (recipe.fields.currency === undefined) {
    return recipe.account.currency;
  }
  const written = required(captured(text, recipe.fields.currency), 'currency');
  return required(currencyOf(written), 'known currency');
}

function amountIn(recipe: Recipe, text: string): Money {
  const written = required(captured(text, recipe.fields.amount), 'amount');
  const decimal = required(normalizeAmount(written, recipe.numberFormat), 'valid amount');
  const currency = currencyIn(recipe, text);
  try {
    const amount = moneyFromDecimal(decimal, currency);
    return recipe.direction === 'out' ? negateMoney(amount) : amount;
  } catch {
    throw new Unreadable(`amount ${decimal} is not valid in ${currency}`);
  }
}

function dateIn(recipe: Recipe, text: string, message: MailMessage): string {
  if (recipe.fields.date === undefined) {
    return message.date.toISOString().slice(0, 10);
  }
  const written = required(captured(text, recipe.fields.date), 'date');
  return required(parseDate(written, recipe.dateFormat), 'valid date');
}

/** Reads the movement a recipe describes, or says what it could not find. */
export function extract(recipe: Recipe, message: MailMessage): Extraction {
  const text = bodyText(message);
  try {
    const amount = amountIn(recipe, text);
    const merchant = required(captured(text, recipe.fields.merchant), 'merchant');
    return {ok: true, alert: {date: dateIn(recipe, text, message), amount, merchant}};
  } catch (error) {
    if (error instanceof Unreadable) {
      return {ok: false, reason: error.message};
    }
    throw error;
  }
}
