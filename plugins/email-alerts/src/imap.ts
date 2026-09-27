import type {MailMessage} from './message.ts';
import {parseMessage} from './mime.ts';
import type {Mailbox} from './source.ts';

/** The few IMAP operations the connector needs, so that the protocol client can be replaced. */
export interface ImapSession {
  /** Folders with their special use, such as `\All` for Gmail's "All Mail". */
  folders(): Promise<readonly {readonly path: string; readonly specialUse: string | null}[]>;
  /** Opens a folder read-only (IMAP EXAMINE): nothing in it can change. */
  openReadOnly(path: string): Promise<void>;
  /** UIDs of messages whose `From` contains `sender`, received on or after `since`. */
  search(sender: string, since: Date): Promise<readonly number[]>;
  /** Raw messages, fetched without setting any flag (BODY.PEEK). */
  fetch(
    uids: readonly number[],
  ): AsyncIterable<{readonly source: Uint8Array; readonly receivedAt: Date}>;
  close(): Promise<void>;
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

async function readFrom(
  session: ImapSession,
  domains: readonly string[],
  since: Date,
): Promise<MailMessage[]> {
  const uids = new Set<number>();
  for (const domain of domains) {
    (await session.search(domain, since)).forEach(uid => uids.add(uid));
  }
  const messages: MailMessage[] = [];
  if (uids.size > 0) {
    for await (const {source, receivedAt} of session.fetch([...uids].sort((a, b) => a - b))) {
      messages.push(await parseMessage(source, receivedAt));
    }
  }
  return messages;
}

/** A mailbox read over IMAP, strictly read-only: nothing is marked as read, moved or deleted. */
export function imapMailbox(options: ImapMailboxOptions): Mailbox {
  return {
    messagesFrom: async (domains, since) => {
      const session = await options.connect();
      try {
        await session.openReadOnly(await folderToRead(session, options.folder));
        return await readFrom(session, domains, since);
      } finally {
        await session.close();
      }
    },
  };
}
