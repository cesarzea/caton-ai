import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import {afterEach} from 'vitest';

import type {CredentialStore, KeyDependencies} from '../src/index.ts';

const directories: string[] = [];

afterEach(() => {
  directories.splice(0).forEach(directory => {
    rmSync(directory, {recursive: true, force: true});
  });
});

/** A fresh directory; the store goes in a subdirectory that does not exist yet. */
export function temporaryDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), 'caton-secrets-'));
  directories.push(directory);
  return directory;
}

export function memoryCredentials(): CredentialStore & {readonly items: Map<string, string>} {
  const items = new Map<string, string>();
  return {
    items,
    read: (service, account) => {
      const value = items.get(`${service}/${account}`);
      if (value === undefined) {
        throw new Error('missing');
      }
      return value;
    },
    write: (service, account, value) => {
      items.set(`${service}/${account}`, value);
    },
  };
}

export function dependencies(
  passphrase = 'correct horse battery staple',
): KeyDependencies & {readonly asked: boolean[]} {
  const asked: boolean[] = [];
  return {
    asked,
    askPassphrase: confirm => {
      asked.push(confirm);
      return Promise.resolve(passphrase);
    },
    credentials: memoryCredentials(),
    // A low scrypt cost keeps tests fast; production uses age's default.
    scryptWorkFactor: 10,
  };
}
