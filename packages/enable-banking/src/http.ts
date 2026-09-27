import {HttpError, RateLimitedError} from './errors.ts';
import {signApplicationToken} from './jwt.ts';

export type Fetch = (url: string, init: RequestInit) => Promise<Response>;

export interface ApiClientOptions {
  readonly appId: string;
  readonly privateKeyPem: string;
  readonly fetch?: Fetch;
  readonly now?: () => Date;
  readonly sleep?: (milliseconds: number) => Promise<void>;
  readonly baseUrl?: string;
}

export interface ApiClient {
  get(path: string, query?: Readonly<Record<string, string>>): Promise<unknown>;
}

const DEFAULT_BASE_URL = 'https://api.enablebanking.com';
const REQUEST_TIMEOUT_MS = 60_000;
const RETRY_DELAY_MS = 1_000;
const TRANSIENT_STATUSES = new Set([502, 503, 504]);

const defaultSleep = (milliseconds: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, milliseconds));

/** Authenticated GET client. Transient gateway errors are retried once; nothing else is. */
export function createApiClient(options: ApiClientOptions): ApiClient {
  const send = sender(options);
  const sleep = options.sleep ?? defaultSleep;
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  return {
    async get(path, query = {}) {
      const url = buildUrl(baseUrl, path, query);
      let response = await send(url);
      if (TRANSIENT_STATUSES.has(response.status)) {
        await sleep(RETRY_DELAY_MS);
        response = await send(url);
      }
      return readBody(response, path);
    },
  };
}

/** Sends one request with a freshly signed application token. */
function sender(options: ApiClientOptions): (url: URL) => Promise<Response> {
  const fetchFn = options.fetch ?? globalThis.fetch;
  const now = options.now ?? (() => new Date());
  return url => {
    const seconds = Math.floor(now().getTime() / 1000);
    const token = signApplicationToken(options.appId, options.privateKeyPem, seconds);
    return fetchFn(url.toString(), {
      headers: {Authorization: `Bearer ${token}`, Accept: 'application/json'},
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  };
}

function buildUrl(baseUrl: string, path: string, query: Readonly<Record<string, string>>): URL {
  const url = new URL(path, baseUrl);
  Object.entries(query).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return url;
}

async function readBody(response: Response, path: string): Promise<unknown> {
  if (response.status === 429) {
    const retryAfter = Number.parseInt(response.headers.get('retry-after') ?? '', 10);
    throw new RateLimitedError(Number.isNaN(retryAfter) ? null : retryAfter);
  }
  if (!response.ok) {
    throw new HttpError(response.status, path);
  }
  const body: unknown = await response.json();
  return body;
}
