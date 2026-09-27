import type {VariableSpec} from '@caton-ai/core';
import {describe, expect, it} from 'vitest';

import {InstanceError, literal, macroTarget, resolveVariables, storeNeeds} from '../src/index.ts';

const SPECS: VariableSpec[] = [
  {key: 'user', label: 'User', kind: 'text', required: true, help: ''},
  {key: 'port', label: 'Port', kind: 'number', required: true, default: 993, help: ''},
  {key: 'folder', label: 'Folder', kind: 'text', required: false, help: ''},
  {key: 'password', label: 'Password', kind: 'secret', required: true, help: ''},
];

const mailbox = (
  settings: Record<string, unknown>,
): {id: string; title: string; plugin: string; settings: Record<string, unknown>} => ({
  id: 'amex',
  title: 'Amex',
  plugin: 'mail',
  settings,
});

const store =
  (entries: Record<string, string>) =>
  (key: string): string | undefined =>
    entries[key];

describe('resolveVariables', () => {
  it('reads settings, defaults and secrets, and follows macros to shared secrets', () => {
    const variables = resolveVariables(
      mailbox({user: '${shared-user}', port: '995'}),
      SPECS,
      store({'mail:amex:password': '${work-imap}', 'work-imap': 'pw', 'shared-user': 'me'}),
    );

    expect(variables).toEqual({user: 'me', port: 995, password: 'pw'});
  });

  it('keeps escaped literals and default numbers', () => {
    expect(
      resolveVariables(
        mailbox({user: '$${not-a-macro}'}),
        SPECS,
        store({'mail:amex:password': 'pw'}),
      ),
    ).toEqual({
      user: '${not-a-macro}',
      port: 993,
      password: 'pw',
    });
  });
});

describe('resolveVariables problems', () => {
  it('names every missing variable and macro, never a value', () => {
    const resolve = (settings: Record<string, unknown>, entries: Record<string, string>): unknown =>
      resolveVariables(mailbox(settings), SPECS, store(entries));

    expect(() => resolve({}, {})).toThrow(
      new InstanceError('Amex: User is missing; Password is missing'),
    );
    expect(() => resolve({user: 'me'}, {'mail:amex:password': '${gone}'})).toThrow(
      'Amex: Password needs the shared secret "gone", which is missing',
    );
    expect(() =>
      resolve({user: 'me'}, {'mail:amex:password': '${a}', a: '${b}', b: 'SECRET'}),
    ).toThrow('Amex: Password: the shared secret "a" cannot itself be a macro');
  });
});

describe('macros', () => {
  it('are whole values only', () => {
    expect([
      macroTarget('${work-imap}'),
      macroTarget('x ${work-imap}'),
      macroTarget('${Bad}'),
      macroTarget(3),
    ]).toEqual(['work-imap', null, null, null]);
    expect([literal('$${x}'), literal('plain')]).toEqual(['${x}', 'plain']);
  });
});

describe('storeNeeds', () => {
  it('lists secret variables and shared secrets used by settings, with who needs them', () => {
    const catalog = new Map([['mail', SPECS]]);
    const receipts = {...mailbox({user: '${shared-user}'}), id: 'receipts', title: 'Receipts'};

    expect(
      Object.fromEntries(
        storeNeeds(
          [mailbox({user: '${shared-user}'}), receipts, {...receipts, plugin: 'unknown'}],
          catalog,
        ),
      ),
    ).toEqual({
      'shared-user': ['Amex', 'Receipts'],
      'mail:amex:password': ['Amex'],
      'mail:receipts:password': ['Receipts'],
    });
  });
});
