import type {InstanceInfo, SecretEntry, VariableSpecInfo} from '@caton-ai/api';

import type {Configuration} from './configuration.ts';
import {isSecret} from './configuration-form.ts';
import {applies, modelInstances} from './variables.ts';

/** Whether a secret has a usable value: its own, or a shared secret that is stored. */
function usable(entry: SecretEntry | undefined, secrets: readonly SecretEntry[]): boolean {
  if (entry?.stored !== true) {
    return false;
  }
  return (
    entry.macro === null || secrets.some(shared => shared.name === entry.macro && shared.stored)
  );
}

/** Whether a required variable still lacks a value; a chosen model must still exist. */
function lacks(data: Configuration, instance: InstanceInfo, spec: VariableSpecInfo): boolean {
  if (isSecret(spec)) {
    const key = `${instance.plugin}:${instance.id}:${spec.key}`;
    return !usable(
      data.secrets.find(entry => entry.name === key),
      data.secrets,
    );
  }
  const value = instance.settings[spec.key] ?? spec.default;
  if (spec.kind === 'model') {
    return !modelInstances(data).some(model => model.id === value);
  }
  return value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
}

/** Labels of the required variables an instance is still missing. */
function missingOf(data: Configuration, instance: InstanceInfo): string[] {
  const specs = data.plugins.find(candidate => candidate.id === instance.plugin)?.variables ?? [];
  return specs
    .filter(spec => spec.required && applies(spec, instance.settings, specs))
    .filter(spec => lacks(data, instance, spec))
    .map(spec => spec.label);
}

/** What each instance is missing, by instance id; complete instances are left out. */
export function missingByInstance(data: Configuration): ReadonlyMap<string, string[]> {
  return new Map(
    data.instances
      .map(instance => [instance.id, missingOf(data, instance)] as const)
      .filter(([, missing]) => missing.length > 0),
  );
}
