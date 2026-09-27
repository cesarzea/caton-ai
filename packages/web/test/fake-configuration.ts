import type {PluginInfo} from '@caton-ai/api';

import type {Api} from '../src/api.ts';
import type {FakeState, Record} from './fake-state.ts';

const PLUGINS: PluginInfo[] = [
  {
    id: 'email-alerts',
    title: 'Email alerts',
    description: 'Card alerts received by email.',
    network: ['variable:imap-host'],
    variables: [
      {
        key: 'imap-user',
        label: 'Email address',
        kind: 'text',
        required: true,
        help: 'The **address** of the mailbox, such as `me@example.com`.',
      },
      {
        key: 'imap-port',
        label: 'IMAP port',
        kind: 'number',
        required: true,
        default: 993,
        help: 'Almost always 993.',
      },
      {
        key: 'imap-password',
        label: 'App password',
        kind: 'secret',
        required: true,
        help: 'Create it at [Google Account](https://myaccount.google.com/apppasswords).',
      },
    ],
  },
  {
    id: 'enable-banking',
    title: 'Enable Banking',
    description: 'European banks.',
    network: [],
    variables: [
      {
        key: 'private-key',
        label: 'Private key',
        kind: 'secret-file',
        required: true,
        help: 'The .pem file.',
      },
    ],
  },
];

export function configurationOf(
  api: FakeState,
  record: Record,
): Pick<Api, 'plugins' | 'instances' | 'createInstance' | 'updateInstance' | 'removeInstance'> {
  return {
    plugins: () => Promise.resolve(PLUGINS),
    instances: () => Promise.resolve(api.configured),
    createInstance: async request => {
      await record('createInstance', request);
      const id = request.title.toLowerCase().replaceAll(' ', '-');
      api.configured.push({
        id,
        title: request.title,
        plugin: request.plugin ?? '',
        settings: request.settings,
      });
      return id;
    },
    updateInstance: async (id, request) => {
      await record('updateInstance', id, request);
    },
    removeInstance: async id => {
      await record('removeInstance', id);
    },
  };
}
