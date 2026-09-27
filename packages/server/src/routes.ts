import type {IncomingMessage, ServerResponse} from 'node:http';

import {
  initStoreRequestSchema,
  sessionRequestSchema,
  setSecretRequestSchema,
  unlockRequestSchema,
} from '@caton-ai/api';
import type {ConnectionStatus} from '@caton-ai/api';

import {HttpError, jsonBody, sendJson} from './http.ts';
import {sessionCookie} from './sessions.ts';
import type {Sessions} from './sessions.ts';
import type {StoreHolder} from './store-holder.ts';

export interface ApiContext {
  readonly sessions: Sessions;
  readonly store: StoreHolder;
  readonly connections: () => ConnectionStatus[];
}

type Handler = (
  request: IncomingMessage,
  response: ServerResponse,
  context: ApiContext,
) => Promise<void>;

const SECRET_PATH = /^\/api\/secrets\/([a-z0-9][a-z0-9-]*)$/u;

const openSession: Handler = async (request, response, {sessions}) => {
  const id = sessions.exchange((await jsonBody(request, sessionRequestSchema)).token);
  if (id === null) {
    throw new HttpError(401, 'This link has expired or was already used: restart caton serve');
  }
  response.setHeader('Set-Cookie', sessionCookie(id));
  sendJson(response, 204);
};

const ROUTES = new Map<string, Handler>([
  [
    'GET /api/status',
    (_request, response, {store, connections}) => {
      sendJson(response, 200, {store: store.status(), connections: connections()});
      return Promise.resolve();
    },
  ],
  [
    'POST /api/store/init',
    async (request, response, {store}) => {
      await store.init(await jsonBody(request, initStoreRequestSchema));
      sendJson(response, 204);
    },
  ],
  [
    'POST /api/store/unlock',
    async (request, response, {store}) => {
      await store.unlock((await jsonBody(request, unlockRequestSchema)).passphrase);
      sendJson(response, 204);
    },
  ],
  [
    'POST /api/store/lock',
    (_request, response, {store}) => {
      store.lock();
      sendJson(response, 204);
      return Promise.resolve();
    },
  ],
  [
    'GET /api/secrets',
    async (_request, response, {store}) => {
      const vault = store.vault();
      await vault.reload();
      sendJson(response, 200, {names: vault.names()});
    },
  ],
]);

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
  const name = SECRET_PATH.exec(path)?.[1];
  if (name !== undefined) {
    await secretRoute(request, response, context, name);
    return;
  }
  const handler = ROUTES.get(`${request.method ?? ''} ${path}`);
  if (handler === undefined) {
    throw new HttpError(404, 'Not found');
  }
  await handler(request, response, context);
}
