import {formatMoney, monthlyOutflows} from '@caton-ai/core';

import {untrustedConnections} from '../context.ts';
import type {CommandContext} from '../context.ts';
import {table} from '../output.ts';

/** First day of the month `months - 1` months before `now`, as ISO `YYYY-MM-DD`. */
function firstDayMonthsAgo(now: Date, months: number): string {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));
  return start.toISOString().slice(0, 10);
}

/** Money that left the accounts per month (cash basis); warns when a source is failing. */
export function spendCommand(context: CommandContext, months: number): number {
  const ledger = context.ledger();
  const totals = monthlyOutflows(ledger.transactions(firstDayMonthsAgo(context.now(), months)));
  const untrusted = untrustedConnections(context, ledger);
  ledger.close();
  const rows = totals.map(({month, total}) => [month, formatMoney(total, context.locale)]);
  table([['Month', 'Spent'], ...rows]).forEach(line => {
    context.output.line(line);
  });
  if (untrusted.length > 0) {
    context.output.error(`⚠ Incomplete: last sync failed or never ran for ${untrusted.join(', ')}`);
    return 1;
  }
  return 0;
}
