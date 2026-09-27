import type {Connector, TransactionSource} from '@caton-ai/core';
import {resolveVariables} from '@caton-ai/instances';
import type {Catalog, Lookup} from '@caton-ai/instances';

import {ConfigError} from './config.ts';
import type {Instance} from './config.ts';

export type SourceFor = (instance: Instance, lookup: Lookup) => TransactionSource;

/** The variables each installed plugin declares, by plugin id. */
export function catalogOf(connectors: readonly Connector[]): Catalog {
  return new Map(connectors.map(({manifest}) => [manifest.id, manifest.variables]));
}

/**
 * Builds the source of each instance with its plugin, from its variables with secrets read from
 * the store and macros followed.
 */
export function sourceFactory(
  connectors: readonly Connector[],
  pluginDirectory: (plugin: string) => string,
): SourceFor {
  const byId = new Map(connectors.map(connector => [connector.manifest.id, connector]));
  return (instance, lookup) => {
    const connector = byId.get(instance.plugin);
    if (connector === undefined) {
      const installed = [...byId.keys()].join(', ');
      throw new ConfigError(
        `${instance.title} uses the plugin "${instance.plugin}", which is not installed; installed: ${installed}`,
      );
    }
    const variables = resolveVariables(instance, connector.manifest.variables, lookup);
    return connector.createSource(variables, {pluginDirectory: pluginDirectory(instance.plugin)});
  };
}
