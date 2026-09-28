import type {InstanceInfo, PluginInfo, VariableSpecInfo} from '@caton-ai/api';

import type {Configuration} from './configuration.ts';

type Settings = Readonly<Record<string, unknown>>;

/** A setting's value, or its default while it is unset. */
function valueOf(key: string, settings: Settings, specs: readonly VariableSpecInfo[]): unknown {
  const value = settings[key];
  return value === undefined || value === ''
    ? specs.find(spec => spec.key === key)?.default
    : value;
}

/** Whether a variable applies: always, or while the variable it depends on holds its values. */
export function applies(
  spec: VariableSpecInfo,
  settings: Settings,
  specs: readonly VariableSpecInfo[],
): boolean {
  if (spec.when === undefined) {
    return true;
  }
  const value = valueOf(spec.when.variable, settings, specs);
  return typeof value === 'string' && spec.when.values.includes(value);
}

/** The shared secret a per-provider secret is kept in, such as `anthropic-api-key`. */
export function sharedSecretName(
  spec: VariableSpecInfo,
  settings: Settings,
  specs: readonly VariableSpecInfo[],
): string | null {
  if (spec.sharedPer === undefined) {
    return null;
  }
  const owner = valueOf(spec.sharedPer, settings, specs);
  return typeof owner === 'string' && owner !== '' ? `${owner}-${spec.key}` : null;
}

export const pluginsOfKind = (data: Configuration, kind: PluginInfo['kind']): PluginInfo[] =>
  data.plugins.filter(plugin => plugin.kind === kind);

/** The configured language models, which connections choose from. */
export function modelInstances(data: Configuration): InstanceInfo[] {
  const models = new Set(pluginsOfKind(data, 'model').map(plugin => plugin.id));
  return data.instances.filter(instance => models.has(instance.plugin));
}

/** The titles of the instances that chose a model. */
export function modelUsers(data: Configuration, id: string): string[] {
  return data.instances
    .filter(instance =>
      (data.plugins.find(plugin => plugin.id === instance.plugin)?.variables ?? []).some(
        spec => spec.kind === 'model' && instance.settings[spec.key] === id,
      ),
    )
    .map(instance => instance.title);
}
