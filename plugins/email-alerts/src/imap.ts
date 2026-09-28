import type {MailMessage} from './message.ts';
import {parseMessage} from './mime.ts';

/** How far a mailbox folder has been read: IMAP UIDs only compare within one UIDVALIDITY. */
export interface MailboxCursor {
  readonly uidValidity: number;
  readonly lastUid: number;
}

export interface SearchQuery {
  /** Messages received on or after this date, when there is no usable cursor. */
  readonly since?: Date;
  /** Messages after this UID. */
  readonly afterUid?: number;
  /** Words any of which the message text must contain, searched by the server. */
  readonly words: readonly string[];
}

/** The few IMAP operations the connector needs, so that the protocol client can be replaced. */
export interface ImapSession {
  /** Folders with their special use, such as `\All` for Gmail's "All Mail". */
  folders(): Promise<readonly {readonly path: string; readonly specialUse: string | null}[]>;
  /** Opens a folder read-only (IMAP EXAMINE): nothing in it can change. */
  openReadOnly(path: string): Promise<{readonly uidValidity: number}>;
  search(query: SearchQuery): Promise<readonly number[]>;
  /** Raw messages, fetched without setting any flag (BODY.PEEK). */
  fetch(
    uids: readonly number[],
  ): AsyncIterable<{readonly uid: number; readonly source: Uint8Array; readonly receivedAt: Date}>;
  close(): Promise<void>;
}

export interface MailboxMessage {
  readonly uid: number;
  readonly message: MailMessage;
}

/** Where messages come from: IMAP in production, a fake in tests. */
export interface Mailbox {
  /**
   * The messages after `cursor` whose text contains one of `words`, in ascending UID, or those
   * received since `since` when the cursor is missing or belongs to another UIDVALIDITY.
   */
  newMessages(
    cursor: MailboxCursor | null,
    since: Date,
    words: readonly string[],
  ): Promise<{readonly uidValidity: number; readonly messages: readonly MailboxMessage[]}>;
}

export interface ImapMailboxOptions {
  readonly connect: () => Promise<ImapSession>;
  /** Folder to read; the one holding all mail (`\All`) when absent, else the inbox. */
  readonly folder?: string | undefined;
}

async function folderToRead(session: ImapSession, folder: string | undefined): Promise<string> {
  if (folder !== undefined) {
    return folder;
  }
  const all = (await session.folders()).find(candidate => candidate.specialUse === '\\All');
  return all?.path ?? 'INBOX';
}

async function fetchAll(session: ImapSession, uids: readonly number[]): Promise<MailboxMessage[]> {
  const messages: MailboxMessage[] = [];
  for await (const {uid, source, receivedAt} of session.fetch(uids)) {
    messages.push({uid, message: await parseMessage(source, receivedAt)});
  }
  return messages.sort((a, b) => a.uid - b.uid);
}

/** A mailbox read over IMAP, strictly read-only: nothing is marked as read, moved or deleted. */
export function imapMailbox(options: ImapMailboxOptions): Mailbox {
  return {
    newMessages: async (cursor, since, words) => {
      const session = await options.connect();
      try {
        const {uidValidity} = await session.openReadOnly(
          await folderToRead(session, options.folder),
        );
        const after = cursor?.uidValidity === uidValidity ? cursor.lastUid : null;
        const found = await session.search(
          after === null ? {since, words} : {afterUid: after, words},
        );
        // `UID n:*` also returns the last message when nothing is newer.
        const uids = found.filter(uid => after === null || uid > after).sort((a, b) => a - b);
        return {uidValidity, messages: uids.length === 0 ? [] : await fetchAll(session, uids)};
      } finally {
        await session.close();
      }
    },
  };
}
