import type {SecretEntry} from '@caton-ai/api';
import {macroTarget} from '@caton-ai/instances';

/** The store keys the instances need, with the titles of the instances needing each. */
export type SecretNeeds = ReadonlyMap<string, readonly string[]>;

/** What the store holds, without ever giving a value away. */
export interface StoredSecrets {
  readonly names: readonly string[];
  readonly get: (key: string) => string | undefined;
}

function withStoredMacros(stored: StoredSecrets, needs: SecretNeeds): Map<string, string[]> {
  const all = new Map([...needs].map(([key, titles]) => [key, [...titles]]));
  for (const key of stored.names) {
    const target = macroTarget(stored.get(key));
    if (target !== null) {
      // A stored secret that stands for a shared one makes whoever needs it need that one too.
      const titles = all.get(target) ?? [];
      all.set(target, [...new Set([...titles, ...(needs.get(key) ?? [])])]);
    }
  }
  return all;
}

/**
 * The stored secrets and the ones the instances need, missing ones first, each with the shared
 * secret it stands for when its value is a `${name}` macro. Values are never included.
 */
export function secretEntries(stored: StoredSecrets, needs: SecretNeeds): SecretEntry[] {
  const all = withStoredMacros(stored, needs);
  const names = [...new Set([...stored.names, ...all.keys()])];
  return names
    .map(name => ({
      name,
      stored: stored.names.includes(name),
      macro: macroTarget(stored.get(name)),
      usedBy: all.get(name) ?? [],
    }))
    .sort(
      (left, right) =>
        Number(left.stored) - Number(right.stored) || left.name.localeCompare(right.name),
    );
}
