import {firstDayOfLastMonths, formatMoney, monthlyOutflows} from '@caton-ai/core';

import {untrustedConnections} from '../context.ts';
import type {CommandContext} from '../context.ts';
import {table} from '../output.ts';

/**
 * Money that left the accounts per month (cash basis), including transfers between the user's own
 * accounts until transfer detection exists. Warns when a source is failing.
 */
export function spendCommand(context: CommandContext, months: number): number {
  const ledger = context.ledger();
  const totals = monthlyOutflows(ledger.transactions(firstDayOfLastMonths(context.now(), months)));
  const untrusted = untrustedConnections(context, ledger);
  ledger.close();
  const rows = totals.map(({month, total}) => [month, formatMoney(total, context.locale)]);
  table([['Month', 'Outflows'], ...rows]).forEach(line => {
    context.output.line(line);
  });
  if (untrusted.length > 0) {
    context.output.error(`⚠ Incomplete: last sync failed or never ran for ${untrusted.join(', ')}`);
    return 1;
  }
  return 0;
}
