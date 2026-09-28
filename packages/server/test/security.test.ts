import {describe, expect, it} from 'vitest';

import {startServer} from '../src/index.ts';
import {call, signIn, started} from './harness.ts';

const tokenOf = (link: string): string => new URL(link).hash.slice('#token='.length);

describe('who may reach the server', () => {
  it('answers only on the loopback address, under its own host names', async () => {
    const {server, port} = await started();
    const withHost = (host: string): Promise<number> =>
      call(port, {path: '/', headers: {host}}).then(reply => reply.status);

    expect(server.origin).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/u);
    expect(await withHost(`127.0.0.1:${String(port)}`)).toBe(200);
    expect(await withHost(`localhost:${String(port)}`)).toBe(200);
    expect(await withHost(`attacker.example:${String(port)}`)).toBe(421);
  });

  it('refuses state changes from other origins, cross-site fetches and non-JSON bodies', async () => {
    const {port} = await started();
    const post = (headers: Record<string, string>): Promise<number> =>
      call(port, {method: 'POST', path: '/api/session', headers, body: {token: 'x'}}).then(
        reply => reply.status,
      );

    expect(await post({origin: 'http://attacker.example'})).toBe(403);
    expect(await post({origin: ''})).toBe(403);
    expect(await post({'sec-fetch-site': 'cross-site'})).toBe(403);
    expect(await post({'content-type': 'text/plain'})).toBe(415);
  });
});

describe('sessions', () => {
  it('are needed for the API, and cannot be forged', async () => {
    const running = await started();
    const status = (cookie?: string): Promise<number> =>
      call(running.port, {path: '/api/status', headers: cookie === undefined ? {} : {cookie}}).then(
        reply => reply.status,
      );

    expect(await status()).toBe(401);
    expect(await status('caton_session=forged')).toBe(401);
    expect(await status(await signIn(running))).toBe(200);
  });

  it('are opened once per link, with a strict cookie', async () => {
    const {server, port} = await started();
    const token = tokenOf(server.accessLink());
    const open = (): ReturnType<typeof call> =>
      call(port, {method: 'POST', path: '/api/session', body: {token}});

    const first = await open();
    const reused = await open();

    expect([first.status, reused.status]).toEqual([204, 401]);
    expect(first.headers['set-cookie']?.[0]).toMatch(
      /^caton_session=[\w-]+; HttpOnly; SameSite=Strict; Path=\/$/u,
    );
  });
});

describe('responses', () => {
  it('carry strict security headers and never CORS headers', async () => {
    const {port} = await started();
    const {headers} = await call(port, {path: '/'});

    expect(headers['content-security-policy']).toContain("default-src 'self'; script-src 'self'");
    expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(headers).toMatchObject({
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer',
      'cross-origin-opener-policy': 'same-origin',
      'cache-control': 'no-store',
    });
    expect(headers['access-control-allow-origin']).toBeUndefined();
  });

  it('refuse oversized and malformed bodies', async () => {
    const {port} = await started();
    const post = (body: string): Promise<number> =>
      call(port, {method: 'POST', path: '/api/session', body}).then(reply => reply.status);

    expect(await post('x'.repeat(80_000))).toBe(413);
    expect(await post('{')).toBe(400);
  });
});

describe('failures', () => {
  it('keep unexpected details in the log', async () => {
    const running = await started({
      connections: () => {
        throw new Error('ledger path /Users/someone/secret');
      },
    });
    const failed = await call(running.port, {
      path: '/api/status',
      headers: {cookie: await signIn(running)},
    });

    expect([failed.status, failed.body]).toEqual([
      500,
      '{"error":"Internal error; the server log has the details"}',
    ]);
    expect(running.logged[0]).toContain('/Users/someone/secret');
  });
});

describe('start-up failures', () => {
  it('say clearly when the port is taken', async () => {
    const {port, secretsDirectory} = await started();
    const again = startServer({
      port,
      secretsDirectory,
      credentials: {read: () => '', write: () => undefined},
      connections: () => [],
      secretNeeds: () => new Map(),
      sync: () => Promise.resolve(),
      plugins: [],
      configuration: {instances: () => [], save: () => undefined},
      assets: null,
      log: () => undefined,
    });

    await expect(again).rejects.toThrow(`Port ${String(port)} is in use`);
  });
});
