import {createServer} from 'node:http';
import type {IncomingMessage, ServerResponse} from 'node:http';
import type {AddressInfo} from 'node:net';

import type {ConnectionStatus} from '@caton-ai/api';
import type {CredentialStore} from '@caton-ai/secrets';

import type {Asset} from './assets.ts';
import {placeholderAssets} from './assets.ts';
import {guardRequest} from './guard.ts';
import {HttpError, secureHeaders, sendJson} from './http.ts';
import {apiRoute} from './routes.ts';
import type {SecretReferences} from './secret-list.ts';
import type {ApiContext} from './routes.ts';
import {createSessions} from './sessions.ts';
import {createStoreHolder} from './store-holder.ts';

/** Only this address: the interface is never reachable from the network. */
const LOOPBACK = '127.0.0.1';

export interface ServerOptions {
  /** 0 picks a free port. */
  readonly port: number;
  readonly secretsDirectory: string;
  readonly credentials: CredentialStore;
  readonly connections: () => ConnectionStatus[];
  /** Which connections and plugins refer to each secret of the store. */
  readonly secretReferences: () => SecretReferences;
  /** The built interface; a placeholder page when `null`. */
  readonly assets: ReadonlyMap<string, Asset> | null;
  /** Unexpected errors, out of band. Request bodies are never logged. */
  readonly log: (message: string) => void;
  readonly scryptWorkFactor?: number;
}

export interface RunningServer {
  readonly origin: string;
  /** A new one-time link that signs the browser in; the previous one stops working. */
  accessLink(): string;
  close(): Promise<void>;
}

/** The path of the request URL, without its query; never decoded, so never re-interpreted. */
function pathOf(request: IncomingMessage): string {
  return (request.url ?? '/').split('?')[0] ?? '/';
}

function serveAsset(
  request: IncomingMessage,
  response: ServerResponse,
  assets: ReadonlyMap<string, Asset>,
): void {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    throw new HttpError(405, 'Method not allowed');
  }
  const path = pathOf(request);
  // Unknown paths get the application shell, which routes them in the browser.
  const asset = assets.get(path) ?? assets.get('/index.html');
  if (asset === undefined) {
    throw new HttpError(404, 'Not found');
  }
  response.writeHead(200, {'Content-Type': asset.type});
  response.end(request.method === 'HEAD' ? undefined : asset.body);
}

function handler(options: ServerOptions, context: ApiContext, port: () => number) {
  const assets = options.assets ?? placeholderAssets;
  return async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    secureHeaders(response);
    try {
      guardRequest(request, port());
      const path = pathOf(request);
      if (path.startsWith('/api/')) {
        await apiRoute(request, response, context, path);
      } else {
        serveAsset(request, response, assets);
      }
    } catch (error) {
      if (error instanceof HttpError) {
        sendJson(response, error.status, {error: error.message});
        return;
      }
      options.log(error instanceof Error ? (error.stack ?? error.message) : String(error));
      sendJson(response, 500, {error: 'Internal error; the server log has the details'});
    }
  };
}

function listen(server: ReturnType<typeof createServer>, port: number): Promise<number> {
  return new Promise((resolve, reject) => {
    server.once('error', (error: NodeJS.ErrnoException) => {
      reject(
        error.code === 'EADDRINUSE'
          ? new Error(`Port ${String(port)} is in use: choose another one`)
          : error,
      );
    });
    server.listen(port, LOOPBACK, () => {
      resolve((server.address() as AddressInfo).port);
    });
  });
}

/** Starts the local web server on the loopback address. */
export async function startServer(options: ServerOptions): Promise<RunningServer> {
  const store = createStoreHolder({
    directory: options.secretsDirectory,
    credentials: options.credentials,
    ...(options.scryptWorkFactor === undefined ? {} : {scryptWorkFactor: options.scryptWorkFactor}),
  });
  await store.autoUnlock();
  const context: ApiContext = {
    sessions: createSessions(),
    store,
    connections: options.connections,
    secretReferences: options.secretReferences,
  };
  let port = options.port;
  const server = createServer((request, response) => {
    void handler(options, context, () => port)(request, response);
  });
  port = await listen(server, options.port);
  const origin = `http://${LOOPBACK}:${String(port)}`;
  return {
    origin,
    accessLink: () => `${origin}/#token=${context.sessions.issueToken()}`,
    close: () =>
      new Promise(resolve => {
        server.close(() => {
          resolve();
        });
      }),
  };
}
