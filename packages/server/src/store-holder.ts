import {isAbsolute} from 'node:path';

import type {InitStoreRequest, StoreStatus} from '@caton-ai/api';
import {
  SecretsError,
  WrongPassphraseError,
  initVault,
  openVault,
  storeKeySource,
} from '@caton-ai/secrets';
import type {CredentialStore, KeyDependencies, KeySource, Vault} from '@caton-ai/secrets';

import {HttpError} from './http.ts';
import {createThrottle} from './throttle.ts';
import type {Throttle} from './throttle.ts';

/** The secret store as the server holds it: missing, locked, or unlocked in memory. */
export interface StoreHolder {
  status(): StoreStatus;
  init(request: InitStoreRequest): Promise<void>;
  unlock(passphrase: string): Promise<void>;
  lock(): void;
  /** Opens a store whose key needs nobody: a key file or the OS credential store. */
  autoUnlock(): Promise<void>;
  vault(): Vault;
}

export interface StoreHolderOptions {
  readonly directory: string;
  readonly credentials: CredentialStore;
  /** Only tests lower it (see `KeyDependencies`). */
  readonly scryptWorkFactor?: number;
}

interface Held {
  vault: Vault | null;
  autoUnlockError: string | null;
}

function dependencies(options: StoreHolderOptions, passphrase?: string): KeyDependencies {
  return {
    askPassphrase: () =>
      passphrase === undefined
        ? Promise.reject(new SecretsError('A passphrase is needed'))
        : Promise.resolve(passphrase),
    credentials: options.credentials,
    ...(options.scryptWorkFactor === undefined ? {} : {scryptWorkFactor: options.scryptWorkFactor}),
  };
}

/** Store errors carry no secret values, so their messages can be shown to the user. */
async function visible<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof WrongPassphraseError) {
      throw new HttpError(401, error.message);
    }
    throw error instanceof SecretsError ? new HttpError(400, error.message) : error;
  }
}

function keySourceOf(request: InitStoreRequest): KeySource {
  if (request.source !== 'file') {
    return {source: request.source};
  }
  if (!isAbsolute(request.path)) {
    throw new HttpError(400, 'The key file path must be absolute');
  }
  return {source: 'file', path: request.path};
}

function statusOf(directory: string, held: Held): StoreStatus {
  const key = storeKeySource(directory);
  const locked = key === null ? 'missing' : 'locked';
  return {
    state: held.vault === null ? locked : 'unlocked',
    keySource: key?.source ?? null,
    error: held.autoUnlockError,
  };
}

async function throttled(throttle: Throttle, attempt: () => Promise<void>): Promise<void> {
  const wait = throttle.wait();
  if (wait > 0) {
    throw new HttpError(
      429,
      `Too many attempts: try again in ${String(Math.ceil(wait / 1_000))} s`,
    );
  }
  try {
    await attempt();
    throttle.succeeded();
  } catch (error) {
    throttle.failed();
    throw error;
  }
}

type Open = (passphrase?: string) => Promise<void>;

async function initialise(
  options: StoreHolderOptions,
  request: InitStoreRequest,
  open: Open,
): Promise<void> {
  const passphrase = request.source === 'passphrase' ? request.passphrase : undefined;
  const key = keySourceOf(request);
  await visible(() => initVault(options.directory, key, dependencies(options, passphrase)));
  await open(passphrase);
}

/** A key file or OS credential store needs nobody; a failure is kept to be shown. */
async function openWithoutPassphrase(directory: string, open: Open, held: Held): Promise<void> {
  const source = storeKeySource(directory)?.source;
  if (source === 'file' || source === 'os-store') {
    await open().catch((error: unknown) => {
      held.autoUnlockError = error instanceof Error ? error.message : String(error);
    });
  }
}

export function createStoreHolder(options: StoreHolderOptions): StoreHolder {
  const held: Held = {vault: null, autoUnlockError: null};
  const throttle = createThrottle();
  const open = async (passphrase?: string): Promise<void> => {
    held.vault = await visible(() =>
      openVault(options.directory, dependencies(options, passphrase)),
    );
  };
  return {
    status: () => statusOf(options.directory, held),
    init: request => initialise(options, request, open),
    unlock: passphrase => throttled(throttle, () => open(passphrase)),
    lock: () => {
      held.vault = null;
    },
    autoUnlock: () => openWithoutPassphrase(options.directory, open, held),
    vault: () => {
      if (held.vault === null) {
        throw new HttpError(423, 'The secret store is locked');
      }
      return held.vault;
    },
  };
}
