import {ImapFlow} from 'imapflow';
import type {ImapFlowOptions, SearchObject} from 'imapflow';

import type {ImapSession, SearchQuery} from './imap.ts';

export interface ImapServer {
  readonly host: string;
  readonly port: number;
  readonly user: string;
  readonly password: string;
}

/** The part of imapflow the session uses. */
export type ImapClient = Pick<
  ImapFlow,
  'connect' | 'list' | 'mailboxOpen' | 'search' | 'fetch' | 'logout' | 'on' | 'capabilities'
>;

async function* fetchRaw(
  client: ImapClient,
  uids: readonly number[],
): AsyncGenerator<{readonly uid: number; readonly source: Uint8Array; readonly receivedAt: Date}> {
  const query = {uid: true, source: true, internalDate: true};
  for await (const message of client.fetch([...uids], query, {uid: true})) {
    if (message.source !== undefined) {
      yield {
        uid: message.uid,
        source: message.source,
        receivedAt: new Date(message.internalDate ?? 0),
      };
    }
  }
}

/**
 * The IMAP search: any of the words in the text, after a UID or since a date, from a sender. A
 * server that classifies mail (Gmail's `X-GM-EXT-1`) also leaves out promotions and social mail.
 */
function searchObject(
  client: ImapClient,
  {since, afterUid, words, from}: SearchQuery,
): SearchObject {
  return {
    or: words.map(word => ({text: word})),
    ...(afterUid === undefined ? {} : {uid: `${String(afterUid + 1)}:*`}),
    ...(since === undefined ? {} : {since}),
    ...(from === undefined ? {} : {from}),
    ...(client.capabilities.has('X-GM-EXT-1')
      ? {gmraw: '-category:promotions -category:social'}
      : {}),
  };
}

function sessionOver(client: ImapClient): ImapSession {
  return {
    folders: async () =>
      (await client.list()).map(({path, specialUse}) => ({path, specialUse: specialUse ?? null})),
    openReadOnly: async path => {
      const opened = await client.mailboxOpen(path, {readOnly: true});
      return {uidValidity: Number(opened.uidValidity)};
    },
    search: async query => {
      try {
        const found = await client.search(searchObject(client, query), {uid: true});
        return Array.isArray(found) ? found : [];
      } catch (error) {
        throw new Error(`the IMAP search failed: ${serverSaid(error)}`, {cause: error});
      }
    },
    fetch: uids => fetchRaw(client, uids),
    close: async () => {
      await client.logout();
    },
  };
}

/** What the server said, such as "Invalid credentials": imapflow's own message is generic. */
function serverSaid(error: unknown): string {
  const response = (error as {responseText?: unknown} | null)?.responseText;
  if (typeof response === 'string' && response !== '') {
    return response;
  }
  return error instanceof Error ? error.message : String(error);
}

/** Opens an `ImapSession` with imapflow over TLS, with its logging off: it would print addresses. */
export async function connectImapFlow(
  server: ImapServer,
  create: (options: ImapFlowOptions) => ImapClient = options => new ImapFlow(options),
): Promise<ImapSession> {
  const client = create({
    host: server.host,
    port: server.port,
    secure: true,
    auth: {user: server.user, pass: server.password},
    logger: false,
  });
  client.on('error', () => {
    // Connection errors also reject the pending command, which reports them.
  });
  try {
    await client.connect();
  } catch (error) {
    throw new Error(`the IMAP server refused the connection: ${serverSaid(error)}`, {cause: error});
  }
  return sessionOver(client);
}
