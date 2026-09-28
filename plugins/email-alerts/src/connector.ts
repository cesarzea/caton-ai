import type {Connector} from '@caton-ai/core';
import * as z from 'zod';

import {imapMailbox} from './imap.ts';
import {connectImapFlow} from './imapflow-session.ts';
import {createEmailSource} from './source.ts';
import {VARIABLES} from './variables.ts';

const variablesSchema = z.object({
  'imap-host': z.string().min(1),
  'imap-port': z.number().int().min(1).max(65_535),
  'imap-user': z.string().min(1),
  'imap-password': z.string().min(1),
  'imap-folder': z.string().min(1).optional(),
  'auth-server': z.string().min(1),
  'backfill-days': z.number().int().min(1).max(3_650),
  'max-per-sync': z.number().int().min(1).max(10_000),
  senders: z.array(z.string().min(1)).default([]),
});

const DAY_MS = 86_400_000;

/** Any email about money, read-only over IMAP and understood by the chosen model (ADR 0020). */
export const emailAlertsConnector: Connector = {
  manifest: {
    id: 'email-alerts',
    version: '0.0.0',
    title: 'Email',
    description:
      'Any email about money, such as receipts, invoices, renewals, cancellations, statements and card alerts, read-only over IMAP.',
    network: ['variable:imap-host'],
    variables: VARIABLES,
  },
  createSource: (variables, environment) => {
    const parsed = variablesSchema.safeParse(variables);
    if (!parsed.success) {
      const wrong = [...new Set(parsed.error.issues.map(issue => String(issue.path[0])))];
      throw new TypeError(`Invalid email variables: ${wrong.join(', ')}`);
    }
    const {data} = parsed;
    const {
      'imap-host': host,
      'imap-port': port,
      'imap-user': user,
      'imap-password': password,
    } = data;
    return createEmailSource({
      mailbox: imapMailbox({
        folder: data['imap-folder'],
        connect: () => connectImapFlow({host, port, user, password}),
      }),
      model: environment.model,
      state: environment.state,
      since: new Date(Date.now() - data['backfill-days'] * DAY_MS),
      ownAddress: user,
      authServer: data['auth-server'],
      senders: data.senders.map(domain => domain.toLowerCase().replace(/^@/u, '')),
      maxPerSync: data['max-per-sync'],
    });
  },
};
