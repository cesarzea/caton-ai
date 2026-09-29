import {firstDayOfLastMonths, moneyToDecimal, monthlySpend} from '@caton-ai/core';
import type {SpendBasis} from '@caton-ai/core';
import type {LedgerReader} from '@caton-ai/ledger';
import type {McpServer} from '@modelcontextprotocol/server';
import * as z from 'zod';

import type {ServerContext} from '../context.ts';
import {FRESHNESS, freshnessOf} from '../freshness.ts';
import {withLedger} from '../ledger-access.ts';
import {READ_ONLY, structured} from '../result.ts';
import {AMOUNT, amountOf} from '../views.ts';

const INPUT = z.object({
  months: z.number().int().min(1).max(24).default(3).describe('Calendar months, current included'),
  basis: z
    .enum(['cash', 'accrual'])
    .default('cash')
    .describe('cash: when the money left; accrual: spread over the service period documents state'),
});

const OUTPUT = z.object({
  months: z.array(
    AMOUNT.extend({
      month: z.string().describe('YYYY-MM'),
      onlyInDocuments: z
        .string()
        .describe(
          'The part of the amount that only documents report, such as card charges read from email',
        ),
      notSeen: z
        .string()
        .describe('Receipts no account shows, not in the amount: they may be in a card statement'),
    }),
  ),
  freshness: FRESHNESS,
});

function spendOf(ledger: LedgerReader, from: string, basis: SpendBasis) {
  return monthlySpend(ledger.transactions(from), ledger.documents(from), basis).map(
    ({month, total, onlyInDocuments, notSeen}) => ({
      month,
      ...amountOf(total),
      onlyInDocuments: moneyToDecimal(onlyInDocuments),
      notSeen: moneyToDecimal(notSeen),
    }),
  );
}

export function registerMonthlyOutflows(server: McpServer, context: ServerContext): void {
  server.registerTool(
    'monthly_outflows',
    {
      title: 'Monthly outflows',
      description:
        'Spending per calendar month and currency (cash basis), as positive amounts: booked ' +
        'outflows, except payments matched to the card statement they settle, plus verified card ' +
        'charges that only documents such as email alerts report. Transfers between the user’s ' +
        'own accounts are still included, so it is an upper bound of spending.',
      inputSchema: INPUT,
      outputSchema: OUTPUT,
      annotations: READ_ONLY,
    },
    ({months, basis}) =>
      structured(
        withLedger(context, ledger => ({
          months: spendOf(ledger, firstDayOfLastMonths(context.now(), months), basis),
          freshness: freshnessOf(ledger, context.connections),
        })),
      ),
  );
}
