import {firstDayOfLastMonths, monthlyOutflows} from '@caton-ai/core';
import type {McpServer} from '@modelcontextprotocol/server';
import * as z from 'zod';

import type {ServerContext} from '../context.ts';
import {FRESHNESS, freshnessOf} from '../freshness.ts';
import {withLedger} from '../ledger-access.ts';
import {READ_ONLY, structured} from '../result.ts';
import {AMOUNT, amountOf} from '../views.ts';

const INPUT = z.object({
  months: z.number().int().min(1).max(24).default(3).describe('Calendar months, current included'),
});

const OUTPUT = z.object({
  months: z.array(AMOUNT.extend({month: z.string().describe('YYYY-MM')})),
  freshness: FRESHNESS,
});

export function registerMonthlyOutflows(server: McpServer, context: ServerContext): void {
  server.registerTool(
    'monthly_outflows',
    {
      title: 'Monthly outflows',
      description:
        'Money that left the accounts per calendar month and currency (cash basis, booked ' +
        'movements), as positive amounts. It includes transfers between the user’s own ' +
        'accounts and card repayments, so it is an upper bound of spending, not spending itself.',
      inputSchema: INPUT,
      outputSchema: OUTPUT,
      annotations: READ_ONLY,
    },
    ({months}) =>
      structured(
        withLedger(context, ledger => ({
          months: monthlyOutflows(
            ledger.transactions(firstDayOfLastMonths(context.now(), months)),
          ).map(({month, total}) => ({month, ...amountOf(total)})),
          freshness: freshnessOf(ledger, context.connections),
        })),
      ),
  );
}
