import type {ConnectorState, LanguageModel} from '@caton-ai/core';

import type {Mailbox, MailboxCursor, MailMessage} from '../src/index.ts';

// Synthetic data only: the repository is public.

export const AUTH_SERVER = 'mx.example-mail.com';

export const PASSED = `${AUTH_SERVER}; dkim=pass header.i=@alerts.example-card.com header.s=s1; spf=pass (sender ok) smtp.mailfrom=alerts.example-card.com; dmarc=pass (p=REJECT sp=REJECT) header.from=example-card.com`;

export function message(overrides: Partial<MailMessage> = {}): MailMessage {
  return {
    messageId: '<alert-1@alerts.example-card.com>',
    from: 'no-reply@alerts.example-card.com',
    subject: 'Cargo en tu Tarjeta',
    date: new Date('2026-09-20T10:00:00Z'),
    authenticationResults: [PASSED],
    text: 'Hola,\nImporte: 1.234,56 €\nEstablecimiento: EXAMPLE STORE MADRID\nFecha: 19/09/2026\n',
    html: null,
    ...overrides,
  };
}

/** What a model answers for the charge in `message()`. */
export const CHARGE = {
  kind: 'charge',
  issuer: 'EXAMPLE STORE MADRID',
  amount_written: '1.234,56 €',
  currency: 'EUR',
  date_written: '19/09/2026',
  date: '2026-09-19',
  period_start: null,
  period_end: null,
  due_date: null,
  reference: null,
  account: null,
};

const USAGE = {
  provider: 'fake',
  model: 'fake',
  inputTokens: 1,
  cacheReadTokens: null,
  cacheWriteTokens: null,
  outputTokens: 1,
  reportedCostUsd: 0,
};

/** A model answering each call in turn; an Error answer fails that call. */
export function fakeModel(answers: readonly unknown[]): LanguageModel & {readonly seen: string[]} {
  const seen: string[] = [];
  return {
    name: 'fake',
    seen,
    extract: request => {
      const answer = answers[seen.length];
      seen.push(request.content);
      return answer instanceof Error
        ? Promise.reject(answer)
        : Promise.resolve({value: answer, usage: USAGE});
    },
  };
}

/** A mailbox holding `messages` under UIDs 1, 2, 3… of UIDVALIDITY 9. */
export function fakeMailbox(
  messages: readonly MailMessage[],
): Mailbox & {readonly asked: (MailboxCursor | null)[]} {
  const asked: (MailboxCursor | null)[] = [];
  return {
    asked,
    newMessages: cursor => {
      asked.push(cursor);
      const after = cursor?.uidValidity === 9 ? cursor.lastUid : 0;
      const all = messages.map((item, index) => ({uid: index + 1, message: item}));
      return Promise.resolve({uidValidity: 9, messages: all.filter(item => item.uid > after)});
    },
  };
}

export function memoryState(initial: unknown = null): ConnectorState & {value: unknown} {
  const state = {
    value: initial,
    read: () => state.value,
    write: (value: unknown) => {
      state.value = value;
    },
  };
  return state;
}
