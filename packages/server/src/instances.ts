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
    {
      id,
      title: body.title,
      plugin: plugin.id,
      settings: checkedSettings(plugin, body.settings),
      changedAt: new Date().toISOString(),
    },
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
      instance.id === id
        ? {...instance, title: body.title, settings, changedAt: new Date().toISOString()}
        : instance,
    ),
  );
  sendJson(response, 204);
}

/** Marks the instance a store key such as `plugin:instance:variable` belongs to as changed. */
export function touchInstanceOf(configuration: Configuration, key: string): void {
  const id = key.split(':')[1];
  const existing = configuration.instances();
  if (id === undefined || !existing.some(instance => instance.id === id)) {
    return;
  }
  const changedAt = new Date().toISOString();
  configuration.save(
    existing.map(instance => (instance.id === id ? {...instance, changedAt} : instance)),
  );
}

/** Removes an instance from the configuration and returns it. */
export function deleteInstance(configuration: Configuration, id: string): InstanceInfo {
  const existing = configuration.instances();
  const removed = existing.find(instance => instance.id === id);
  if (removed === undefined) {
    throw new HttpError(404, 'Not found');
  }
  configuration.save(existing.filter(instance => instance !== removed));
  return removed;
}
