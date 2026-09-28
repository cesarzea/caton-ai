import {PartialReadError} from '@caton-ai/core';
import type {ConnectorState, TransactionSource} from '@caton-ai/core';
import * as z from 'zod';

import type {MailboxCursor} from './imap.ts';
import {readMailbox} from './reader.ts';
import type {ReadOptions, ReadResult} from './reader.ts';

const SOURCE_NAME = 'email-alerts';

const cursorSchema = z.object({
  uidValidity: z.number().int().positive(),
  lastUid: z.number().int().positive(),
});

export interface EmailSourceOptions extends Omit<ReadOptions, 'cursor'> {
  readonly state: ConnectorState;
}

/**
 * Documents read from email: never movements, which only accounts report. The mailbox is read
 * once per sync; the cursor is written for the host to save with what was read.
 */
export function createEmailSource(options: EmailSourceOptions): TransactionSource {
  const saved = cursorSchema.safeParse(options.state.read());
  const cursor: MailboxCursor | null = saved.success ? saved.data : null;
  let reading: Promise<ReadResult> | undefined;
  const read = (): Promise<ReadResult> =>
    (reading ??= readMailbox({...options, cursor}).then(result => {
      if (result.cursor !== null) {
        options.state.write(result.cursor);
      }
      return result;
    }));
  return {
    name: SOURCE_NAME,
    listAccounts: () => Promise.resolve([]),
    listTransactions: () => Promise.resolve([]),
    listBalances: () => Promise.resolve([]),
    listDocuments: async () => {
      const result = await read();
      if (result.error !== null) {
        throw new PartialReadError(result.error, result.documents);
      }
      return result.documents;
    },
  };
}
