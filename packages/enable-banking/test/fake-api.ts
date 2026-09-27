import {generateKeyPairSync} from 'node:crypto';

import type {Fetch} from '../src/index.ts';

const keys = generateKeyPairSync('rsa', {modulusLength: 2048});

export const privateKeyPem = keys.privateKey.export({type: 'pkcs8', format: 'pem'}).toString();
export const publicKey = keys.publicKey;

export interface RecordedRequest {
  readonly url: URL;
  readonly headers: Readonly<Record<string, string>>;
}

/** Fake Enable Banking API: answers each request with the handler for its path. */
export function fakeFetch(
  routes: Readonly<Record<string, (url: URL) => Response>>,
  requests: RecordedRequest[] = [],
): Fetch {
  return (url, init) => {
    const parsed = new URL(url);
    requests.push({url: parsed, headers: init.headers as Record<string, string>});
    const handler = routes[parsed.pathname];
    return Promise.resolve(
      handler === undefined ? new Response(null, {status: 404}) : handler(parsed),
    );
  };
}

export const json = (body: unknown, status = 200): Response => Response.json(body, {status});
