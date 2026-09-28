import type {IncomingMessage, ServerResponse} from 'node:http';

import {sessionRequestSchema, syncRequestSchema} from '@caton-ai/api';

import type {ApiContext, Handler} from './api-context.ts';
import type {StoreHolder} from './store-holder.ts';
import {HttpError, jsonBody, sendJson} from './http.ts';
import {
  initStore,
  lockStore,
  secretKeyOf,
  secretList,
  secretRoute,
  status,
  unlockStore,
} from './store-routes.ts';
import {createInstance, deleteInstance, updateInstance} from './instances.ts';
import {reportRouteFor} from './report-routes.ts';
import {sessionCookie} from './sessions.ts';

const INSTANCE_PATH = /^\/api\/instances\/([a-z0-9][a-z0-9-]*)$/u;

async function instanceRoute(
  request: IncomingMessage,
  response: ServerResponse,
  {plugins, configuration, store}: ApiContext,
  id: string,
): Promise<void> {
  if (request.method === 'PUT') {
    await updateInstance(request, response, {plugins, configuration}, id);
  } else if (request.method === 'DELETE') {
    const removed = deleteInstance(configuration, id);
    await removeInstanceSecrets(store, `${removed.plugin}:${removed.id}:`);
    sendJson(response, 204);
  } else {
    throw new HttpError(405, 'Method not allowed');
  }
}

/** The secrets of a removed instance go with it, when the store is open; shared ones stay. */
async function removeInstanceSecrets(store: StoreHolder, prefix: string): Promise<void> {
  if (store.status().state !== 'unlocked') {
    return;
  }
  const vault = store.vault();
  await vault.reload();
  for (const key of vault.names().filter(name => name.startsWith(prefix))) {
    await vault.remove(key);
  }
}

const openSession: Handler = async (request, response, {sessions}) => {
  const id = sessions.exchange((await jsonBody(request, sessionRequestSchema)).token);
  if (id === null) {
    throw new HttpError(401, 'This link has expired or was already used: restart caton serve');
  }
  response.setHeader('Set-Cookie', sessionCookie(id));
  sendJson(response, 204);
};

const pluginList: Handler = (_request, response, {plugins}) => {
  sendJson(response, 200, {plugins});
  return Promise.resolve();
};

const instanceList: Handler = (_request, response, {configuration}) => {
  sendJson(response, 200, {instances: configuration.instances()});
  return Promise.resolve();
};

const newInstance: Handler = (request, response, context) =>
  createInstance(request, response, context);

const startSync: Handler = async (request, response, {syncer}) => {
  const {connections} = await jsonBody(request, syncRequestSchema);
  sendJson(response, 202, {syncing: [...(await syncer.start(connections ?? null))]});
};

function storeRouteFor(route: string): Handler | undefined {
  switch (route) {
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
    case 'POST /api/sync':
      return startSync;
    default:
      return undefined;
  }
}

function configurationRouteFor(route: string): Handler | undefined {
  switch (route) {
    case 'GET /api/plugins':
      return pluginList;
    case 'GET /api/instances':
      return instanceList;
    case 'POST /api/instances':
      return newInstance;
    default:
      return undefined;
  }
}

/** The fixed set of routes; anything else is not found. */
function routeFor(method: string | undefined, path: string): Handler {
  const route = `${method ?? ''} ${path}`;
  const handler = storeRouteFor(route) ?? configurationRouteFor(route) ?? reportRouteFor(route);
  if (handler === undefined) {
    throw new HttpError(404, 'Not found');
  }
  return handler;
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
  const instance = INSTANCE_PATH.exec(path)?.[1];
  if (instance !== undefined) {
    await instanceRoute(request, response, context, instance);
    return;
  }
  const key = secretKeyOf(path);
  if (key !== null) {
    await secretRoute(request, response, context, key);
    return;
  }
  await routeFor(request.method, path)(request, response, context);
}
