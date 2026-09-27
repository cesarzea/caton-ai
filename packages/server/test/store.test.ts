import {rmSync} from 'node:fs';
import {join} from 'node:path';

import {secretListSchema, statusSchema} from '@caton-ai/api';
import type {Status} from '@caton-ai/api';
import {describe, expect, it} from 'vitest';

import {CONNECTIONS, call, signIn, started, temporaryDirectory} from './harness.ts';
import type {Reply, Started} from './harness.ts';

type Api = (method: string, path: string, body?: unknown) => Promise<Reply>;

async function session(running: Started, replies: Reply[] = []): Promise<Api> {
  const cookie = await signIn(running);
  return async (method, path, body) => {
    const reply = await call(running.port, {method, path, body, headers: {cookie}});
    replies.push(reply);
    return reply;
  };
}

const statusOf = async (api: Api): Promise<Status> =>
  statusSchema.parse(JSON.parse((await api('GET', '/api/status')).body));

const keyFile = (): {source: 'file'; path: string} => ({
  source: 'file',
  path: join(temporaryDirectory(), 'key.txt'),
});

describe('secret store creation', () => {
  it('needs an absolute key file path, and leaves the store unlocked', async () => {
    const api = await session(await started());

    expect(await statusOf(api)).toEqual({
      store: {state: 'missing', keySource: null, error: null},
      connections: CONNECTIONS,
    });
    expect((await api('POST', '/api/store/init', {source: 'file', path: 'key'})).status).toBe(400);
    expect((await api('POST', '/api/store/init', keyFile())).status).toBe(204);
    expect((await statusOf(api)).store).toEqual({
      state: 'unlocked',
      keySource: 'file',
      error: null,
    });
  });
});

const INSTANCE_KEY = 'email-alerts:amex:imap-password';
const path = (key: string): string => `/api/secrets/${encodeURIComponent(key)}`;

describe('secrets', () => {
  it('are listed when needed, stand for shared ones through macros, and never come back', async () => {
    const replies: Reply[] = [];
    const api = await session(await started(), replies);
    await api('POST', '/api/store/init', keyFile());
    const list = async (): Promise<unknown> =>
      secretListSchema.parse(JSON.parse((await api('GET', '/api/secrets')).body)).secrets;

    expect(await list()).toEqual([
      {name: INSTANCE_KEY, stored: false, macro: null, usedBy: ['Amex']},
    ]);
    expect((await api('PUT', path(INSTANCE_KEY), {value: '${work-imap}'})).status).toBe(204);
    expect(await list()).toEqual([
      {name: 'work-imap', stored: false, macro: null, usedBy: ['Amex']},
      {name: INSTANCE_KEY, stored: true, macro: 'work-imap', usedBy: ['Amex']},
    ]);
    expect((await api('PUT', path('work-imap'), {value: 'app-password-value'})).status).toBe(204);
    expect((await api('DELETE', path('work-imap'))).status).toBe(204);
    expect((await api('DELETE', path('work-imap'))).status).toBe(404);
    expect(JSON.stringify(replies)).not.toContain('app-password-value');
  });

  it('are addressed only by valid keys', async () => {
    const api = await session(await started());

    expect((await api('GET', path(INSTANCE_KEY))).status).toBe(405);
    expect((await api('PUT', '/api/secrets/Not%20Valid', {value: 'x'})).status).toBe(404);
    expect((await api('PUT', '/api/secrets/%E0', {value: 'x'})).status).toBe(400);
  });
});

describe('locking', () => {
  it('drops the store from memory; a key file opens it again when the server starts', async () => {
    const first = await started();
    const api = await session(first);
    await api('POST', '/api/store/init', keyFile());
    await api('POST', '/api/store/lock');

    expect((await api('GET', '/api/secrets')).status).toBe(423);
    const restarted = await session(await started({secretsDirectory: first.secretsDirectory}));
    expect((await statusOf(restarted)).store.state).toBe('unlocked');
  });

  it('reports why a key file could not open the store at start', async () => {
    const first = await started();
    const key = keyFile();
    await (
      await session(first)
    )('POST', '/api/store/init', key);
    rmSync(key.path);

    const restarted = await session(await started({secretsDirectory: first.secretsDirectory}));
    expect((await statusOf(restarted)).store).toEqual({
      state: 'locked',
      keySource: 'file',
      error: `${key.path} does not exist`,
    });
  });
});

describe('passphrase store', () => {
  it('refuses short passphrases, rejects wrong ones and slows down guessing', async () => {
    const api = await session(await started());
    const passphrase = 'a long enough passphrase';

    expect(
      (await api('POST', '/api/store/init', {source: 'passphrase', passphrase: 'short'})).status,
    ).toBe(400);
    expect((await api('POST', '/api/store/init', {source: 'passphrase', passphrase})).status).toBe(
      204,
    );
    await api('POST', '/api/store/lock');
    const wrong = await api('POST', '/api/store/unlock', {passphrase: 'not the passphrase'});
    const retried = await api('POST', '/api/store/unlock', {passphrase});

    expect([wrong.status, retried.status]).toEqual([401, 429]);
    expect(wrong.body).toBe('{"error":"Wrong passphrase for the secret store"}');
    expect((await statusOf(api)).store.state).toBe('locked');
  });
});
