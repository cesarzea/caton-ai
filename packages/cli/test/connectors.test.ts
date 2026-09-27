import type {Connector, ConnectorEnvironment, LanguageModel, ModelProvider} from '@caton-ai/core';
import {describe, expect, it} from 'vitest';

import {catalogOf, modelPluginsOf, sourceFactory} from '../src/connectors.ts';
import type {Instance} from '../src/config.ts';
import {workingSource} from './context.ts';

const received: unknown[] = [];

const fakeConnector: Connector = {
  manifest: {
    id: 'fake',
    version: '0.0.0',
    title: 'Fake',
    description: 'Test connector',
    network: [],
    variables: [
      {key: 'user', label: 'User', kind: 'text', required: true, help: 'A user.'},
      {key: 'password', label: 'Password', kind: 'secret', required: true, help: 'A password.'},
      {key: 'model', label: 'Model', kind: 'model', required: false, help: 'A model.'},
    ],
  },
  createSource: (variables, environment: ConnectorEnvironment) => {
    received.push(variables, environment.pluginDirectory, environment.model?.name);
    return workingSource;
  },
};

const fakeProvider: ModelProvider = {
  manifest: {
    id: 'model-fake',
    version: '0.0.0',
    title: 'Fake model',
    description: 'Test model',
    network: [],
    variables: [{key: 'api-key', label: 'API key', kind: 'secret', required: true, help: 'A key.'}],
  },
  createModel: (variables): LanguageModel => ({
    name: `fake with ${String(variables['api-key'])}`,
    extract: () => Promise.reject(new Error('unused')),
  }),
};

const plugins = {connectors: [fakeConnector], models: [fakeProvider]};
const instance: Instance = {id: 'bank', title: 'My bank', plugin: 'fake', settings: {user: 'me'}};
const model: Instance = {id: 'claude', title: 'Claude', plugin: 'model-fake', settings: {}};
const store: Readonly<Record<string, string>> = {
  'fake:bank:password': 'pw',
  'model-fake:claude:api-key': 'key',
};
const lookup = (key: string): string | undefined => store[key];

describe('sourceFactory', () => {
  it('builds each instance with its plugin, secrets read from the store', () => {
    received.length = 0;
    const source = sourceFactory(
      plugins,
      plugin => `/config/plugins/${plugin}`,
      () => [instance],
    );

    expect(source(instance, lookup)).toBe(workingSource);
    expect(received).toEqual([{user: 'me', password: 'pw'}, '/config/plugins/fake', undefined]);
    expect(catalogOf(plugins).get('fake')).toBe(fakeConnector.manifest.variables);
    expect(catalogOf(plugins).get('model-fake')).toBe(fakeProvider.manifest.variables);
    expect([...modelPluginsOf(plugins)]).toEqual(['model-fake']);
  });
});

describe('sourceFactory with models', () => {
  it('hands a connection the model it chose, built with its own secrets', () => {
    received.length = 0;
    const user = {...instance, settings: {user: 'me', model: 'claude'}};
    const source = sourceFactory(
      plugins,
      () => '',
      () => [user, model],
    );

    source(user, lookup);

    expect(received[2]).toBe('fake with key');
  });
});

describe('sourceFactory failures', () => {
  it('name what is missing, and the installed plugins when one is unknown', () => {
    const source = sourceFactory(
      plugins,
      () => '',
      () => [instance],
    );
    const user = {...instance, settings: {user: 'me', model: 'gone'}};

    expect(() => source(instance, () => undefined)).toThrow('My bank: Password is missing');
    expect(() => source({...instance, plugin: 'email-alerts'}, () => undefined)).toThrow(
      'My bank uses the plugin "email-alerts", which is not installed; installed: fake',
    );
    expect(() => source(user, lookup)).toThrow(
      'My bank uses the model "gone", which is not configured',
    );
    expect(() => source({...user, settings: {user: 'me', model: 'bank'}}, lookup)).toThrow(
      'My bank uses the model "bank", which is not configured',
    );
  });
});
