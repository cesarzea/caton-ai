import type {Account, Balance} from '@caton-ai/core';
import type {McpServer} from '@modelcontextprotocol/server';
import * as z from 'zod';

import type {ServerContext} from '../context.ts';
import {FRESHNESS, freshnessOf} from '../freshness.ts';
import {withLedger} from '../ledger-access.ts';
import {READ_ONLY, UNTRUSTED_TEXT, structured} from '../result.ts';
import {AMOUNT, accountHandle, amountOf} from '../views.ts';

const BALANCE = AMOUNT.extend({
  type: z.string().describe('ISO 20022 balance type, such as CLBD (closing booked)'),
  referenceDate: z.string().nullable(),
});

const ACCOUNT = z.object({
  account: z.string().describe('Opaque handle, accepted by list_transactions'),
  institution: z.string(),
  name: z.string(),
  currency: z.string(),
  balances: z.array(BALANCE).describe('Latest balance of each type reported by the bank'),
});

const OUTPUT = z.object({accounts: z.array(ACCOUNT), freshness: FRESHNESS});

function accountView(account: Account, balances: readonly Balance[]): z.infer<typeof ACCOUNT> {
  return {
    account: accountHandle(account.id),
    institution: account.institution,
    name: account.name,
    currency: account.currency,
    balances: balances
      .filter(balance => balance.accountId === account.id)
      .map(balance => ({
        type: balance.type,
        ...amountOf(balance.amount),
        referenceDate: balance.referenceDate,
      })),
  };
}

export function registerListAccounts(server: McpServer, context: ServerContext): void {
  server.registerTool(
    'list_accounts',
    {
      title: 'List accounts',
      description: `Bank accounts in the local ledger with their latest balances. ${UNTRUSTED_TEXT}`,
      inputSchema: z.object({}),
      outputSchema: OUTPUT,
      annotations: READ_ONLY,
    },
    () =>
      structured(
        withLedger(context, ledger => {
          const balances = ledger.latestBalances();
          return {
            accounts: ledger.accounts().map(account => accountView(account, balances)),
            freshness: freshnessOf(ledger, context.connections),
          };
        }),
      ),
  );
}
