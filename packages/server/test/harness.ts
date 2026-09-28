import {mkdtempSync, rmSync} from 'node:fs';
import {request as httpRequest} from 'node:http';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import type {ConnectionStatus} from '@caton-ai/api';
import type {CredentialStore} from '@caton-ai/secrets';
import {afterEach} from 'vitest';

import {startServer} from '../src/index.ts';
import type {RunningServer, ServerOptions} from '../src/index.ts';
import {PLUGINS, memoryConfiguration} from './plugins-fixture.ts';

const cleanups: (() => Promise<void> | void)[] = [];

afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) {
    await cleanup();
  }
});

export function temporaryDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), 'caton-server-'));
  cleanups.push(() => {
    rmSync(directory, {recursive: true, force: true});
  });
  return directory;
}

const memoryCredentials = (): CredentialStore => {
  const items = new Map<string, string>();
  return {
    read: (service, account) => items.get(`${service}/${account}`) ?? '',
    write: (service, account, value) => {
      items.set(`${service}/${account}`, value);
    },
  };
};

export const CONNECTIONS: ConnectionStatus[] = [
  {
    id: 'millennium',
    title: 'Millennium',
    plugin: 'enable-banking',
    lastOutcome: 'ok',
    lastRunAt: '2026-09-27T10:00:00.000Z',
    lastSuccessfulSyncAt: '2026-09-27T10:00:00.000Z',
    error: null,
    changedSinceSync: false,
  },
];

export interface Started {
  readonly server: RunningServer;
  readonly port: number;
  readonly secretsDirectory: string;
  readonly logged: string[];
}

export async function started(overrides: Partial<ServerOptions> = {}): Promise<Started> {
  const secretsDirectory = join(temporaryDirectory(), 'config');
  const logged: string[] = [];
  const server = await startServer({
    port: 0,
    secretsDirectory,
    credentials: memoryCredentials(),
    connections: () => CONNECTIONS,
    secretNeeds: () => new Map([['email-alerts:amex:imap-password', ['Amex']]]),
    plugins: PLUGINS,
    configuration: memoryConfiguration(),
    sync: () => Promise.resolve(),
    assets: null,
    log: message => {
      logged.push(message);
    },
    scryptWorkFactor: 10,
    ...overrides,
  });
  cleanups.push(() => server.close());
  return {server, port: Number(new URL(server.origin).port), secretsDirectory, logged};
}

export interface Reply {
  readonly status: number;
  readonly headers: Record<string, string | string[] | undefined>;
  readonly body: string;
}

export interface Call {
  readonly method?: string;
  readonly path: string;
  readonly headers?: Record<string, string>;
  readonly body?: unknown;
}

function serialised(body: unknown): string | undefined {
  if (body === undefined) {
    return undefined;
  }
  return typeof body === 'string' ? body : JSON.stringify(body);
}

/** A raw HTTP request, so that tests can forge the headers a browser would never let a page set. */
export function call(
  port: number,
  {method = 'GET', path, headers = {}, body}: Call,
): Promise<Reply> {
  const host = `127.0.0.1:${String(port)}`;
  const defaults: Record<string, string> =
    method === 'GET'
      ? {host}
      : {host, origin: `http://${host}`, 'content-type': 'application/json'};
  return new Promise((resolve, reject) => {
    const outgoing = httpRequest(
      {host: '127.0.0.1', port, method, path, headers: {...defaults, ...headers}},
      incoming => {
        let text = '';
        incoming.setEncoding('utf8');
        incoming.on('data', (chunk: string) => (text += chunk));
        incoming.on('end', () => {
          resolve({status: incoming.statusCode ?? 0, headers: incoming.headers, body: text});
        });
      },
    );
    outgoing.on('error', reject);
    outgoing.end(serialised(body));
  });
}

/** Signs in with a fresh one-time link and returns the session cookie. */
export async function signIn({server, port}: Started): Promise<string> {
  const token = new URL(server.accessLink()).hash.slice('#token='.length);
  const reply = await call(port, {method: 'POST', path: '/api/session', body: {token}});
  const cookie = [reply.headers['set-cookie'] ?? []].flat()[0] ?? '';
  return cookie.split(';')[0] ?? '';
}
