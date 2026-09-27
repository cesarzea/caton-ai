import type {Connector, LanguageModel, ModelProvider, TransactionSource} from '@caton-ai/core';
import {resolveVariables} from '@caton-ai/instances';
import type {Catalog, Lookup} from '@caton-ai/instances';

import {ConfigError} from './config.ts';
import type {Instance} from './config.ts';

export type SourceFor = (instance: Instance, lookup: Lookup) => TransactionSource;

/** The installed plugins: connectors sync money data, model providers read text for them. */
export interface Plugins {
  readonly connectors: readonly Connector[];
  readonly models: readonly ModelProvider[];
}

/** The variables each installed plugin declares, by plugin id. */
export function catalogOf({connectors, models}: Plugins): Catalog {
  return new Map([...connectors, ...models].map(({manifest}) => [manifest.id, manifest.variables]));
}

/** The ids of the model plugins: their instances serve connections and never sync themselves. */
export function modelPluginsOf({models}: Plugins): ReadonlySet<string> {
  return new Set(models.map(({manifest}) => manifest.id));
}

function modelResolver(
  models: readonly ModelProvider[],
  instances: () => readonly Instance[],
): (user: Instance, id: string, lookup: Lookup) => LanguageModel {
  const byId = new Map(models.map(provider => [provider.manifest.id, provider]));
  return (user, id, lookup) => {
    const instance = instances().find(candidate => candidate.id === id);
    const provider = instance === undefined ? undefined : byId.get(instance.plugin);
    if (instance === undefined || provider === undefined) {
      throw new ConfigError(`${user.title} uses the model "${id}", which is not configured`);
    }
    return provider.createModel(resolveVariables(instance, provider.manifest.variables, lookup));
  };
}

/**
 * Builds the source of each instance with its plugin, from its variables with secrets read from
 * the store and macros followed. A connection that chooses a model receives it built the same way.
 */
export function sourceFactory(
  plugins: Plugins,
  pluginDirectory: (plugin: string) => string,
  instances: () => readonly Instance[],
): SourceFor {
  const byId = new Map(plugins.connectors.map(connector => [connector.manifest.id, connector]));
  const modelFor = modelResolver(plugins.models, instances);
  return (instance, lookup) => {
    const connector = byId.get(instance.plugin);
    if (connector === undefined) {
      const installed = [...byId.keys()].join(', ');
      throw new ConfigError(
        `${instance.title} uses the plugin "${instance.plugin}", which is not installed; installed: ${installed}`,
      );
    }
    const variables = resolveVariables(instance, connector.manifest.variables, lookup);
    const modelSpec = connector.manifest.variables.find(spec => spec.kind === 'model');
    const model = modelSpec === undefined ? undefined : variables[modelSpec.key];
    return connector.createSource(variables, {
      pluginDirectory: pluginDirectory(instance.plugin),
      ...(typeof model === 'string' ? {model: modelFor(instance, model, lookup)} : {}),
    });
  };
}
