import {instanceListSchema, pluginListSchema} from '@caton-ai/api';
import {describe, expect, it} from 'vitest';

import {call, signIn, started} from './harness.ts';
import {PLUGINS} from './plugins-fixture.ts';
import type {Reply} from './harness.ts';

type Api = (method: string, path: string, body?: unknown) => Promise<Reply>;

async function session(): Promise<Api> {
  const running = await started();
  const cookie = await signIn(running);
  return (method, path, body) => call(running.port, {method, path, body, headers: {cookie}});
}

const instances = async (api: Api): Promise<unknown> =>
  instanceListSchema.parse(JSON.parse((await api('GET', '/api/instances')).body)).instances;

describe('plugins and instances', () => {
  it('show every plugin contract, help included', async () => {
    const api = await session();

    expect(pluginListSchema.parse(JSON.parse((await api('GET', '/api/plugins')).body))).toEqual({
      plugins: PLUGINS,
    });
  });
});

describe('instance ids', () => {
  it('are created with ids from their titles, unique across plugins, then fixed', async () => {
    const api = await session();
    const create = async (title: string): Promise<Reply> =>
      api('POST', '/api/instances', {
        title,
        plugin: 'email-alerts',
        settings: {'imap-user': 'me@example.com'},
      });

    expect(JSON.parse((await create('Amex Catón')).body)).toEqual({id: 'amex-caton'});
    expect(JSON.parse((await create('amex caton')).body)).toEqual({id: 'amex-caton-2'});
    expect(
      (await api('PUT', '/api/instances/amex-caton', {title: 'Amex (work)', settings: {}})).status,
    ).toBe(204);
    expect(await instances(api)).toEqual([
      {id: 'amex-caton', title: 'Amex (work)', plugin: 'email-alerts', settings: {}},
      {
        id: 'amex-caton-2',
        title: 'amex caton',
        plugin: 'email-alerts',
        settings: {'imap-user': 'me@example.com'},
      },
    ]);
  });
});

describe('instance requests', () => {
  it('never put a secret, or an undeclared setting, in the configuration', async () => {
    const api = await session();
    const create = (body: unknown): Promise<number> =>
      api('POST', '/api/instances', body).then(reply => reply.status);

    expect(
      await create({title: 'A', plugin: 'email-alerts', settings: {'imap-password': 'pw'}}),
    ).toBe(400);
    expect(await create({title: 'A', plugin: 'email-alerts', settings: {unknown: 'x'}})).toBe(400);
    expect(await create({title: 'A', plugin: 'missing', settings: {}})).toBe(400);
    expect(await create({title: ' ', plugin: 'email-alerts', settings: {}})).toBe(400);
    expect(await instances(api)).toEqual([]);
  });

  it('delete existing instances only, and refuse other methods', async () => {
    const api = await session();
    await api('POST', '/api/instances', {title: 'Amex', plugin: 'email-alerts', settings: {}});

    expect((await api('DELETE', '/api/instances/amex')).status).toBe(204);
    expect((await api('DELETE', '/api/instances/amex')).status).toBe(404);
    expect((await api('PUT', '/api/instances/amex', {title: 'X', settings: {}})).status).toBe(404);
    expect((await api('GET', '/api/instances/amex')).status).toBe(405);
  });
});
