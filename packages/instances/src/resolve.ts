import type {VariableSpec} from '@caton-ai/core';

import type {Instance} from './instance.ts';
import {InstanceError} from './instance.ts';
import {literal, macroTarget, secretKey} from './macros.ts';

/** Reads the store: `undefined` when a key has no value. It throws when the store is locked. */
export type Lookup = (key: string) => string | undefined;

export const isSecret = (spec: VariableSpec): boolean =>
  spec.kind === 'secret' || spec.kind === 'secret-file';

/** Whether a variable applies to an instance: always, or while its condition holds. */
export function applies(
  spec: VariableSpec,
  instance: Instance,
  specs: readonly VariableSpec[],
): boolean {
  if (spec.when === undefined) {
    return true;
  }
  const {variable, values} = spec.when;
  const value = instance.settings[variable] ?? specs.find(other => other.key === variable)?.default;
  return typeof value === 'string' && values.includes(value);
}

function rawValue(instance: Instance, spec: VariableSpec, lookup: Lookup): unknown {
  if (isSecret(spec)) {
    return lookup(secretKey(instance.plugin, instance.id, spec.key));
  }
  return instance.settings[spec.key] ?? spec.default;
}

/** Follows a `${name}` macro to its shared secret: one level only. */
function throughMacro(
  value: unknown,
  spec: VariableSpec,
  lookup: Lookup,
  problems: string[],
): unknown {
  const target = macroTarget(value);
  if (target === null) {
    return typeof value === 'string' ? literal(value) : value;
  }
  const shared = lookup(target);
  if (shared === undefined) {
    problems.push(`${spec.label} needs the shared secret "${target}", which is missing`);
  } else if (macroTarget(shared) !== null) {
    problems.push(`${spec.label}: the shared secret "${target}" cannot itself be a macro`);
  } else {
    return literal(shared);
  }
  return undefined;
}

function typed(value: unknown, spec: VariableSpec): unknown {
  return spec.kind === 'number' && typeof value === 'string' && value.trim() !== ''
    ? Number(value)
    : value;
}

/**
 * The variables of an instance as its plugin receives them: secrets read from the store and
 * macros followed. Throws, naming every missing variable but never a value.
 */
export function resolveVariables(
  instance: Instance,
  specs: readonly VariableSpec[],
  lookup: Lookup,
): Record<string, unknown> {
  const problems: string[] = [];
  const variables: Record<string, unknown> = {};
  for (const spec of specs.filter(candidate => applies(candidate, instance, specs))) {
    const value = throughMacro(rawValue(instance, spec, lookup), spec, lookup, problems);
    if (value === undefined || value === '') {
      if (spec.required && problems.every(problem => !problem.startsWith(spec.label))) {
        problems.push(`${spec.label} is missing`);
      }
    } else {
      variables[spec.key] = typed(value, spec);
    }
  }
  if (problems.length > 0) {
    throw new InstanceError(`${instance.title}: ${problems.join('; ')}`);
  }
  return variables;
}
