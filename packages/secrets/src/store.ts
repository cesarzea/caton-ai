import {join} from 'node:path';

import {Decrypter, Encrypter, identityToRecipient} from 'age-encryption';
import * as z from 'zod';

import {SecretsError} from './errors.ts';
import {readPrivate, writePrivate} from './files.ts';

export const SECRET_NAME = /^[a-z0-9][a-z0-9-]*$/u;

const entriesSchema = z.record(z.string().regex(SECRET_NAME), z.string());

export const descriptorPath = (directory: string): string => join(directory, 'secrets.json');
export const storePath = (directory: string): string => join(directory, 'secrets.age');
export const lockPath = (directory: string): string => join(directory, 'secrets.lock');

/** Encrypts the entries to the identity and writes the store. */
export async function writeStore(
  directory: string,
  identity: string,
  entries: ReadonlyMap<string, string>,
  replace: boolean,
): Promise<void> {
  const encrypter = new Encrypter();
  encrypter.addRecipient(await identityToRecipient(identity));
  const data = await encrypter.encrypt(JSON.stringify(Object.fromEntries(entries)));
  writePrivate(storePath(directory), data, replace);
}

/** Reads and decrypts the store. */
export async function readStore(directory: string, identity: string): Promise<Map<string, string>> {
  const decrypter = new Decrypter();
  decrypter.addIdentity(identity);
  try {
    const text = await decrypter.decrypt(readPrivate(storePath(directory)), 'text');
    return new Map(Object.entries(entriesSchema.parse(JSON.parse(text))));
  } catch (error) {
    throw error instanceof SecretsError
      ? error
      : new SecretsError('The secret store cannot be decrypted with its key');
  }
}
