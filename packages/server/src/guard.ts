import type {IncomingMessage} from 'node:http';

import {HttpError} from './http.ts';

const SAFE_METHODS = new Set(['GET', 'HEAD']);

/** The only names under which the interface is served: anything else is a rebinding attempt. */
function checkHost(request: IncomingMessage, port: number): string {
  const host = request.headers.host ?? '';
  if (host !== `127.0.0.1:${String(port)}` && host !== `localhost:${String(port)}`) {
    throw new HttpError(421, 'Unexpected host');
  }
  return host;
}

/** State-changing requests must come from the interface itself. */
function checkOrigin(request: IncomingMessage, host: string): void {
  if (request.headers.origin !== `http://${host}`) {
    throw new HttpError(403, 'Cross-origin request refused');
  }
  const site = request.headers['sec-fetch-site'];
  if (site !== undefined && site !== 'same-origin') {
    throw new HttpError(403, 'Cross-site request refused');
  }
}

/**
 * Refuses requests that could come from another site: an unexpected `Host` (DNS rebinding), and
 * for state-changing requests, a foreign `Origin`, a cross-site fetch or a non-JSON body.
 */
export function guardRequest(request: IncomingMessage, port: number): void {
  const host = checkHost(request, port);
  if (SAFE_METHODS.has(request.method ?? '')) {
    return;
  }
  checkOrigin(request, host);
  const type = request.headers['content-type'] ?? '';
  if (request.method !== 'DELETE' && !type.startsWith('application/json')) {
    throw new HttpError(415, 'JSON expected');
  }
}
