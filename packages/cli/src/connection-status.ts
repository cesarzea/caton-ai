import type {ConnectionStatus} from '@caton-ai/api';
import type {LedgerReader} from '@caton-ai/ledger';

import type {CatonConfig} from './config.ts';

function statusOf(reader: LedgerReader | null, name: string, type: string): ConnectionStatus {
  const last = reader?.lastRun(name) ?? null;
  if (reader === null || last === null) {
    return {
      name,
      type,
      lastOutcome: 'never',
      lastRunAt: null,
      lastSuccessfulSyncAt: null,
      error: null,
    };
  }
  return {
    name,
    type,
    lastOutcome: last.outcome,
    lastRunAt: last.finishedAt,
    lastSuccessfulSyncAt: reader.lastSuccessfulRun(name)?.finishedAt ?? null,
    error: last.error,
  };
}

/** The latest sync of every configured connection; all never synced when there is no ledger. */
export function connectionStatuses(
  config: CatonConfig,
  ledger: () => LedgerReader | null,
): ConnectionStatus[] {
  const reader = ledger();
  try {
    return config.connections.map(({name, type}) => statusOf(reader, name, type));
  } finally {
    reader?.close();
  }
}
