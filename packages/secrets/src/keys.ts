import {join} from 'node:path';

import {Decrypter, Encrypter} from 'age-encryption';

import type {CredentialStore} from './credential-store.ts';
import {SecretsError} from './errors.ts';
import {readPrivate, writePrivate} from './files.ts';

/**
 * Where the store's key lives: encrypted with a passphrase, in a file (a container secret is a
 * file too), or in the OS credential store.
 */
export type KeySource =
  | {readonly source: 'passphrase'}
  | {readonly source: 'file'; readonly path: string}
  | {readonly source: 'os-store'};

export interface KeyDependencies {
  /** Asks the user for the passphrase; `confirm` asks twice, when creating it. */
  readonly askPassphrase: (confirm: boolean) => Promise<string>;
  readonly credentials: CredentialStore;
}

const OS_SERVICE = 'caton-ai';
const OS_ACCOUNT = 'secret-store-key';
const IDENTITY = /^AGE-SECRET-KEY-1[0-9A-Z]+$/u;

const wrappedKeyPath = (directory: string): string => join(directory, 'key.age');

function checked(identity: string): string {
  const trimmed = identity.trim();
  if (!IDENTITY.test(trimmed)) {
    throw new SecretsError('The secret store key is not a valid age identity');
  }
  return trimmed;
}

export async function saveKey(
  directory: string,
  key: KeySource,
  identity: string,
  dependencies: KeyDependencies,
): Promise<void> {
  switch (key.source) {
    case 'passphrase': {
      const encrypter = new Encrypter();
      encrypter.setPassphrase(await dependencies.askPassphrase(true));
      writePrivate(wrappedKeyPath(directory), await encrypter.encrypt(identity), false);
      return;
    }
    case 'file':
      writePrivate(key.path, `${identity}\n`, false);
      return;
    case 'os-store':
      dependencies.credentials.write(OS_SERVICE, OS_ACCOUNT, identity);
  }
}

async function unwrap(directory: string, passphrase: string): Promise<string> {
  const decrypter = new Decrypter();
  decrypter.addPassphrase(passphrase);
  try {
    return await decrypter.decrypt(readPrivate(wrappedKeyPath(directory)), 'text');
  } catch (error) {
    if (error instanceof SecretsError) {
      throw error;
    }
    throw new SecretsError('Wrong passphrase for the secret store');
  }
}

export async function loadKey(
  directory: string,
  key: KeySource,
  dependencies: KeyDependencies,
): Promise<string> {
  switch (key.source) {
    case 'passphrase':
      return checked(await unwrap(directory, await dependencies.askPassphrase(false)));
    case 'file':
      return checked(new TextDecoder().decode(readPrivate(key.path)));
    case 'os-store':
      return checked(dependencies.credentials.read(OS_SERVICE, OS_ACCOUNT));
  }
}
