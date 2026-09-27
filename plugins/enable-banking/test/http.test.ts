import {describe, expect, it} from 'vitest';

import {HttpError, RateLimitedError} from '../src/index.ts';
import {createApiClient} from '../src/http.ts';
import {fakeFetch, json, privateKeyPem} from './fake-api.ts';
import type {RecordedRequest} from './fake-api.ts';

const options = {appId: 'app-123', privateKeyPem, sleep: () => Promise.resolve()};

describe('createApiClient', () => {
  it('sends an authenticated GET with the query string', async () => {
    const requests: RecordedRequest[] = [];
    const api = createApiClient({
      ...options,
      fetch: fakeFetch({'/ping': () => json({ok: true})}, requests),
    });

    expect(await api.get('/ping', {date_from: '2026-09-01'})).toEqual({ok: true});
    expect(requests[0]?.url.searchParams.get('date_from')).toBe('2026-09-01');
    expect(requests[0]?.headers['Authorization']).toMatch(/^Bearer [\w-]+\.[\w-]+\.[\w-]+$/u);
  });

  it('retries a transient gateway error once', async () => {
    const statuses = [503, 200];
    const routes = {'/ping': () => json({ok: true}, statuses.shift())};
    const api = createApiClient({...options, fetch: fakeFetch(routes)});

    expect(await api.get('/ping')).toEqual({ok: true});
    expect(statuses).toEqual([]);
  });
});

describe('createApiClient failures', () => {
  it('never retries rate limiting and reports Retry-After', async () => {
    const limited = (): Response =>
      new Response(null, {status: 429, headers: {'retry-after': '120'}});
    const api = createApiClient({...options, fetch: fakeFetch({'/ping': limited})});

    await expect(api.get('/ping')).rejects.toEqual(new RateLimitedError(120));
  });

  it('turns other failures into HttpError without the response body', async () => {
    const api = createApiClient({...options, fetch: fakeFetch({})});

    const error: unknown = await api.get('/missing').catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(404);
  });
});
