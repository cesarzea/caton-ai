import type {Connector} from '@caton-ai/core';
import {describe, expect, it} from 'vitest';

import {catalogOf, sourceFactory} from '../src/connectors.ts';
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
    ],
  },
  createSource: (variables, environment) => {
    received.push(variables, environment.pluginDirectory);
    return workingSource;
  },
};

const instance = {id: 'bank', title: 'My bank', plugin: 'fake', settings: {user: 'me'}};

describe('sourceFactory', () => {
  it('builds each instance with its plugin, secrets read from the store', () => {
    const source = sourceFactory([fakeConnector], plugin => `/config/plugins/${plugin}`);
    const lookup = (key: string): string | undefined =>
      key === 'fake:bank:password' ? 'pw' : undefined;

    expect(source(instance, lookup)).toBe(workingSource);
    expect(received).toEqual([{user: 'me', password: 'pw'}, '/config/plugins/fake']);
    expect(catalogOf([fakeConnector]).get('fake')).toBe(fakeConnector.manifest.variables);
  });

  it('names what is missing, and the installed plugins when one is unknown', () => {
    const source = sourceFactory([fakeConnector], () => '');

    expect(() => source(instance, () => undefined)).toThrow('My bank: Password is missing');
    expect(() => source({...instance, plugin: 'email-alerts'}, () => undefined)).toThrow(
      'My bank uses the plugin "email-alerts", which is not installed; installed: fake',
    );
  });
});
