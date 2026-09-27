import {describe, expect, it} from 'vitest';

import {emailAlertsConnector} from '../src/index.ts';
import {recipe} from './mail.ts';

const library = {recipes: [recipe(), recipe({id: 'example-card-refund', direction: 'in'})]};
const connection = {
  name: 'amex',
  type: 'email-alerts',
  imap: {
    host: 'imap.example-mail.com',
    user: 'me@example.com',
    password: 'keychain:caton-ai/me@example.com',
  },
  authServer: 'mx.example-mail.com',
  recipes: ['example-card-charge'],
};

describe('emailAlertsConnector', () => {
  it('declares that each connection chooses its IMAP server', () => {
    expect(emailAlertsConnector.manifest).toMatchObject({
      id: 'email-alerts',
      network: ['connection:imap.host'],
    });
  });

  it('builds a source from the library recipes the connection enables, reading its secret', async () => {
    const references: string[] = [];
    const source = emailAlertsConnector.createSource(library, connection, {
      secret: reference => {
        references.push(reference);
        return 'app-password';
      },
    });

    expect(references).toEqual(['keychain:caton-ai/me@example.com']);
    expect(await source.listAccounts()).toMatchObject([
      {institution: 'Example Card', source: 'email-alerts'},
    ]);
  });
});

describe('emailAlertsConnector settings', () => {
  const build = (plugin: unknown, settings: unknown): unknown =>
    emailAlertsConnector.createSource(plugin, settings, {secret: () => ''});

  it('say what is wrong', () => {
    expect(() => build({recipes: [recipe(), recipe()]}, connection)).toThrow(
      /Recipe ids must be unique/u,
    );
    expect(() => build(library, {...connection, imap: {}})).toThrow(
      /Invalid email alerts connection/u,
    );
    expect(() => build(library, {...connection, recipes: ['missing']})).toThrow(
      'Unknown email recipe "missing"; the library has: example-card-charge, example-card-refund',
    );
  });
});
