import type {IncomingMessage, ServerResponse} from 'node:http';

import {
  SECRET_KEY,
  initStoreRequestSchema,
  sessionRequestSchema,
  setSecretRequestSchema,
  unlockRequestSchema,
} from '@caton-ai/api';
import type {ConnectionStatus} from '@caton-ai/api';

import {HttpError, jsonBody, sendJson} from './http.ts';
import {sessionCookie} from './sessions.ts';
import type {Sessions} from './sessions.ts';
import {secretEntries} from './secret-list.ts';
import type {SecretNeeds} from './secret-list.ts';
import type {StoreHolder} from './store-holder.ts';

export interface ApiContext {
  readonly sessions: Sessions;
  readonly store: StoreHolder;
  readonly connections: () => ConnectionStatus[];
  readonly secretNeeds: () => SecretNeeds;
}

type Handler = (
  request: IncomingMessage,
  response: ServerResponse,
  context: ApiContext,
) => Promise<void>;

const SECRET_PREFIX = '/api/secrets/';

/** The store key in a secret path, decoded exactly once (`:` arrives as `%3A`) and then validated. */
function secretKeyOf(path: string): string | null {
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

const openSession: Handler = async (request, response, {sessions}) => {
  const id = sessions.exchange((await jsonBody(request, sessionRequestSchema)).token);
  if (id === null) {
    throw new HttpError(401, 'This link has expired or was already used: restart caton serve');
  }
  response.setHeader('Set-Cookie', sessionCookie(id));
  sendJson(response, 204);
};

const status: Handler = (_request, response, {store, connections}) => {
  sendJson(response, 200, {store: store.status(), connections: connections()});
  return Promise.resolve();
};

const initStore: Handler = async (request, response, {store}) => {
  await store.init(await jsonBody(request, initStoreRequestSchema));
  sendJson(response, 204);
};

const unlockStore: Handler = async (request, response, {store}) => {
  await store.unlock((await jsonBody(request, unlockRequestSchema)).passphrase);
  sendJson(response, 204);
};

const lockStore: Handler = (_request, response, {store}) => {
  store.lock();
  sendJson(response, 204);
  return Promise.resolve();
};

const secretList: Handler = async (_request, response, {store, secretNeeds}) => {
  const vault = store.vault();
  await vault.reload();
  sendJson(response, 200, {
    secrets: secretEntries({names: vault.names(), get: key => vault.get(key)}, secretNeeds()),
  });
};

/** The fixed set of routes; anything else is not found. */
function routeFor(method: string | undefined, path: string): Handler {
  switch (`${method ?? ''} ${path}`) {
    case 'GET /api/status':
      return status;
    case 'POST /api/store/init':
      return initStore;
    case 'POST /api/store/unlock':
      return unlockStore;
    case 'POST /api/store/lock':
      return lockStore;
    case 'GET /api/secrets':
      return secretList;
    default:
      throw new HttpError(404, 'Not found');
  }
}

/** Secrets can be written and deleted, never read: no response ever carries a value. */
async function secretRoute(
  request: IncomingMessage,
  response: ServerResponse,
  context: ApiContext,
  name: string,
): Promise<void> {
  if (request.method === 'PUT') {
    const {value} = await jsonBody(request, setSecretRequestSchema);
    await context.store.vault().set(name, value);
    sendJson(response, 204);
  } else if (request.method === 'DELETE') {
    sendJson(response, (await context.store.vault().remove(name)) ? 204 : 404);
  } else {
    throw new HttpError(405, 'Method not allowed');
  }
}

/** Routes an API request; every route but the session exchange needs a session. */
export async function apiRoute(
  request: IncomingMessage,
  response: ServerResponse,
  context: ApiContext,
  path: string,
): Promise<void> {
  if (request.method === 'POST' && path === '/api/session') {
    await openSession(request, response, context);
    return;
  }
  if (!context.sessions.isValid(request.headers.cookie)) {
    throw new HttpError(401, 'Open Catón AI with the link printed by caton serve');
  }
  const key = secretKeyOf(path);
  if (key !== null) {
    await secretRoute(request, response, context, key);
    return;
  }
  await routeFor(request.method, path)(request, response, context);
}
