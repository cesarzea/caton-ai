import {describe, expect, it} from 'vitest';

import {emailAlertsConnector} from '../src/index.ts';
import {fakeModel, memoryState} from './mail.ts';

const {manifest} = emailAlertsConnector;
const environment = {pluginDirectory: '/nowhere', state: memoryState(), model: fakeModel([])};

/** A value for every declared variable, so the declared contract and the validation cannot drift. */
const declared: Record<string, unknown> = Object.fromEntries(
  manifest.variables
    .filter(spec => spec.kind !== 'model' && spec.kind !== 'effort')
    .map(spec => {
      const values = {number: 993, list: ['example-card.com']} as Record<string, unknown>;
      return [
        spec.key,
        spec.key === 'card-currency' ? 'EUR' : (values[spec.kind] ?? `${spec.key}-value`),
      ];
    }),
);

describe('emailAlertsConnector contract', () => {
  it('declares its variables with help, a model and effort, and that each instance chooses its server', () => {
    expect(manifest).toMatchObject({
      id: 'email-alerts',
      title: 'Email',
      network: ['variable:imap-host'],
    });
    expect(manifest.variables.find(spec => spec.key === 'imap-password')?.kind).toBe('secret');
    expect(manifest.variables.map(spec => spec.kind)).toEqual(
      expect.arrayContaining(['model', 'effort']),
    );
    expect(manifest.variables.every(spec => spec.help.length > 40)).toBe(true);
  });

  it('builds a source from exactly the variables it declares', async () => {
    const source = emailAlertsConnector.createSource(declared, environment);

    expect(await source.listAccounts()).toMatchObject([
      {id: 'email:example-card.com', source: 'email-alerts'},
    ]);
  });
});

describe('emailAlertsConnector variables', () => {
  it('say which are wrong, never what they hold', () => {
    const build = (overrides: Record<string, unknown>): unknown =>
      emailAlertsConnector.createSource({...declared, ...overrides}, environment);

    expect(() =>
      build({'imap-password': '', 'imap-port': 'SECRETVALUE', 'card-currency': 'euro'}),
    ).toThrow('Invalid email variables: imap-port, imap-password, card-currency');
  });
});
