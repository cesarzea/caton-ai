import {upcomingCharges} from '@caton-ai/core';
import type {McpServer} from '@modelcontextprotocol/server';
import * as z from 'zod';

import type {ServerContext} from '../context.ts';
import {FRESHNESS, freshnessOf} from '../freshness.ts';
import {withLedger} from '../ledger-access.ts';
import {READ_ONLY, UNTRUSTED_TEXT, structured} from '../result.ts';
import {AMOUNT, amountOf} from '../views.ts';

const DAY_MS = 86_400_000;

const OUTPUT = z.object({
  charges: z.array(
    z.object({
      issuer: z.string(),
      amount: AMOUNT.nullable(),
      date: z.string().describe('When it will be charged, YYYY-MM-DD'),
      account: z.string().nullable().describe('The card or account as the notice writes it'),
      verified: z.boolean(),
    }),
  ),
  freshness: FRESHNESS,
});

const day = (date: Date): string => date.toISOString().slice(0, 10);

export function registerUpcomingCharges(server: McpServer, context: ServerContext): void {
  server.registerTool(
    'upcoming_charges',
    {
      title: 'Upcoming charges',
      description:
        'Charges that renewal notices announce from today on, soonest first; a later ' +
        `cancellation from the same issuer removes them. ${UNTRUSTED_TEXT}`,
      inputSchema: z.object({}),
      outputSchema: OUTPUT,
      annotations: READ_ONLY,
    },
    () =>
      structured(
        withLedger(context, ledger => {
          const now = context.now();
          const since = day(new Date(now.getTime() - 400 * DAY_MS));
          const documents = ledger.documents(since).map(item => item.document);
          return {
            charges: upcomingCharges(documents, day(now)).map(({amount, ...charge}) => ({
              ...charge,
              amount: amount === null ? null : amountOf(amount),
            })),
            freshness: freshnessOf(ledger, context.connections),
          };
        }),
      ),
  );
}
