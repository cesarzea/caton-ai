import {describe, expect, it} from 'vitest';

import {connectImapFlow} from '../src/imapflow-session.ts';
import type {ImapClient} from '../src/imapflow-session.ts';

const server = {
  host: 'imap.example-mail.com',
  port: 993,
  user: 'me@example.com',
  password: 'app-password',
};

interface Recorded {
  readonly options: unknown[];
  readonly calls: unknown[][];
}

function fakeClient(recorded: Recorded, found: number[] | false): ImapClient {
  const record = (...call: unknown[]): Promise<void> => {
    recorded.calls.push(call);
    return Promise.resolve();
  };
  const client = {
    connect: () => record('connect'),
    on: () => client,
    list: () => Promise.resolve([{path: 'INBOX'}, {path: '[Gmail]/All', specialUse: '\\All'}]),
    mailboxOpen: (path: string, options: unknown) => record('open', path, options),
    search: async (query: unknown, options: unknown) => {
      await record('search', query, options);
      return found;
    },
    fetch: async function* (range: unknown, query: unknown, options: unknown) {
      await record('fetch', range, query, options);
      yield {source: new Uint8Array([1]), internalDate: '2026-09-19T08:00:05Z'};
      yield {};
    },
    logout: () => record('logout'),
  };
  return client as unknown as ImapClient;
}

async function session(
  found: number[] | false,
): Promise<{recorded: Recorded; opened: Awaited<ReturnType<typeof connectImapFlow>>}> {
  const recorded: Recorded = {options: [], calls: []};
  const opened = await connectImapFlow(server, options => {
    recorded.options.push(options);
    return fakeClient(recorded, found);
  });
  return {recorded, opened};
}

describe('connectImapFlow', () => {
  it('connects over TLS with logging off, and opens folders read-only', async () => {
    const {recorded, opened} = await session([]);
    await opened.openReadOnly('INBOX');

    expect(recorded.options).toEqual([
      {
        host: server.host,
        port: 993,
        secure: true,
        auth: {user: server.user, pass: server.password},
        logger: false,
      },
    ]);
    expect(recorded.calls).toEqual([['connect'], ['open', 'INBOX', {readOnly: true}]]);
    expect(await opened.folders()).toEqual([
      {path: 'INBOX', specialUse: null},
      {path: '[Gmail]/All', specialUse: '\\All'},
    ]);
  });
});

describe('connectImapFlow reading', () => {
  it('searches by sender and date, fetches raw sources by UID, and logs out', async () => {
    const {recorded, opened} = await session([4]);
    const since = new Date('2026-09-01T00:00:00Z');

    expect(await opened.search('example-card.com', since)).toEqual([4]);
    const fetched = [];
    for await (const message of opened.fetch([4])) {
      fetched.push(message);
    }
    await opened.close();

    expect(fetched).toEqual([
      {source: new Uint8Array([1]), receivedAt: new Date('2026-09-19T08:00:05Z')},
    ]);
    expect(recorded.calls.slice(1)).toEqual([
      ['search', {from: 'example-card.com', since}, {uid: true}],
      ['fetch', [4], {source: true, internalDate: true}, {uid: true}],
      ['logout'],
    ]);
    expect(await (await session(false)).opened.search('x', since)).toEqual([]);
  });
});
