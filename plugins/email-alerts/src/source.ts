import {currencyCode, PartialReadError} from '@caton-ai/core';
import type {Account, ConnectorState, TransactionSource} from '@caton-ai/core';
import * as z from 'zod';

import type {MailboxCursor} from './imap.ts';
import {cardAccountId} from './items.ts';
import {readMailbox} from './reader.ts';
import type {ReadOptions, ReadResult} from './reader.ts';

const SOURCE_NAME = 'email-alerts';

const cursorSchema = z.object({
  uidValidity: z.number().int().positive(),
  lastUid: z.number().int().positive(),
});

export interface EmailSourceOptions extends Omit<ReadOptions, 'cursor'> {
  readonly state: ConnectorState;
  /** Currency of the email-only cards. */
  readonly cardCurrency: string;
}

function cardAccount(domain: string, currency: string): Account {
  const id = cardAccountId(domain);
  return {
    id,
    sourceRef: domain,
    source: SOURCE_NAME,
    institution: domain,
    name: `Card alerts from ${domain}`,
    currency: currencyCode(currency),
  };
}

/**
 * Documents read from email, and movements of the cards that only email reports. The mailbox is
 * read once per sync; the cursor is written for the host to save with what was read.
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
  const accounts = options.cardDomains.map(domain => cardAccount(domain, options.cardCurrency));
  return {
    name: SOURCE_NAME,
    listAccounts: () => Promise.resolve(accounts),
    listTransactions: async account =>
      (await read()).transactions.filter(transaction => transaction.accountId === account.id),
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
