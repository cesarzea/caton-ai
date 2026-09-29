import {firstDayOfLastMonths, formatMoney, monthlySpend} from '@caton-ai/core';
import type {Money, SpendBasis} from '@caton-ai/core';

import {untrustedConnections} from '../context.ts';
import type {CommandContext} from '../context.ts';
import {table} from '../output.ts';

/**
 * Spending per month: outflows except payments that settle a card's statement, plus verified
 * charges only documents report; on a cash basis, or spread over the periods paid for. Receipts
 * no account shows are listed apart. Warns when a source is failing.
 */
export function spendCommand(context: CommandContext, months: number, basis: SpendBasis): number {
  const ledger = context.ledger();
  const from = firstDayOfLastMonths(context.now(), months);
  const totals = monthlySpend(ledger.transactions(from), ledger.documents(from), basis);
  const untrusted = untrustedConnections(context, ledger);
  ledger.close();
  const format = (amount: Money): string =>
    amount.minorUnits === 0 ? '—' : formatMoney(amount, context.locale);
  const rows = totals.map(({month, total, onlyInDocuments, notSeen}) => [
    month,
    formatMoney(total, context.locale),
    format(onlyInDocuments),
    format(notSeen),
  ]);
  const header = ['Month', 'Spending', 'Only in documents', 'Receipts no account shows'];
  table([header, ...rows]).forEach(line => {
    context.output.line(line);
  });
  if (untrusted.length > 0) {
    context.output.error(`⚠ Incomplete: last sync failed or never ran for ${untrusted.join(', ')}`);
    return 1;
  }
  return 0;
}
