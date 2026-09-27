import {createHash} from 'node:crypto';

import PostalMime from 'postal-mime';
import type {Email} from 'postal-mime';

import type {MailMessage} from './message.ts';

/** The `Date` header, or when the server received the message if it is missing or invalid. */
function sentAt(email: Email, receivedAt: Date): Date {
  const sent = new Date(email.date ?? Number.NaN);
  return Number.isNaN(sent.getTime()) ? receivedAt : sent;
}

/** The `Message-ID`, or one derived from the content, so re-reading never duplicates. */
function messageIdOf(email: Email, source: Uint8Array): string {
  return email.messageId ?? `<${createHash('sha256').update(source).digest('hex')}@caton-ai>`;
}

/** Turns a raw RFC 5322 message into what recipes need. */
export async function parseMessage(source: Uint8Array, receivedAt: Date): Promise<MailMessage> {
  const email = await PostalMime.parse(source);
  return {
    messageId: messageIdOf(email, source),
    from: email.from?.address ?? '',
    subject: email.subject ?? '',
    date: sentAt(email, receivedAt),
    authenticationResults: email.headers
      .filter(header => header.key === 'authentication-results')
      .map(header => header.value.replaceAll(/\s+/gu, ' ').trim()),
    text: email.text ?? null,
    html: email.html ?? null,
  };
}
