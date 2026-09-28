import type {PluginInfo} from '@caton-ai/api';

import type {Api} from '../src/api.ts';
import type {FakeState, Record} from './fake-state.ts';

const PLUGINS: PluginInfo[] = [
  {
    id: 'email-alerts',
    kind: 'connector',
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
      {key: 'model', label: 'Language model', kind: 'model', required: false, help: 'Reads it.'},
      {key: 'effort', label: 'Thinking effort', kind: 'effort', required: false, help: 'How hard.'},
    ],
  },
  {
    id: 'enable-banking',
    kind: 'connector',
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

const KEYED = ['anthropic', 'openai'];

const LLM: PluginInfo = {
  id: 'llm',
  kind: 'model',
  title: 'Language model',
  description: 'Any provider.',
  network: [],
  variables: [
    {
      key: 'provider',
      label: 'Provider',
      kind: 'choice',
      required: true,
      choices: [...KEYED, 'ollama'],
      help: 'Who runs it.',
    },
    {key: 'model', label: 'Model', kind: 'text', required: true, help: 'Its name.'},
    {
      key: 'api-key',
      label: 'API key',
      kind: 'secret',
      required: true,
      when: {variable: 'provider', values: KEYED},
      sharedPer: 'provider',
      help: 'From the console.',
    },
    {
      key: 'base-url',
      label: 'Address',
      kind: 'text',
      required: false,
      when: {variable: 'provider', values: ['ollama']},
      help: 'Where it listens.',
    },
  ],
};

/** Syncing marks the connections as syncing until the test clears them. */
function syncOf(api: FakeState, record: Record): Api['sync'] {
  return async connections => {
    await record('sync', connections);
    api.syncing = [...(connections ?? ['millennium', 'amex'])];
    return api.syncing;
  };
}

export function configurationOf(
  api: FakeState,
  record: Record,
): Pick<
  Api,
  'plugins' | 'instances' | 'createInstance' | 'updateInstance' | 'removeInstance' | 'sync'
> {
  return {
    plugins: () => Promise.resolve([...PLUGINS, LLM]),
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
    sync: syncOf(api, record),
  };
}
