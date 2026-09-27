import type {SecretEntry} from '@caton-ai/api';

/** Who refers to each secret by name: connections and plugins of the configuration. */
export type SecretReferences = ReadonlyMap<string, readonly string[]>;

/**
 * The stored secrets and the ones the configuration needs, missing ones first, so that the
 * interface can ask for exactly what is missing.
 */
export function secretEntries(
  stored: readonly string[],
  references: SecretReferences,
): SecretEntry[] {
  const names = [...new Set([...stored, ...references.keys()])];
  return names
    .map(name => ({name, stored: stored.includes(name), usedBy: [...(references.get(name) ?? [])]}))
    .sort(
      (left, right) =>
        Number(left.stored) - Number(right.stored) || left.name.localeCompare(right.name),
    );
}
