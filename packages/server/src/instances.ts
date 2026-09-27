import type {IncomingMessage, ServerResponse} from 'node:http';

import {instanceRequestSchema} from '@caton-ai/api';
import type {InstanceInfo, InstanceRequest, PluginInfo} from '@caton-ai/api';
import {newInstanceId} from '@caton-ai/instances';

import {HttpError, jsonBody, sendJson} from './http.ts';

/** Where instances are kept: the configuration file, owned by the command line. */
/** The plugins and the configuration an instance request works on. */
interface Scope {
  readonly plugins: readonly PluginInfo[];
  readonly configuration: Configuration;
}

export interface Configuration {
  readonly instances: () => readonly InstanceInfo[];
  readonly save: (instances: readonly InstanceInfo[]) => void;
}

const SECRET_KINDS = new Set(['secret', 'secret-file']);

/** Settings may only hold the plugin's non-secret variables: a secret never reaches the file. */
function checkedSettings(
  plugin: PluginInfo,
  settings: InstanceRequest['settings'],
): InstanceRequest['settings'] {
  for (const key of Object.keys(settings)) {
    const spec = plugin.variables.find(variable => variable.key === key);
    if (spec === undefined || SECRET_KINDS.has(spec.kind)) {
      throw new HttpError(400, `${plugin.title} has no setting "${key}"`);
    }
  }
  return settings;
}

function pluginOf(plugins: readonly PluginInfo[], id: string | undefined): PluginInfo {
  const plugin = plugins.find(candidate => candidate.id === id);
  if (plugin === undefined) {
    throw new HttpError(400, 'Unknown plugin');
  }
  return plugin;
}

export async function createInstance(
  request: IncomingMessage,
  response: ServerResponse,
  {plugins, configuration}: Scope,
): Promise<void> {
  const body = await jsonBody(request, instanceRequestSchema);
  const plugin = pluginOf(plugins, body.plugin);
  const existing = configuration.instances();
  const id = newInstanceId(
    body.title,
    existing.map(instance => instance.id),
  );
  configuration.save([
    ...existing,
    {id, title: body.title, plugin: plugin.id, settings: checkedSettings(plugin, body.settings)},
  ]);
  sendJson(response, 201, {id});
}

/** Changes the title and settings of an instance; its id and plugin never change. */
export async function updateInstance(
  request: IncomingMessage,
  response: ServerResponse,
  {plugins, configuration}: Scope,
  id: string,
): Promise<void> {
  const body = await jsonBody(request, instanceRequestSchema);
  const existing = configuration.instances();
  const current = existing.find(instance => instance.id === id);
  if (current === undefined) {
    throw new HttpError(404, 'Not found');
  }
  const settings = checkedSettings(pluginOf(plugins, current.plugin), body.settings);
  configuration.save(
    existing.map(instance =>
      instance.id === id ? {...instance, title: body.title, settings} : instance,
    ),
  );
  sendJson(response, 204);
}

export function deleteInstance(
  response: ServerResponse,
  configuration: Configuration,
  id: string,
): void {
  const existing = configuration.instances();
  const remaining = existing.filter(instance => instance.id !== id);
  if (remaining.length === existing.length) {
    throw new HttpError(404, 'Not found');
  }
  configuration.save(remaining);
  sendJson(response, 204);
}
