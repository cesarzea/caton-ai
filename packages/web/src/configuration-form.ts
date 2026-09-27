import type {InstanceInfo, InstanceRequest, PluginInfo, VariableSpecInfo} from '@caton-ai/api';
import {MACRO} from '@caton-ai/api';

export const isSecret = (spec: VariableSpecInfo): boolean =>
  spec.kind === 'secret' || spec.kind === 'secret-file';

/** The form text of a stored setting: lists are shown comma-separated. */
function formValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

/** The initial form values of an instance, or of a new one from the plugin's defaults. */
export function initialSettings(
  plugin: PluginInfo,
  instance: InstanceInfo | undefined,
): Record<string, string> {
  const values: Record<string, string> = {};
  for (const spec of plugin.variables.filter(variable => !isSecret(variable))) {
    values[spec.key] = formValue(
      instance === undefined ? spec.default : instance.settings[spec.key],
    );
  }
  return values;
}

type SettingValue = InstanceRequest['settings'][string];

/** A value the form cannot send, with what the user must fix. */
class FormError extends Error {
  override readonly name = 'FormError';
}

const asText = (value: string): string => value;

const asList = (value: string): string[] =>
  value
    .split(',')
    .map(item => item.trim())
    .filter(item => item !== '');

function numberOf(spec: VariableSpecInfo): (value: string) => number {
  return value => {
    if (!/^\d+$/u.test(value)) {
      throw new FormError(`${spec.label} must be a whole number`);
    }
    return Number(value);
  };
}

function converterOf(
  kind: VariableSpecInfo['kind'],
  spec: VariableSpecInfo,
): (text: string) => SettingValue {
  switch (kind) {
    case 'list':
      return asList;
    case 'number':
      return numberOf(spec);
    case 'text':
    case 'choice':
    case 'secret':
    case 'secret-file':
    case 'model':
      return asText;
  }
}

/** A typed value; a `${name}` macro stays text, to be resolved when the connection syncs. */
function typed(spec: VariableSpecInfo, value: string): SettingValue {
  return converterOf(MACRO.test(value) ? 'text' : spec.kind, spec)(value);
}

/** The request for the server: non-secret settings only, empty ones left out. */
export function instanceRequest(
  plugin: PluginInfo,
  title: string,
  settings: Readonly<Record<string, string>>,
  creating: boolean,
): InstanceRequest {
  const values: InstanceRequest['settings'] = {};
  for (const spec of plugin.variables.filter(variable => !isSecret(variable))) {
    const value = (settings[spec.key] ?? '').trim();
    if (value !== '') {
      values[spec.key] = typed(spec, value);
    }
  }
  return creating ? {title, plugin: plugin.id, settings: values} : {title, settings: values};
}
