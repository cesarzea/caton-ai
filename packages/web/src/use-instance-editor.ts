import type {InstanceInfo, PluginInfo, VariableSpecInfo} from '@caton-ai/api';
import {useState} from 'react';

import type {Api} from './api.ts';
import type {Configuration} from './configuration.ts';
import {initialSettings, instanceRequest, isSecret} from './configuration-form.ts';
import {applies, sharedSecretName} from './variables.ts';

type Values = Readonly<Record<string, string>>;

/** The editable state of one instance form. */
export interface InstanceForm {
  readonly plugin: PluginInfo | undefined;
  readonly title: string;
  readonly setTitle: (title: string) => void;
  readonly settings: Values;
  readonly setSettings: (settings: Values) => void;
  /** Secret values typed in this form, by variable; they are sent once, when saving. */
  readonly secrets: Values;
  readonly setSecrets: (secrets: Values) => void;
  readonly choosePlugin: (id: string) => void;
}

export function useInstanceForm(
  data: Configuration,
  instance: InstanceInfo | undefined,
  plugins: readonly PluginInfo[],
): InstanceForm {
  const [pluginId, setPluginId] = useState(instance?.plugin ?? plugins[0]?.id ?? '');
  const plugin = data.plugins.find(candidate => candidate.id === pluginId);
  const [title, setTitle] = useState(instance?.title ?? '');
  const [settings, setSettings] = useState<Values>(() =>
    plugin === undefined ? {} : initialSettings(plugin, instance),
  );
  const [secrets, setSecrets] = useState<Values>({});
  const choosePlugin = (id: string): void => {
    const chosen = data.plugins.find(candidate => candidate.id === id);
    setPluginId(id);
    setSettings(chosen === undefined ? {} : initialSettings(chosen, undefined));
    setSecrets({});
  };
  return {plugin, title, setTitle, settings, setSettings, secrets, setSecrets, choosePlugin};
}

type Target = Readonly<{plugin: PluginInfo; id: string; spec: VariableSpecInfo}>;

/**
 * Saves one secret typed in the form under `plugin:instance:variable`. A per-provider secret is
 * saved as that provider's shared secret instead, and the instance points at it.
 */
async function saveSecret(
  api: Api,
  data: Configuration,
  form: InstanceForm,
  {plugin, id, spec}: Target,
): Promise<void> {
  const key = `${plugin.id}:${id}:${spec.key}`;
  const value = form.secrets[spec.key] ?? '';
  const shared = sharedSecretName(spec, form.settings, plugin.variables);
  if (shared === null) {
    if (value !== '') {
      await api.setSecret(key, value);
    }
    return;
  }
  if (value !== '') {
    await api.setSecret(shared, value);
  }
  if (data.secrets.find(entry => entry.name === key)?.macro !== shared) {
    await api.setSecret(key, `\${${shared}}`);
  }
}

/**
 * Saves the instance, then its secrets: a new instance only gets its id from the server, made
 * from its title. Variables that do not apply are left alone.
 */
export async function saveInstance(
  api: Api,
  data: Configuration,
  form: InstanceForm,
  instance: InstanceInfo | undefined,
): Promise<void> {
  const {plugin} = form;
  if (plugin === undefined) {
    return;
  }
  const request = instanceRequest(plugin, form.title.trim(), form.settings, instance === undefined);
  const id = instance?.id ?? (await api.createInstance(request));
  if (instance !== undefined) {
    await api.updateInstance(id, request);
  }
  const secrets = plugin.variables.filter(
    spec => isSecret(spec) && applies(spec, form.settings, plugin.variables),
  );
  for (const spec of secrets) {
    await saveSecret(api, data, form, {plugin, id, spec});
  }
}
