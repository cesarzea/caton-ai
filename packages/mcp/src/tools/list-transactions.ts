import type {LedgerReader, TransactionQuery} from '@caton-ai/ledger';
import type {McpServer} from '@modelcontextprotocol/server';
import * as z from 'zod';

import type {ServerContext} from '../context.ts';
import {FRESHNESS, freshnessOf} from '../freshness.ts';
import {withLedger} from '../ledger-access.ts';
import {READ_ONLY, UNTRUSTED_TEXT, structured} from '../result.ts';
import {ISO_DATE, TRANSACTION, accountIdOf, transactionView} from '../views.ts';

const MAX_PAGE = 200;

const INPUT = z.object({
  from: ISO_DATE.optional().describe('First date included, YYYY-MM-DD'),
  to: ISO_DATE.optional().describe('Last date included, YYYY-MM-DD'),
  account: z.string().optional().describe('Account handle from list_accounts'),
  direction: z.enum(['in', 'out']).optional().describe('in: money received; out: money paid'),
  text: z.string().min(1).max(100).optional().describe('Case-insensitive text to look for'),
  limit: z.number().int().min(1).max(MAX_PAGE).default(50),
  offset: z.number().int().min(0).default(0),
});

const OUTPUT = z.object({
  transactions: z.array(TRANSACTION),
  total: z.number().int().describe('How many movements match, across every page'),
  truncated: z.boolean().describe('True when more movements match: ask for the next offset'),
  freshness: FRESHNESS,
});

type Input = z.infer<typeof INPUT>;

function queryOf(input: Input, ledger: LedgerReader): TransactionQuery {
  const {account, ...filters} = input;
  return account === undefined
    ? filters
    : {...filters, accountId: accountIdOf(ledger.accounts(), account)};
}

function listTransactions(context: ServerContext, input: Input): z.infer<typeof OUTPUT> {
  return withLedger(context, ledger => {
    const page = ledger.searchTransactions(queryOf(input, ledger));
    return {
      transactions: page.transactions.map(transactionView),
      total: page.total,
      truncated: input.offset + page.transactions.length < page.total,
      freshness: freshnessOf(ledger, context.connections),
    };
  });
}

export function registerListTransactions(server: McpServer, context: ServerContext): void {
  server.registerTool(
    'list_transactions',
    {
      title: 'List transactions',
      description:
        'Bank movements, newest first, one page at a time. Amounts are negative when money ' +
        `left the account. ${UNTRUSTED_TEXT}`,
      inputSchema: INPUT,
      outputSchema: OUTPUT,
      annotations: READ_ONLY,
    },
    input => structured(listTransactions(context, input)),
  );
}
