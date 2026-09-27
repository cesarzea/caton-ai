import {formatMoney} from '@caton-ai/core';

import type {CommandContext} from '../context.ts';
import {table} from '../output.ts';

/** Lists the accounts in the ledger with their latest closing or available balance. */
export function accountsCommand(context: CommandContext): number {
  const ledger = context.ledger();
  const balances = ledger.latestBalances();
  const rows = ledger.accounts().map(account => {
    const balance = balances.find(item => item.accountId === account.id);
    return [
      account.institution,
      account.name,
      balance === undefined ? '—' : formatMoney(balance.amount, context.locale),
    ];
  });
  ledger.close();
  if (rows.length === 0) {
    context.output.line('No accounts yet. Run: caton sync');
    return 0;
  }
  table([['Institution', 'Account', 'Balance'], ...rows]).forEach(line => {
    context.output.line(line);
  });
  return 0;
}
