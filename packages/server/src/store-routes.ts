import type {IncomingMessage, ServerResponse} from 'node:http';

import {
  SECRET_KEY,
  initStoreRequestSchema,
  setSecretRequestSchema,
  unlockRequestSchema,
} from '@caton-ai/api';

import {HttpError, jsonBody, sendJson} from './http.ts';
import type {ApiContext, Handler} from './api-context.ts';
import {touchInstanceOf} from './instances.ts';
import {secretEntries} from './secret-list.ts';

export const status: Handler = (_request, response, {store, connections, syncer}) => {
  sendJson(response, 200, {
    store: store.status(),
    connections: connections(),
    syncing: [...syncer.running()],
  });
  return Promise.resolve();
};

export const initStore: Handler = async (request, response, {store}) => {
  await store.init(await jsonBody(request, initStoreRequestSchema));
  sendJson(response, 204);
};

export const unlockStore: Handler = async (request, response, {store}) => {
  await store.unlock((await jsonBody(request, unlockRequestSchema)).passphrase);
  sendJson(response, 204);
};

export const lockStore: Handler = (_request, response, {store}) => {
  store.lock();
  sendJson(response, 204);
  return Promise.resolve();
};

export const secretList: Handler = async (_request, response, {store, secretNeeds}) => {
  const vault = store.vault();
  await vault.reload();
  sendJson(response, 200, {
    secrets: secretEntries({names: vault.names(), get: key => vault.get(key)}, secretNeeds()),
  });
};

const SECRET_PREFIX = '/api/secrets/';
/** The store key in a secret path, decoded exactly once (`:` arrives as `%3A`) and then validated. */
export function secretKeyOf(path: string): string | null {
  if (!path.startsWith(SECRET_PREFIX)) {
    return null;
  }
  let key: string;
  try {
    key = decodeURIComponent(path.slice(SECRET_PREFIX.length));
  } catch {
    throw new HttpError(400, 'Malformed secret key');
  }
  if (!SECRET_KEY.test(key)) {
    throw new HttpError(404, 'Not found');
  }
  return key;
}

/** Secrets can be written and deleted, never read: no response ever carries a value. */
export async function secretRoute(
  request: IncomingMessage,
  response: ServerResponse,
  context: ApiContext,
  name: string,
): Promise<void> {
  if (request.method === 'PUT') {
    const {value} = await jsonBody(request, setSecretRequestSchema);
    await context.store.vault().set(name, value);
    touchInstanceOf(context.configuration, name);
    sendJson(response, 204);
  } else if (request.method === 'DELETE') {
    sendJson(response, (await context.store.vault().remove(name)) ? 204 : 404);
  } else {
    throw new HttpError(405, 'Method not allowed');
  }
}
