import {describe, expect, it} from 'vitest';

import {enableBankingConnector} from '../src/index.ts';
import {privateKeyPem} from './fake-api.ts';

const {manifest} = enableBankingConnector;
const environment = {
  pluginDirectory: '/nowhere',
  state: {read: () => null, write: () => undefined},
};

/** A value for every declared variable, so the declared contract and the validation cannot drift. */
const declared = Object.fromEntries(
  manifest.variables.map(spec => [
    spec.key,
    spec.kind === 'secret-file' ? privateKeyPem : `${spec.key}-value`,
  ]),
);

describe('enableBankingConnector contract', () => {
  it('declares its variables with help, and the only host it talks to', () => {
    expect(manifest).toMatchObject({
      id: 'enable-banking',
      title: 'Enable Banking',
      network: ['api.enablebanking.com'],
    });
    expect(manifest.variables.map(({key, kind}) => [key, kind])).toEqual([
      ['app-id', 'text'],
      ['private-key', 'secret-file'],
      ['session-id', 'text'],
    ]);
    expect(manifest.variables.every(spec => spec.help.length > 40)).toBe(true);
  });

  it('builds a source from exactly the variables it declares', () => {
    expect(enableBankingConnector.createSource(declared, environment).name).toBe('enable-banking');
  });

  it('names wrong variables without ever showing their values', () => {
    const build = (): unknown =>
      enableBankingConnector.createSource(
        {...declared, 'private-key': 'not-a-key-SECRETVALUE', 'session-id': ''},
        environment,
      );

    expect(build).toThrow('Invalid Enable Banking variables: private-key, session-id');
    expect(build).not.toThrow(/SECRETVALUE/u);
  });
});
