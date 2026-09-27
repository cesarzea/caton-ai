import type {Connector} from '@caton-ai/core';
import {describe, expect, it} from 'vitest';

import {sourceFactory} from '../src/connectors.ts';
import type {CatonConfig} from '../src/config.ts';
import {workingSource} from './context.ts';

const received: unknown[] = [];

const fakeConnector: Connector = {
  manifest: {id: 'fake', version: '0.0.0', description: 'Test connector', network: []},
  createSource: (pluginSettings, connectionSettings, environment) => {
    received.push(pluginSettings, connectionSettings, environment.secret('file:x'));
    return workingSource;
  },
};

const config = (): CatonConfig => ({
  plugins: {fake: {shared: true}},
  connections: [{name: 'bank', type: 'fake'}],
});

describe('sourceFactory', () => {
  it('builds each connection with its connector, plugin settings and environment', () => {
    const source = sourceFactory([fakeConnector], config, {secret: () => 'SECRET'});

    expect(source({name: 'bank', type: 'fake', extra: 1})).toBe(workingSource);
    expect(received).toEqual([{shared: true}, {name: 'bank', type: 'fake', extra: 1}, 'SECRET']);
  });

  it('names the installed connectors when a connection asks for an unknown one', () => {
    const source = sourceFactory([fakeConnector], config, {secret: () => ''});

    expect(() => source({name: 'amex', type: 'email-alerts'})).toThrow(
      'Connection "amex" uses unknown connector "email-alerts"; installed: fake',
    );
  });
});
