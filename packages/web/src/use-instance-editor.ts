import type {InstanceInfo, PluginInfo, SecretEntry} from '@caton-ai/api';
import {useState} from 'react';

import type {Api} from './api.ts';
import {initialSettings, instanceRequest} from './configuration-form.ts';

export type Configuration = Readonly<{
  plugins: PluginInfo[];
  instances: InstanceInfo[];
  secrets: SecretEntry[];
}>;

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
): InstanceForm {
  const [pluginId, setPluginId] = useState(instance?.plugin ?? data.plugins[0]?.id ?? '');
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

/**
 * Saves the instance, then each secret typed for it under `plugin:instance:variable`: a new
 * instance only gets its id from the server, made from its title.
 */
export async function saveInstance(
  api: Api,
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
  for (const [key, value] of Object.entries(form.secrets)) {
    if (value !== '') {
      await api.setSecret(`${plugin.id}:${id}:${key}`, value);
    }
  }
}
