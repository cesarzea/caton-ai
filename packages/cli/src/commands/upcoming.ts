import {formatMoney, upcomingCharges} from '@caton-ai/core';

import type {CommandContext} from '../context.ts';
import {table} from '../output.ts';

const DAY_MS = 86_400_000;

/** `caton upcoming`: the charges renewal notices announce, soonest first. */
export function upcomingCommand(context: CommandContext): number {
  const ledger = context.ledger();
  const now = context.now();
  const since = new Date(now.getTime() - 400 * DAY_MS).toISOString().slice(0, 10);
  const documents = ledger.documents(since).map(item => item.document);
  ledger.close();
  const charges = upcomingCharges(documents, now.toISOString().slice(0, 10));
  if (charges.length === 0) {
    context.output.line('No renewal notices announce a charge.');
    return 0;
  }
  const rows = charges.map(charge => [
    charge.date,
    charge.issuer,
    charge.amount === null ? '—' : formatMoney(charge.amount, context.locale),
    charge.account ?? '—',
  ]);
  table([['Date', 'Issuer', 'Amount', 'Card or account'], ...rows]).forEach(line => {
    context.output.line(line);
  });
  return 0;
}
