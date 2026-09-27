import {chmodSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';

import {describe, expect, it} from 'vitest';

import {initVault, openVault} from '../src/index.ts';
import {dependencies, memoryCredentials, temporaryDirectory} from './fixtures.ts';

describe('passphrase key', () => {
  it('asks twice when created, once when opened, and rejects a wrong passphrase', async () => {
    const directory = join(temporaryDirectory(), 'store');
    const creating = dependencies();
    await initVault(directory, {source: 'passphrase'}, creating);
    const opening = dependencies();
    await (await openVault(directory, opening)).set('a', 'b');

    expect([creating.asked, opening.asked]).toEqual([[true], [false]]);
    await expect(openVault(directory, dependencies('wrong'))).rejects.toThrow(
      'Wrong passphrase for the secret store',
    );
  }, 30_000);
});

describe('OS credential store key', () => {
  it('keeps only the key in the credential store, never the secrets', async () => {
    const directory = join(temporaryDirectory(), 'store');
    const setup = {...dependencies(), credentials: memoryCredentials()};
    await initVault(directory, {source: 'os-store'}, setup);
    await (await openVault(directory, setup)).set('imap', 'app-password-value');

    expect([...setup.credentials.items.keys()]).toEqual(['caton-ai/secret-store-key']);
    expect([...setup.credentials.items.values()][0]).toMatch(/^AGE-SECRET-KEY-1/u);
    expect((await openVault(directory, setup)).get('imap')).toBe('app-password-value');
  });
});

describe('key file', () => {
  it('must be private and hold an age identity', async () => {
    const root = temporaryDirectory();
    const key = join(root, 'key.txt');
    await initVault(join(root, 'store'), {source: 'file', path: key}, dependencies());

    chmodSync(key, 0o644);
    await expect(openVault(join(root, 'store'), dependencies())).rejects.toThrow(
      /accessible by other users/u,
    );
    chmodSync(key, 0o600);
    writeFileSync(key, 'not a key');
    await expect(openVault(join(root, 'store'), dependencies())).rejects.toThrow(
      'not a valid age identity',
    );
  });
});
