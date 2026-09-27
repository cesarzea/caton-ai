import {readFileSync, statSync} from 'node:fs';
import {join} from 'node:path';

import {describe, expect, it} from 'vitest';

import {SecretsError, initVault, openVault} from '../src/index.ts';
import {dependencies, temporaryDirectory} from './fixtures.ts';

async function fileVault(): Promise<{directory: string; key: string}> {
  const root = temporaryDirectory();
  const directory = join(root, 'caton-ai');
  const key = join(root, 'key.txt');
  await initVault(directory, {source: 'file', path: key}, dependencies());
  return {directory, key};
}

describe('secret store', () => {
  it('keeps secrets encrypted across openings, listing names only', async () => {
    const {directory} = await fileVault();
    const vault = await openVault(directory, dependencies());
    await vault.set('jaunesistemas-imap', 'app-password-value');
    await vault.set('enable-banking-key', 'PEM');

    const reopened = await openVault(directory, dependencies());
    expect(reopened.names()).toEqual(['enable-banking-key', 'jaunesistemas-imap']);
    expect(reopened.get('jaunesistemas-imap')).toBe('app-password-value');
    expect(readFileSync(join(directory, 'secrets.age'), 'utf8')).not.toContain(
      'app-password-value',
    );
    expect(await reopened.remove('enable-banking-key')).toBe(true);
    expect(await reopened.remove('enable-banking-key')).toBe(false);
    expect((await openVault(directory, dependencies())).names()).toEqual(['jaunesistemas-imap']);
  });

  it('is private to its owner', async () => {
    const {directory, key} = await fileVault();

    expect(statSync(directory).mode & 0o777).toBe(0o700);
    for (const path of [join(directory, 'secrets.age'), join(directory, 'secrets.json'), key]) {
      expect(statSync(path).mode & 0o777).toBe(0o600);
    }
  });
});

describe('secret store safety', () => {
  it('never replaces an existing store, and says how to create a missing one', async () => {
    const {directory, key} = await fileVault();

    await expect(
      initVault(directory, {source: 'file', path: `${key}2`}, dependencies()),
    ).rejects.toThrow(/already exists/u);
    await expect(openVault(join(directory, 'missing'), dependencies())).rejects.toThrow(
      /caton secrets init/u,
    );
  });

  it('refuses secret names that are not plain, and keys that do not open the store', async () => {
    const {directory} = await fileVault();
    const vault = await openVault(directory, dependencies());
    await expect(vault.set('../escape', 'x')).rejects.toThrow(SecretsError);

    const other = await fileVault();
    const descriptor = join(directory, 'secrets.json');
    const {writeFileSync} = await import('node:fs');
    writeFileSync(descriptor, JSON.stringify({version: 1, key: {source: 'file', path: other.key}}));
    await expect(openVault(directory, dependencies())).rejects.toThrow(
      'The secret store cannot be decrypted with its key',
    );
  });
});

describe('secret store under concurrent writes', () => {
  it('keeps every change made at the same time, in this process and from another opening', async () => {
    const {directory} = await fileVault();
    const server = await openVault(directory, dependencies());
    const commandLine = await openVault(directory, dependencies());

    await Promise.all([
      ...['a', 'b', 'c', 'd', 'e'].map(name => server.set(name, `value-${name}`)),
      commandLine.set('f', 'value-f'),
    ]);
    await server.reload();

    expect((await openVault(directory, dependencies())).names()).toEqual([
      'a',
      'b',
      'c',
      'd',
      'e',
      'f',
    ]);
    expect(server.names()).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
  });

  it('refuses short passphrases whoever asks for them', async () => {
    await expect(
      initVault(join(temporaryDirectory(), 'store'), {source: 'passphrase'}, dependencies('short')),
    ).rejects.toThrow(/at least 12 characters/u);
  });
});
