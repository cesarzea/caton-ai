import type {LedgerReader} from '@caton-ai/ledger';
import type {McpServer} from '@modelcontextprotocol/server';
import * as z from 'zod';

import type {ServerContext} from '../context.ts';
import {FRESHNESS, freshnessOf} from '../freshness.ts';
import {withLedger} from '../ledger-access.ts';
import {READ_ONLY, structured} from '../result.ts';

const CONNECTION = z.object({
  connection: z.string(),
  lastOutcome: z.enum(['ok', 'failed', 'never']),
  lastRunAt: z.string().nullable(),
  lastSuccessfulSyncAt: z.string().nullable(),
  error: z.string().nullable().describe('Why the last sync failed, with identifiers masked'),
});

const OUTPUT = z.object({connections: z.array(CONNECTION), freshness: FRESHNESS});

/** Masks the provider identifiers (sessions, accounts, UUIDs) that error messages may carry. */
function maskIdentifiers(message: string): string {
  return message
    .replaceAll(/(\/(?:accounts|sessions)\/)[^/\s?]+/gu, '$1…')
    .replaceAll(/\b[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}\b/giu, '…');
}

function connectionStatus(ledger: LedgerReader, name: string): z.infer<typeof CONNECTION> {
  const last = ledger.lastRun(name);
  if (last === null) {
    const never = {lastRunAt: null, lastSuccessfulSyncAt: null, error: null};
    return {connection: name, lastOutcome: 'never', ...never};
  }
  return {
    connection: name,
    lastOutcome: last.outcome,
    lastRunAt: last.finishedAt,
    lastSuccessfulSyncAt: ledger.lastSuccessfulRun(name)?.finishedAt ?? null,
    error: last.error === null ? null : maskIdentifiers(last.error),
  };
}

export function registerSyncStatus(server: McpServer, context: ServerContext): void {
  server.registerTool(
    'sync_status',
    {
      title: 'Sync status',
      description:
        'Latest sync of every bank connection. Syncs run outside this server (`caton sync`); ' +
        'this tool never contacts a bank. Call it first when figures look incomplete.',
      inputSchema: z.object({}),
      outputSchema: OUTPUT,
      annotations: READ_ONLY,
    },
    () =>
      structured(
        withLedger(context, ledger => ({
          connections: context.connections.map(name => connectionStatus(ledger, name)),
          freshness: freshnessOf(ledger, context.connections),
        })),
      ),
  );
}
