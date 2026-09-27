import type {InstanceInfo, PluginInfo} from '@caton-ai/api';

import type {Configuration} from '../src/index.ts';

export const PLUGINS: PluginInfo[] = [
  {
    id: 'email-alerts',
    kind: 'connector',
    title: 'Email alerts',
    description: 'Alerts by email.',
    network: ['variable:imap-host'],
    variables: [
      {
        key: 'imap-user',
        label: 'Email address',
        kind: 'text',
        required: true,
        help: 'The address.',
      },
      {
        key: 'imap-password',
        label: 'App password',
        kind: 'secret',
        required: true,
        help: 'A password.',
      },
    ],
  },
];

/** A configuration file in memory. */
export function memoryConfiguration(): Configuration & {saved: number} {
  let instances: readonly InstanceInfo[] = [];
  const configuration = {
    saved: 0,
    instances: () => instances,
    save: (next: readonly InstanceInfo[]) => {
      instances = next;
      configuration.saved += 1;
    },
  };
  return configuration;
}
