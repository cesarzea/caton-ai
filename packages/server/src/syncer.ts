import {HttpError} from './http.ts';
import type {StoreHolder} from './store-holder.ts';

/** Syncs the connections given, reading secrets through `lookup`; failures are kept per connection. */
export type SyncRunner = (
  connections: readonly string[],
  lookup: (key: string) => string | undefined,
) => Promise<void>;

/** One sync at a time, in the background, while the page follows it through the status. */
export interface Syncer {
  running(): readonly string[];
  /** Starts a sync of `requested`, or of every connection when null; returns what it syncs. */
  start(requested: readonly string[] | null): Promise<readonly string[]>;
}

export interface SyncerOptions {
  readonly run: SyncRunner;
  readonly store: StoreHolder;
  readonly connections: () => readonly string[];
  readonly log: (message: string) => void;
}

function chosen(requested: readonly string[] | null, known: readonly string[]): readonly string[] {
  const unknown = (requested ?? []).filter(id => !known.includes(id));
  if (unknown.length > 0) {
    throw new HttpError(404, `Unknown connection: ${unknown.join(', ')}`);
  }
  return requested ?? known;
}

export function createSyncer({run, store, connections, log}: SyncerOptions): Syncer {
  let running: readonly string[] = [];
  return {
    running: () => running,
    start: async requested => {
      if (running.length > 0) {
        throw new HttpError(409, 'A sync is already running');
      }
      if (store.status().state !== 'unlocked') {
        throw new HttpError(409, 'Unlock the secret store first');
      }
      const ids = chosen(requested, connections());
      const vault = store.vault();
      await vault.reload();
      running = ids;
      void run(ids, key => vault.get(key))
        .catch((error: unknown) => {
          log(`Sync failed: ${error instanceof Error ? error.message : String(error)}`);
        })
        .finally(() => {
          running = [];
        });
      return ids;
    },
  };
}
