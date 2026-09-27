import {ImapFlow} from 'imapflow';
import type {ImapFlowOptions} from 'imapflow';

import type {ImapSession} from './imap.ts';

export interface ImapServer {
  readonly host: string;
  readonly port: number;
  readonly user: string;
  readonly password: string;
}

/** The part of imapflow the session uses. */
export type ImapClient = Pick<
  ImapFlow,
  'connect' | 'list' | 'mailboxOpen' | 'search' | 'fetch' | 'logout' | 'on'
>;

async function* fetchRaw(
  client: ImapClient,
  uids: readonly number[],
): AsyncGenerator<{readonly source: Uint8Array; readonly receivedAt: Date}> {
  const query = {source: true, internalDate: true};
  for await (const message of client.fetch([...uids], query, {uid: true})) {
    if (message.source !== undefined) {
      yield {source: message.source, receivedAt: new Date(message.internalDate ?? 0)};
    }
  }
}

function sessionOver(client: ImapClient): ImapSession {
  return {
    folders: async () =>
      (await client.list()).map(({path, specialUse}) => ({path, specialUse: specialUse ?? null})),
    openReadOnly: async path => {
      await client.mailboxOpen(path, {readOnly: true});
    },
    search: async (sender, since) => {
      const found = await client.search({from: sender, since}, {uid: true});
      return Array.isArray(found) ? found : [];
    },
    fetch: uids => fetchRaw(client, uids),
    close: async () => {
      await client.logout();
    },
  };
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
  await client.connect();
  return sessionOver(client);
}
