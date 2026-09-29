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

function fakeClient(recorded: Recorded, found: number[] | false, gmail = false): ImapClient {
  const record = (...call: unknown[]): Promise<void> => {
    recorded.calls.push(call);
    return Promise.resolve();
  };
  const client = {
    capabilities: new Map<string, boolean>(gmail ? [['X-GM-EXT-1', true]] : []),
    connect: () => record('connect'),
    on: () => client,
    list: () => Promise.resolve([{path: 'INBOX'}, {path: '[Gmail]/All', specialUse: '\\All'}]),
    mailboxOpen: async (path: string, options: unknown) => {
      await record('open', path, options);
      return {uidValidity: 9n};
    },
    search: async (query: unknown, options: unknown) => {
      await record('search', query, options);
      return found;
    },
    fetch: async function* (range: unknown, query: unknown, options: unknown) {
      await record('fetch', range, query, options);
      yield {uid: 4, source: new Uint8Array([1]), internalDate: '2026-09-19T08:00:05Z'};
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
    expect(await opened.openReadOnly('INBOX')).toEqual({uidValidity: 9});

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
  it('searches words since a date or after a UID, fetches raw sources by UID, and logs out', async () => {
    const {recorded, opened} = await session([4]);
    const since = new Date('2026-09-01T00:00:00Z');

    expect(await opened.search({since, words: ['receipt', 'factura']})).toEqual([4]);
    await opened.search({afterUid: 3, words: ['receipt']});
    const fetched = [];
    for await (const message of opened.fetch([4])) {
      fetched.push(message);
    }
    await opened.close();

    expect(fetched).toEqual([
      {uid: 4, source: new Uint8Array([1]), receivedAt: new Date('2026-09-19T08:00:05Z')},
    ]);
    expect(recorded.calls.slice(1)).toEqual([
      ['search', {or: [{text: 'receipt'}, {text: 'factura'}], since}, {uid: true}],
      ['search', {or: [{text: 'receipt'}], uid: '4:*'}, {uid: true}],
      ['fetch', [4], {uid: true, source: true, internalDate: true}, {uid: true}],
      ['logout'],
    ]);
    expect(await (await session(false)).opened.search({since, words: ['x']})).toEqual([]);
  });
});

describe('connectImapFlow failures', () => {
  it("report what the server said, not imapflow's generic message", async () => {
    const refusing = (method: 'connect' | 'search'): ImapClient => {
      const failure = Object.assign(new Error('Command failed'), {
        responseText: 'Invalid credentials (Failure)',
      });
      const client = fakeClient({options: [], calls: []}, []);
      return Object.assign(client, {[method]: () => Promise.reject(failure)});
    };

    await expect(connectImapFlow(server, () => refusing('connect'))).rejects.toThrow(
      'the IMAP server refused the connection: Invalid credentials (Failure)',
    );
    const opened = await connectImapFlow(server, () => refusing('search'));
    await expect(opened.search({words: ['x']})).rejects.toThrow(
      'the IMAP search failed: Invalid credentials (Failure)',
    );
    const plain = Object.assign(fakeClient({options: [], calls: []}, []), {
      connect: () => Promise.reject(new Error('timeout')),
    });
    await expect(connectImapFlow(server, () => plain)).rejects.toThrow(
      'the IMAP server refused the connection: timeout',
    );
  });
});

describe('connectImapFlow on a server that classifies mail', () => {
  it('leaves out promotions and social mail, and searches one sender', async () => {
    const recorded: Recorded = {options: [], calls: []};
    const opened = await connectImapFlow(server, () => fakeClient(recorded, [1], true));
    await opened.search({afterUid: 1, words: ['receipt'], from: 'example.com'});

    expect(recorded.calls.at(-1)).toEqual([
      'search',
      {
        or: [{text: 'receipt'}],
        uid: '2:*',
        from: 'example.com',
        gmraw: '-category:promotions -category:social',
      },
      {uid: true},
    ]);
  });
});
