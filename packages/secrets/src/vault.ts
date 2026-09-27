import {existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';

import {Decrypter, Encrypter, generateX25519Identity, identityToRecipient} from 'age-encryption';
import * as z from 'zod';

import {SecretsError} from './errors.ts';
import {ensurePrivateDirectory, readPrivate, writePrivate} from './files.ts';
import {loadKey, saveKey} from './keys.ts';
import type {KeyDependencies, KeySource} from './keys.ts';

/** The decrypted secret store of one process. */
export interface Vault {
  names(): string[];
  get(name: string): string | undefined;
  set(name: string, value: string): Promise<void>;
  remove(name: string): Promise<boolean>;
}

const NAME = /^[a-z0-9][a-z0-9-]*$/u;

const descriptorSchema = z.object({
  version: z.literal(1),
  key: z.discriminatedUnion('source', [
    z.object({source: z.literal('passphrase')}),
    z.object({source: z.literal('file'), path: z.string().min(1)}),
    z.object({source: z.literal('os-store')}),
  ]),
});

const entriesSchema = z.record(z.string().regex(NAME), z.string());

const descriptorPath = (directory: string): string => join(directory, 'secrets.json');
const storePath = (directory: string): string => join(directory, 'secrets.age');

async function encrypted(
  identity: string,
  entries: Readonly<Record<string, string>>,
): Promise<Uint8Array> {
  const encrypter = new Encrypter();
  encrypter.addRecipient(await identityToRecipient(identity));
  return encrypter.encrypt(JSON.stringify(entries));
}

async function decrypted(identity: string, directory: string): Promise<Record<string, string>> {
  const decrypter = new Decrypter();
  decrypter.addIdentity(identity);
  try {
    return entriesSchema.parse(
      JSON.parse(await decrypter.decrypt(readPrivate(storePath(directory)), 'text')),
    );
  } catch (error) {
    throw error instanceof SecretsError
      ? error
      : new SecretsError('The secret store cannot be decrypted with its key');
  }
}

/** Creates an empty store whose key lives where `key` says. Never replaces an existing store. */
export async function initVault(
  directory: string,
  key: KeySource,
  dependencies: KeyDependencies,
): Promise<void> {
  ensurePrivateDirectory(directory);
  if (existsSync(descriptorPath(directory)) || existsSync(storePath(directory))) {
    throw new SecretsError(`A secret store already exists in ${directory}`);
  }
  const identity = await generateX25519Identity();
  await saveKey(directory, key, identity, dependencies);
  writePrivate(storePath(directory), await encrypted(identity, {}), false);
  writePrivate(descriptorPath(directory), `${JSON.stringify({version: 1, key}, null, 2)}\n`, false);
}

function vaultOver(directory: string, identity: string, stored: Record<string, string>): Vault {
  const entries = new Map(Object.entries(stored));
  const save = async (): Promise<void> => {
    writePrivate(
      storePath(directory),
      await encrypted(identity, Object.fromEntries(entries)),
      true,
    );
  };
  return {
    names: () => [...entries.keys()].sort((left, right) => left.localeCompare(right)),
    get: name => entries.get(name),
    set: async (name, value) => {
      if (!NAME.test(name)) {
        throw new SecretsError(
          `Secret names use lowercase letters, digits and dashes, got "${name}"`,
        );
      }
      entries.set(name, value);
      await save();
    },
    remove: async name => {
      if (!entries.delete(name)) {
        return false;
      }
      await save();
      return true;
    },
  };
}

/** Opens and decrypts the store, asking for its key as its descriptor says. */
export async function openVault(directory: string, dependencies: KeyDependencies): Promise<Vault> {
  if (!existsSync(descriptorPath(directory))) {
    throw new SecretsError('There is no secret store yet: create one with `caton secrets init`');
  }
  const {key} = descriptorSchema.parse(JSON.parse(readFileSync(descriptorPath(directory), 'utf8')));
  const identity = await loadKey(directory, key, dependencies);
  return vaultOver(directory, identity, await decrypted(identity, directory));
}
