import {chmodSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import type {Vault} from '@caton-ai/secrets';
import {afterEach, describe, expect, it} from 'vitest';

import {ConfigError} from '../src/config.ts';
import {passphraseAsker, secretReferences, secretResolver} from '../src/secrets.ts';

const directories: string[] = [];
afterEach(() => {
  directories.splice(0).forEach(directory => {
    rmSync(directory, {recursive: true, force: true});
  });
});

function file(content: string, mode: number): string {
  const directory = mkdtempSync(join(tmpdir(), 'caton-secret-'));
  directories.push(directory);
  const path = join(directory, 'secret');
  writeFileSync(path, content);
  chmodSync(path, mode);
  return path;
}

const vault = (entries: Record<string, string>): Vault => ({
  names: () => Object.keys(entries),
  get: name => entries[name],
  set: () => Promise.resolve(),
  remove: () => Promise.resolve(false),
  reload: () => Promise.resolve(),
});

describe('secretResolver', () => {
  it('reads private files, and never opens the store when nothing refers to it', async () => {
    const opened: string[] = [];
    const secret = await secretResolver({plugins: {x: {key: 'file:/k'}}}, () => {
      opened.push('open');
      return Promise.resolve(vault({}));
    });

    expect(secret(`file:${file('KEY', 0o600)}`)).toBe('KEY');
    expect(() => secret(`file:${file('KEY', 0o644)}`)).toThrow(ConfigError);
    expect(() => secret('vault:x')).toThrow(/use file:<path> or age:<name>/u);
    expect(opened).toEqual([]);
  });

  it('reads the store once, saying how to add a missing secret', async () => {
    const secret = await secretResolver({connections: [{password: 'age:imap'}]}, () =>
      Promise.resolve(vault({imap: 'app-password'})),
    );

    expect(secret('age:imap')).toBe('app-password');
    expect(() => secret('age:other')).toThrow(
      'No secret "other" in the store; add it with: caton secrets set other',
    );
  });

  it('fails only the secrets of the store when it cannot be opened', async () => {
    const secret = await secretResolver(['age:imap'], () => Promise.reject(new Error('locked')));

    expect(() => secret('age:imap')).toThrow('locked');
    expect(secret(`file:${file('KEY', 0o600)}`)).toBe('KEY');
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

describe('secretReferences', () => {
  it('names who needs each store secret: connections, and plugins for all their connections', () => {
    const references = secretReferences({
      plugins: {'enable-banking': {appId: 'app', privateKey: 'age:enable-banking-key'}},
      connections: [
        {name: 'amex', type: 'email-alerts', imap: {credential: 'age:work-imap', user: 'me'}},
        {
          name: 'receipts',
          type: 'email-alerts',
          imap: {credential: 'age:work-imap'},
          other: 'age:work-imap',
        },
        {name: 'millennium', type: 'enable-banking', sessionId: 'file:/not/the/store'},
      ],
    });

    expect(Object.fromEntries(references)).toEqual({
      'enable-banking-key': ['enable-banking (all its connections)'],
      'work-imap': ['amex', 'receipts'],
    });
  });
});
