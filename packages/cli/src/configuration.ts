import type {PluginInfo} from '@caton-ai/api';
import type {ConnectorManifest} from '@caton-ai/core';
import type {Configuration} from '@caton-ai/server';

import type {CatonConfig} from './config.ts';
import type {ConfigFile} from './config-file.ts';
import type {Plugins} from './connectors.ts';

function infoOf(manifest: ConnectorManifest, kind: PluginInfo['kind']): PluginInfo {
  return {
    id: manifest.id,
    kind,
    title: manifest.title,
    description: manifest.description,
    network: [...manifest.network],
    variables: manifest.variables.map(({choices, when, ...variable}) => ({
      ...variable,
      ...(choices === undefined ? {} : {choices: [...choices]}),
      ...(when === undefined ? {} : {when: {variable: when.variable, values: [...when.values]}}),
    })),
  };
}

/** What the web interface shows of each installed plugin: its contract, help included. */
export function pluginInfos({connectors, models}: Plugins): PluginInfo[] {
  return [
    ...connectors.map(({manifest}) => infoOf(manifest, 'connector')),
    ...models.map(({manifest}) => infoOf(manifest, 'model')),
  ];
}

/**
 * The instances as the web interface edits them. Each save rewrites the file, keeping any other
 * field, and forgets the cached configuration so syncs and status use the new one.
 */
export function editableConfiguration(
  config: () => CatonConfig,
  file: ConfigFile,
  forget: () => void,
): Configuration {
  return {
    instances: () =>
      config().instances.map(instance => ({
        ...instance,
        settings: instance.settings as Record<string, string | number | string[]>,
      })),
    save: instances => {
      const current = file.read();
      file.write({...(typeof current === 'object' && current !== null ? current : {}), instances});
      forget();
    },
  };
}
