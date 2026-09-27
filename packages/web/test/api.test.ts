import {afterEach, describe, expect, it, vi} from 'vitest';

import {ApiError, httpApi} from '../src/api.ts';

const reply = (status: number, body?: unknown): Response =>
  new Response(body === undefined ? null : JSON.stringify(body), {status});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('httpApi', () => {
  it('sends JSON with the session cookie and checks responses against the contract', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(reply(204))
      .mockResolvedValueOnce(reply(200, {names: ['imap']}));
    vi.stubGlobal('fetch', fetch);

    await httpApi.setSecret('imap', 'value');
    expect(await httpApi.secretNames()).toEqual(['imap']);
    expect(fetch.mock.calls[0]).toEqual([
      '/api/secrets/imap',
      {
        method: 'PUT',
        credentials: 'same-origin',
        headers: {'Content-Type': 'application/json'},
        body: '{"value":"value"}',
      },
    ]);
    expect(fetch.mock.calls[1]?.[1]).toMatchObject({method: 'GET', body: null, headers: {}});
  });
});

describe('httpApi refusals', () => {
  it('turns refusals into errors with the message the server wrote', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(reply(401, {error: 'Wrong passphrase'}))
        .mockResolvedValueOnce(new Response('<html>', {status: 502})),
    );

    await expect(httpApi.unlock('x')).rejects.toEqual(new ApiError(401, 'Wrong passphrase'));
    await expect(httpApi.lock()).rejects.toThrow('Request failed (502)');
  });

  it('refuses responses that break the contract', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply(200, {store: 'nonsense'})));

    await expect(httpApi.status()).rejects.toThrow();
  });
});
