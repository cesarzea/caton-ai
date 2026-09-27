import {firstDayOfLastMonths, topCounterparties} from '@caton-ai/core';
import type {McpServer} from '@modelcontextprotocol/server';
import * as z from 'zod';

import type {ServerContext} from '../context.ts';
import {FRESHNESS, freshnessOf} from '../freshness.ts';
import {withLedger} from '../ledger-access.ts';
import {READ_ONLY, UNTRUSTED_TEXT, structured} from '../result.ts';
import {AMOUNT, amountOf} from '../views.ts';

const INPUT = z.object({
  months: z.number().int().min(1).max(24).default(3).describe('Calendar months, current included'),
  limit: z.number().int().min(1).max(50).default(10),
});

const OUTPUT = z.object({
  from: z.string().describe('First date included, YYYY-MM-DD'),
  counterparties: z.array(
    AMOUNT.extend({name: z.string(), movements: z.number().int()}).describe('Paid in total'),
  ),
  freshness: FRESHNESS,
});

export function registerTopCounterparties(server: McpServer, context: ServerContext): void {
  server.registerTool(
    'top_counterparties',
    {
      title: 'Top counterparties',
      description:
        'Who received the most money: booked outflows grouped by counterparty, or by ' +
        'description when the bank gives no counterparty, largest first. Transfers between ' +
        `the user’s own accounts are included. ${UNTRUSTED_TEXT}`,
      inputSchema: INPUT,
      outputSchema: OUTPUT,
      annotations: READ_ONLY,
    },
    ({months, limit}) => {
      const from = firstDayOfLastMonths(context.now(), months);
      return structured(
        withLedger(context, ledger => ({
          from,
          counterparties: topCounterparties(ledger.transactions(from), limit).map(
            ({name, total, movements}) => ({name, ...amountOf(total), movements}),
          ),
          freshness: freshnessOf(ledger, context.connections),
        })),
      );
    },
  );
}
