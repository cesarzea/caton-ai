import type {VariableSpec} from '@caton-ai/core';

import type {Instance} from './instance.ts';
import {macroTarget, secretKey} from './macros.ts';
import {isSecret} from './resolve.ts';

/** The variables of each installed plugin, by plugin id. */
export type Catalog = ReadonlyMap<string, readonly VariableSpec[]>;

/**
 * The store keys the instances need, with the titles of the instances needing each: their secret
 * variables, and the shared secrets their settings stand for through macros. Macros inside the
 * store are found by whoever can read it.
 */
export function storeNeeds(
  instances: readonly Instance[],
  catalog: Catalog,
): Map<string, string[]> {
  const needs = new Map<string, string[]>();
  const add = (key: string, title: string): void => {
    const titles = needs.get(key) ?? [];
    needs.set(key, titles.includes(title) ? titles : [...titles, title]);
  };
  for (const instance of instances) {
    for (const spec of catalog.get(instance.plugin) ?? []) {
      const target = macroTarget(instance.settings[spec.key]);
      if (isSecret(spec)) {
        add(secretKey(instance.plugin, instance.id, spec.key), instance.title);
      } else if (target !== null) {
        add(target, instance.title);
      }
    }
  }
  return needs;
}
