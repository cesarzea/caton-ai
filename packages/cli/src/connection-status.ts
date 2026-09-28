import type {ConnectionStatus} from '@caton-ai/api';
import type {LedgerReader} from '@caton-ai/ledger';

import type {Instance} from './config.ts';

function statusOf(
  reader: LedgerReader | null,
  {id, title, plugin, changedAt}: Instance,
): ConnectionStatus {
  const last = reader?.lastRun(id) ?? null;
  if (reader === null || last === null) {
    return {
      id,
      title,
      plugin,
      lastOutcome: 'never',
      lastRunAt: null,
      lastSuccessfulSyncAt: null,
      error: null,
      changedSinceSync: false,
    };
  }
  return {
    id,
    title,
    plugin,
    lastOutcome: last.outcome,
    lastRunAt: last.finishedAt,
    lastSuccessfulSyncAt: reader.lastSuccessfulRun(id)?.finishedAt ?? null,
    error: last.error,
    changedSinceSync: changedAt !== undefined && changedAt > last.finishedAt,
  };
}

/** The latest sync of every connection; all never synced when there is no ledger. */
export function connectionStatuses(
  instances: readonly Instance[],
  ledger: () => LedgerReader | null,
): ConnectionStatus[] {
  const reader = ledger();
  try {
    return instances.map(instance => statusOf(reader, instance));
  } finally {
    reader?.close();
  }
}
