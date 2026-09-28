import {firstDayOfLastMonths, formatMoney, monthlySpend} from '@caton-ai/core';

import {untrustedConnections} from '../context.ts';
import type {CommandContext} from '../context.ts';
import {table} from '../output.ts';

/**
 * Spending per month (cash basis): outflows except payments that settle a card's statement,
 * plus verified charges only documents report. Transfers between the user's own accounts are
 * still included. Warns when a source is failing.
 */
export function spendCommand(context: CommandContext, months: number): number {
  const ledger = context.ledger();
  const from = firstDayOfLastMonths(context.now(), months);
  const totals = monthlySpend(ledger.transactions(from), ledger.documents(from));
  const untrusted = untrustedConnections(context, ledger);
  ledger.close();
  const format = (amount: Parameters<typeof formatMoney>[0]): string =>
    amount.minorUnits === 0 ? '—' : formatMoney(amount, context.locale);
  const rows = totals.map(({month, total, onlyInDocuments}) => [
    month,
    formatMoney(total, context.locale),
    format(onlyInDocuments),
  ]);
  table([['Month', 'Spending', 'Only in documents'], ...rows]).forEach(line => {
    context.output.line(line);
  });
  if (untrusted.length > 0) {
    context.output.error(`⚠ Incomplete: last sync failed or never ran for ${untrusted.join(', ')}`);
    return 1;
  }
  return 0;
}
