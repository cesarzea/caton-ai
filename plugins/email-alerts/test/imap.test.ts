import {describe, expect, it} from 'vitest';

import {imapMailbox} from '../src/index.ts';
import type {ImapSession} from '../src/index.ts';
import type {SearchQuery} from '../src/imap.ts';

const RAW = 'From: alerts@example-card.com\r\nMessage-ID: <m@x>\r\n\r\nImporte: 5,00\r\n';

interface FakeSession extends ImapSession {
  readonly calls: string[];
}

function describeSearch({since, afterUid, words, from}: SearchQuery): string {
  const start =
    since === undefined ? `after ${String(afterUid)}` : since.toISOString().slice(0, 10);
  const sender = from === undefined ? '' : ` from ${from}`;
  return `search ${start} ${words.join('|')}${sender}`;
}

const raw = (uid: number) => ({
  uid,
  source: new TextEncoder().encode(RAW),
  receivedAt: new Date(0),
});

function fakeSession(
  folders: {path: string; specialUse: string | null}[],
  uids: number[],
): FakeSession {
  const calls: string[] = [];
  return {
    calls,
    folders: () => Promise.resolve(folders),
    openReadOnly: path => {
      calls.push(`open-read-only ${path}`);
      return Promise.resolve({uidValidity: 9});
    },
    search: query => {
      calls.push(describeSearch(query));
      return Promise.resolve(uids);
    },
    fetch: async function* (requested) {
      calls.push(`fetch ${requested.join(',')}`);
      yield* requested.map(raw);
      await Promise.resolve();
    },
    close: () => {
      calls.push('close');
      return Promise.resolve();
    },
  };
}

const since = new Date('2026-09-01T00:00:00Z');
const filter = {words: ['receipt', 'factura'], senders: []};
const connect = (session: FakeSession, folder?: string) =>
  imapMailbox({connect: () => Promise.resolve(session), folder});

describe('imapMailbox', () => {
  it('reads the all-mail folder read-only since a date, in ascending UID', async () => {
    const session = fakeSession(
      [
        {path: 'INBOX', specialUse: '\\Inbox'},
        {path: '[Gmail]/Todos', specialUse: '\\All'},
      ],
      [7, 3],
    );
    const read = await connect(session).newMessages(null, since, filter);

    expect(read.uidValidity).toBe(9);
    expect(read.messages.map(item => [item.uid, item.message.messageId])).toEqual([
      [3, '<m@x>'],
      [7, '<m@x>'],
    ]);
    expect(session.calls).toEqual([
      'open-read-only [Gmail]/Todos',
      'search 2026-09-01 receipt|factura',
      'fetch 3,7',
      'close',
    ]);
  });
});

describe('imapMailbox with a cursor', () => {
  it('continues after the cursor, dropping the last message IMAP returns when nothing is new', async () => {
    const session = fakeSession([], [12]);
    const read = await connect(session, 'Cards').newMessages(
      {uidValidity: 9, lastUid: 12},
      since,
      filter,
    );

    expect(read.messages).toEqual([]);
    expect(session.calls).toEqual([
      'open-read-only Cards',
      'search after 12 receipt|factura',
      'close',
    ]);
  });

  it('starts again from the date when the folder was renumbered', async () => {
    const session = fakeSession([], []);
    await connect(session).newMessages({uidValidity: 8, lastUid: 12}, since, filter);

    expect(session.calls).toEqual([
      'open-read-only INBOX',
      'search 2026-09-01 receipt|factura',
      'close',
    ]);
  });
});

describe('imapMailbox for some senders', () => {
  it('searches each sender, keeping a message found twice once', async () => {
    const session = fakeSession([], [5]);
    const read = await connect(session).newMessages(null, since, {
      words: ['receipt'],
      senders: ['a.com', 'b.com'],
    });

    expect(read.messages.map(item => item.uid)).toEqual([5]);
    expect(session.calls).toEqual([
      'open-read-only INBOX',
      'search 2026-09-01 receipt from a.com',
      'search 2026-09-01 receipt from b.com',
      'fetch 5',
      'close',
    ]);
  });
});
