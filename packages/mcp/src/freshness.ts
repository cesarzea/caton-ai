import type {LedgerReader} from '@caton-ai/ledger';
import * as z from 'zod';

export const FRESHNESS = z
  .object({
    complete: z
      .boolean()
      .describe('False when a connection failed or never synced: figures may be missing movements'),
    incompleteConnections: z.array(z.string()),
    oldestSuccessfulSync: z
      .string()
      .nullable()
      .describe('When the least recently synced connection last synced successfully'),
  })
  .describe('How far the figures can be trusted; tell the user when they are incomplete');

type Freshness = z.infer<typeof FRESHNESS>;

/** The earliest of some ISO timestamps, which sort chronologically as plain strings. */
function oldest(timestamps: readonly string[]): string | null {
  return timestamps.reduce<string | null>(
    (earliest, timestamp) => (earliest === null || timestamp < earliest ? timestamp : earliest),
    null,
  );
}

/** Whether every configured connection synced successfully, and since when the data is current. */
export function freshnessOf(ledger: LedgerReader, connections: readonly string[]): Freshness {
  const incompleteConnections = connections.filter(name => ledger.lastRun(name)?.outcome !== 'ok');
  const synced = connections.map(name => ledger.lastSuccessfulRun(name)?.finishedAt);
  const allSynced = synced.every((finishedAt): finishedAt is string => finishedAt !== undefined);
  return {
    complete: incompleteConnections.length === 0,
    incompleteConnections,
    oldestSuccessfulSync: allSynced ? oldest(synced) : null,
  };
}
