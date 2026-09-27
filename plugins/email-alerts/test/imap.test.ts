import {describe, expect, it} from 'vitest';

import {imapMailbox} from '../src/index.ts';
import type {ImapSession} from '../src/index.ts';

const RAW = 'From: alerts@example-card.com\r\nMessage-ID: <m@x>\r\n\r\nImporte: 5,00\r\n';

interface FakeSession extends ImapSession {
  readonly calls: string[];
}

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
      return Promise.resolve();
    },
    search: (sender, since) => {
      calls.push(`search ${sender} ${since.toISOString().slice(0, 10)}`);
      return Promise.resolve(uids);
    },
    fetch: async function* (requested) {
      calls.push(`fetch ${requested.join(',')}`);
      yield* requested.map(() => ({
        source: new TextEncoder().encode(RAW),
        receivedAt: new Date(0),
      }));
      await Promise.resolve();
    },
    close: () => {
      calls.push('close');
      return Promise.resolve();
    },
  };
}

const since = new Date('2026-09-01T00:00:00Z');

describe('imapMailbox', () => {
  it('reads the all-mail folder read-only, once per message found for any domain', async () => {
    const session = fakeSession(
      [
        {path: 'INBOX', specialUse: '\\Inbox'},
        {path: '[Gmail]/Todos', specialUse: '\\All'},
      ],
      [7, 3],
    );
    const messages = await imapMailbox({connect: () => Promise.resolve(session)}).messagesFrom(
      ['a.com', 'b.com'],
      since,
    );

    expect(messages.map(message => message.messageId)).toEqual(['<m@x>', '<m@x>']);
    expect(session.calls).toEqual([
      'open-read-only [Gmail]/Todos',
      'search a.com 2026-09-01',
      'search b.com 2026-09-01',
      'fetch 3,7',
      'close',
    ]);
  });
});

describe('imapMailbox folders and failures', () => {
  it('uses the configured folder, or the inbox, and fetches nothing when nothing matches', async () => {
    const inbox = fakeSession([], []);
    const chosen = fakeSession([], []);
    await imapMailbox({connect: () => Promise.resolve(inbox)}).messagesFrom(['a.com'], since);
    await imapMailbox({connect: () => Promise.resolve(chosen), folder: 'Cards'}).messagesFrom(
      ['a.com'],
      since,
    );

    expect(inbox.calls).toEqual(['open-read-only INBOX', 'search a.com 2026-09-01', 'close']);
    expect(chosen.calls[0]).toBe('open-read-only Cards');
  });

  it('always closes the session, even when reading fails', async () => {
    const session = {
      ...fakeSession([], []),
      search: () => Promise.reject(new Error('connection lost')),
    };
    const mailbox = imapMailbox({connect: () => Promise.resolve(session)});

    await expect(mailbox.messagesFrom(['a.com'], since)).rejects.toThrow('connection lost');
    expect(session.calls.at(-1)).toBe('close');
  });
});
