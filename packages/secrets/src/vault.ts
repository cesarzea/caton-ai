import {existsSync, readFileSync} from 'node:fs';

import {SECRET_KEY} from '@caton-ai/api';
import {generateX25519Identity} from 'age-encryption';
import * as z from 'zod';

import {SecretsError} from './errors.ts';
import {ensurePrivateDirectory, writePrivate} from './files.ts';
import {loadKey, saveKey} from './keys.ts';
import type {KeyDependencies, KeySource} from './keys.ts';
import {withLock} from './lock.ts';
import {descriptorPath, lockPath, readStore, storePath, writeStore} from './store.ts';

/** The decrypted secret store of one process. */
export interface Vault {
  names(): string[];
  get(name: string): string | undefined;
  set(name: string, value: string): Promise<void>;
  remove(name: string): Promise<boolean>;
  /** Reads the store again, picking up changes made by other processes. */
  reload(): Promise<void>;
}

const descriptorSchema = z.object({
  version: z.literal(1),
  key: z.discriminatedUnion('source', [
    z.object({source: z.literal('passphrase')}),
    z.object({source: z.literal('file'), path: z.string().min(1)}),
    z.object({source: z.literal('os-store')}),
  ]),
});

/** Where the key of the store in `directory` is kept, or `null` when there is no store. */
export function storeKeySource(directory: string): KeySource | null {
  if (!existsSync(descriptorPath(directory))) {
    return null;
  }
  return descriptorSchema.parse(JSON.parse(readFileSync(descriptorPath(directory), 'utf8'))).key;
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
  await writeStore(directory, identity, new Map(), false);
  writePrivate(descriptorPath(directory), `${JSON.stringify({version: 1, key}, null, 2)}\n`, false);
}

type Changer = <T>(apply: (fresh: Map<string, string>) => T) => Promise<T>;

/**
 * Applies changes one at a time in this process, under a lock across processes, always to the
 * store as it is on disk, and reports the saved contents.
 */
function changer(
  directory: string,
  identity: string,
  saved: (entries: Map<string, string>) => void,
): Changer {
  let queue: Promise<unknown> = Promise.resolve();
  return apply => {
    const next = queue.then(() =>
      withLock(lockPath(directory), async () => {
        const fresh = await readStore(directory, identity);
        const result = apply(fresh);
        await writeStore(directory, identity, fresh, true);
        saved(fresh);
        return result;
      }),
    );
    queue = next.catch(() => undefined);
    return next;
  };
}

function vaultOver(directory: string, identity: string, stored: Map<string, string>): Vault {
  let entries = stored;
  const change = changer(directory, identity, fresh => {
    entries = fresh;
  });
  return {
    names: () => [...entries.keys()].sort((left, right) => left.localeCompare(right)),
    get: name => entries.get(name),
    set: async (name, value) => {
      if (!SECRET_KEY.test(name)) {
        throw new SecretsError(
          `Secret keys are a name, or plugin:instance:variable, in lowercase letters, digits and dashes; got "${name}"`,
        );
      }
      await change(fresh => fresh.set(name, value));
    },
    remove: name => change(fresh => fresh.delete(name)),
    reload: async () => {
      entries = await readStore(directory, identity);
    },
  };
}

/** Opens and decrypts the store, asking for its key as its descriptor says. */
export async function openVault(directory: string, dependencies: KeyDependencies): Promise<Vault> {
  const key = storeKeySource(directory);
  if (key === null) {
    throw new SecretsError('There is no secret store yet: create one with `caton secrets init`');
  }
  const identity = await loadKey(directory, key, dependencies);
  return vaultOver(directory, identity, await readStore(directory, identity));
}
