import type {ConnectionStatus} from '@caton-ai/api';
import type {LedgerReader} from '@caton-ai/ledger';

import type {CatonConfig, Instance} from './config.ts';

function statusOf(reader: LedgerReader | null, {id, title, plugin}: Instance): ConnectionStatus {
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
  };
}

/** The latest sync of every configured instance; all never synced when there is no ledger. */
export function connectionStatuses(
  config: CatonConfig,
  ledger: () => LedgerReader | null,
): ConnectionStatus[] {
  const reader = ledger();
  try {
    return config.instances.map(instance => statusOf(reader, instance));
  } finally {
    reader?.close();
  }
}
