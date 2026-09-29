import {join} from 'node:path';

import {statusSchema} from '@caton-ai/api';
import {describe, expect, it} from 'vitest';

import type {SyncRunner} from '../src/index.ts';
import {call, signIn, started, temporaryDirectory} from './harness.ts';
import type {Reply, Started} from './harness.ts';

type Api = (method: string, path: string, body?: unknown) => Promise<Reply>;

async function session(running: Started): Promise<Api> {
  const cookie = await signIn(running);
  return (method, path, body) => call(running.port, {method, path, body, headers: {cookie}});
}

const syncingOf = async (api: Api): Promise<string[]> =>
  statusSchema.parse(JSON.parse((await api('GET', '/api/status')).body)).syncing;

/** A sync that waits until the test lets it finish, recording what it was asked. */
function gatedSync(): {run: SyncRunner; asked: string[][]; finish: () => void} {
  const asked: string[][] = [];
  let release = (): void => undefined;
  const gate = new Promise<void>(resolve => {
    release = resolve;
  });
  return {
    asked,
    finish: () => {
      release();
    },
    run: async (names, lookup) => {
      asked.push([...names, String(lookup('email-alerts:amex:imap-password'))]);
      await gate;
    },
  };
}

describe('syncing from the web', () => {
  it('syncs every connection or the ones asked, one sync at a time, with the open store', async () => {
    const sync = gatedSync();
    const api = await session(await started({sync: sync.run}));
    expect((await api('POST', '/api/sync', {})).status).toBe(409);
    await api('POST', '/api/store/init', {
      source: 'file',
      path: join(temporaryDirectory(), 'key.txt'),
    });
    await api('PUT', `/api/secrets/${encodeURIComponent('email-alerts:amex:imap-password')}`, {
      value: 'pw',
    });

    const first = await api('POST', '/api/sync', {connections: ['millennium']});
    expect([first.status, JSON.parse(first.body)]).toEqual([202, {syncing: ['millennium']}]);
    expect(await syncingOf(api)).toEqual(['millennium']);
    expect((await api('POST', '/api/sync', {})).status).toBe(409);
    sync.finish();
    await new Promise(resolve => setImmediate(resolve));

    expect(await syncingOf(api)).toEqual([]);
  });
});

describe('syncing from the web, by name', () => {
  it('refuses unknown connections, and syncs every one when none is named', async () => {
    const sync = gatedSync();
    sync.finish();
    const api = await session(await started({sync: sync.run}));
    await api('POST', '/api/store/init', {
      source: 'file',
      path: join(temporaryDirectory(), 'key.txt'),
    });
    await api('PUT', `/api/secrets/${encodeURIComponent('email-alerts:amex:imap-password')}`, {
      value: 'pw',
    });

    expect((await api('POST', '/api/sync', {connections: ['nobody']})).status).toBe(404);
    expect((await api('POST', '/api/sync', {})).status).toBe(202);
    expect(sync.asked).toEqual([['millennium', 'pw']]);
  });
});

describe('syncing from the web, failing', () => {
  it('logs a sync that fails as a whole', async () => {
    const running = await started({sync: () => Promise.reject(new Error('ledger locked'))});
    const api = await session(running);
    await api('POST', '/api/store/init', {
      source: 'file',
      path: join(temporaryDirectory(), 'key.txt'),
    });
    await api('POST', '/api/sync', {});
    await new Promise(resolve => setImmediate(resolve));

    expect(running.logged).toContain('Sync failed: ledger locked');
    expect(await syncingOf(api)).toEqual([]);
  });
});
