import type {FinancialDocument, LanguageModel, Transaction} from '@caton-ai/core';

import {contentOf, extractFrom} from './extraction.ts';
import type {Mailbox, MailboxCursor, MailboxMessage} from './imap.ts';
import {itemsOf} from './items.ts';
import {prefilter, SEARCH_WORDS} from './prefilter.ts';
import {bodyText} from './text.ts';

export interface ReadOptions {
  readonly mailbox: Mailbox;
  readonly model: LanguageModel | undefined;
  readonly cursor: MailboxCursor | null;
  /** Where the first read starts, while there is no cursor. */
  readonly since: Date;
  readonly ownAddress: string;
  readonly authServer: string;
  readonly cardDomains: readonly string[];
  /** Emails sent to the model in one sync at most; the rest wait for the next one. */
  readonly maxPerSync: number;
}

export interface ReadResult {
  readonly documents: FinancialDocument[];
  readonly transactions: Transaction[];
  /** How far the mailbox was read without a gap, or null when nothing needs remembering. */
  readonly cursor: MailboxCursor | null;
  /** Why the read stopped early; what was read before is still valid. */
  readonly error: string | null;
}

type Candidate = MailboxMessage & {readonly text: string; readonly domain: string | null};

function candidatesOf(messages: readonly MailboxMessage[], options: ReadOptions): Candidate[] {
  return messages.map(item => {
    const text = bodyText(item.message);
    const verdict = prefilter(item.message, text, options);
    return {...item, text, domain: verdict.read ? verdict.domain : null};
  });
}

/** Without a model nothing leaves the computer: the sync fails saying what one would read. */
function noModel(candidates: readonly Candidate[], since: Date): Error {
  const counts = new Map<string, number>();
  candidates.forEach(({domain}) => {
    if (domain !== null) {
      counts.set(domain, (counts.get(domain) ?? 0) + 1);
    }
  });
  const total = [...counts.values()].reduce((sum, count) => sum + count, 0);
  const top = [...counts]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([domain, count]) => `${domain} ${String(count)}`)
    .join(', ');
  const senders = top === '' ? '' : ` (${top})`;
  const day = since.toISOString().slice(0, 10);
  return new Error(
    'No language model is chosen for this connection, so no email was sent to one. ' +
      `${String(total)} email(s) from ${String(counts.size)} sender(s) since ${day} would be read${senders}. ` +
      'Choose a model in this connection to read them.',
  );
}

type Found = Pick<ReadResult, 'documents' | 'transactions'>;

/** Sends one email to the model and keeps what it yields; the failure, if it failed. */
async function readOne(
  model: LanguageModel,
  {message, text, domain}: Candidate & {readonly domain: string},
  options: ReadOptions,
  found: Found,
): Promise<string | null> {
  try {
    const extracted = await extractFrom(model, contentOf(message, text));
    const context = {message, text, senderDomain: domain, cardDomains: options.cardDomains};
    const items = itemsOf(extracted, context);
    if (items !== null) {
      found.documents.push(items.document);
      found.transactions.push(...(items.transaction === null ? [] : [items.transaction]));
    }
    return null;
  } catch (caught) {
    const reason = caught instanceof Error ? caught.message : String(caught);
    return `the model could not read an email from ${domain}: ${reason}`;
  }
}

/** Walks the emails in UID order; `lastUid` is the last one handled without a gap. */
async function walk(
  model: LanguageModel,
  candidates: readonly Candidate[],
  options: ReadOptions,
  startUid: number,
): Promise<Found & {readonly lastUid: number; readonly error: string | null}> {
  const found: Found = {documents: [], transactions: []};
  let lastUid = startUid;
  let sent = 0;
  for (const candidate of candidates) {
    const {domain} = candidate;
    if (domain !== null) {
      if (sent === options.maxPerSync) {
        break;
      }
      sent += 1;
      const error = await readOne(model, {...candidate, domain}, options, found);
      if (error !== null) {
        return {...found, lastUid, error};
      }
    }
    lastUid = candidate.uid;
  }
  return {...found, lastUid, error: null};
}

/**
 * Reads the new emails in ascending UID and sends the ones that pass the local filter to the
 * model. The cursor stops at the last email handled without a gap, so a failure or the per-sync
 * cap leaves the rest for the next sync, and no email is ever sent twice.
 */
export async function readMailbox(options: ReadOptions): Promise<ReadResult> {
  const {cursor, since, model} = options;
  const {uidValidity, messages} = await options.mailbox.newMessages(cursor, since, SEARCH_WORDS);
  const candidates = candidatesOf(messages, options);
  if (model === undefined) {
    throw noModel(candidates, since);
  }
  const start = cursor?.uidValidity === uidValidity ? cursor.lastUid : 0;
  const {lastUid, ...read} = await walk(model, candidates, options, start);
  return {...read, cursor: lastUid === 0 ? null : {uidValidity, lastUid}};
}
