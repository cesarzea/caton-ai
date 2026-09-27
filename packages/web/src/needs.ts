import type {InstanceInfo, SecretEntry} from '@caton-ai/api';

import {isSecret} from './configuration-form.ts';
import type {Configuration} from './use-instance-editor.ts';

/** Whether a secret has a usable value: its own, or a shared secret that is stored. */
function usable(entry: SecretEntry | undefined, secrets: readonly SecretEntry[]): boolean {
  if (entry?.stored !== true) {
    return false;
  }
  return (
    entry.macro === null || secrets.some(shared => shared.name === entry.macro && shared.stored)
  );
}

/** Labels of the required variables an instance is still missing. */
function missingOf(data: Configuration, instance: InstanceInfo): string[] {
  const plugin = data.plugins.find(candidate => candidate.id === instance.plugin);
  return (plugin?.variables ?? [])
    .filter(spec => spec.required)
    .filter(spec => {
      if (isSecret(spec)) {
        const key = `${instance.plugin}:${instance.id}:${spec.key}`;
        return !usable(
          data.secrets.find(entry => entry.name === key),
          data.secrets,
        );
      }
      const value = instance.settings[spec.key] ?? spec.default;
      return value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
    })
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
