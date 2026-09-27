import {describe, expect, it} from 'vitest';

import {enableBankingConnector} from '../src/index.ts';
import {privateKeyPem} from './fake-api.ts';

const environment = {
  secret: (reference: string) => (reference === 'file:key' ? privateKeyPem : ''),
};

describe('enableBankingConnector', () => {
  it('declares the only host it talks to', () => {
    expect(enableBankingConnector.manifest).toMatchObject({
      id: 'enable-banking',
      network: ['api.enablebanking.com'],
    });
  });

  it('builds a source from the shared application and the connection’s session', () => {
    const source = enableBankingConnector.createSource(
      {appId: 'app', privateKey: 'file:key'},
      {name: 'millennium', type: 'enable-banking', sessionId: 'session-1'},
      environment,
    );

    expect(source.name).toBe('enable-banking');
  });

  it('says what is missing from its settings', () => {
    const build = (plugin: unknown, connection: unknown): unknown =>
      enableBankingConnector.createSource(plugin, connection, environment);

    expect(() => build(undefined, {sessionId: 's'})).toThrow(/Invalid Enable Banking plugin/u);
    expect(() => build({appId: 'a', privateKey: 'k'}, {})).toThrow(
      /Invalid Enable Banking connection/u,
    );
  });
});
