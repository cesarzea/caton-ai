import type {Vault} from '@caton-ai/secrets';
import {describe, expect, it} from 'vitest';

import {passphraseAsker, storeLookup} from '../src/secrets.ts';

const vault = (entries: Record<string, string>): Vault => ({
  names: () => Object.keys(entries),
  get: name => entries[name],
  set: () => Promise.resolve(),
  remove: () => Promise.resolve(false),
  reload: () => Promise.resolve(),
});

const needing = {instances: [{id: 'amex', title: 'Amex', plugin: 'mail', settings: {}}]};
const catalog = new Map([
  [
    'mail',
    [{key: 'password', label: 'Password', kind: 'secret' as const, required: true, help: ''}],
  ],
]);

describe('storeLookup', () => {
  it('never opens the store when no instance needs it', async () => {
    const opened: string[] = [];
    const lookup = await storeLookup({instances: []}, catalog, () => {
      opened.push('open');
      return Promise.resolve(vault({}));
    });

    expect(lookup('anything')).toBeUndefined();
    expect(opened).toEqual([]);
  });

  it('reads the store once opened, and fails only the lookups when it cannot be opened', async () => {
    const open = await storeLookup(needing, catalog, () =>
      Promise.resolve(vault({'mail:amex:password': 'pw'})),
    );
    const locked = await storeLookup(needing, catalog, () => Promise.reject(new Error('locked')));

    expect(open('mail:amex:password')).toBe('pw');
    expect(() => locked('mail:amex:password')).toThrow('locked');
  });
});

describe('passphraseAsker', () => {
  const answering =
    (...answers: string[]) =>
    (): Promise<string> =>
      Promise.resolve(answers.shift() ?? '');

  it('asks once to open, and twice to create', async () => {
    expect(await passphraseAsker(answering('short'))(false)).toBe('short');
    expect(await passphraseAsker(answering('a long passphrase', 'a long passphrase'))(true)).toBe(
      'a long passphrase',
    );
    await expect(passphraseAsker(answering('a long passphrase', 'typo'))(true)).rejects.toThrow(
      'The passphrases do not match',
    );
  });
});
