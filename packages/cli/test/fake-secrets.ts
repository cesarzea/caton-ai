import type {KeySource, Vault} from '@caton-ai/secrets';

import type {CommandContext} from '../src/context.ts';

export interface FakeSecrets extends Pick<CommandContext, 'secrets' | 'readSecretValue'> {
  readonly entries: Map<string, string>;
  readonly created: KeySource[];
  /** Values the user "types", in order. */
  readonly typed: string[];
}

/** An in-memory secret store and a user who types the queued values. */
export function fakeSecrets(): FakeSecrets {
  const entries = new Map<string, string>();
  const created: KeySource[] = [];
  const typed: string[] = [];
  const vault: Vault = {
    names: () => [...entries.keys()].sort((left, right) => left.localeCompare(right)),
    get: name => entries.get(name),
    set: (name, value) => {
      entries.set(name, value);
      return Promise.resolve();
    },
    remove: name => Promise.resolve(entries.delete(name)),
    reload: () => Promise.resolve(),
  };
  return {
    entries,
    created,
    typed,
    secrets: {
      init: key => {
        created.push(key);
        return Promise.resolve();
      },
      open: () => Promise.resolve(vault),
    },
    readSecretValue: () => Promise.resolve(typed.shift() ?? ''),
  };
}
