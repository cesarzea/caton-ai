import type {Connector} from '@caton-ai/core';
import * as z from 'zod';

import {imapMailbox} from './imap.ts';
import {connectImapFlow} from './imapflow-session.ts';
import {loadRecipes} from './library.ts';
import type {Recipe} from './recipe.ts';
import {createEmailAlertsSource} from './source.ts';
import {VARIABLES} from './variables.ts';

const variablesSchema = z.object({
  'imap-host': z.string().min(1),
  'imap-port': z.number().int().min(1).max(65_535),
  'imap-user': z.string().min(1),
  'imap-password': z.string().min(1),
  'imap-folder': z.string().min(1).optional(),
  'auth-server': z.string().min(1),
  recipes: z.array(z.string()).min(1),
});

function selected(library: readonly Recipe[], ids: readonly string[]): Recipe[] {
  return ids.map(id => {
    const recipe = library.find(candidate => candidate.id === id);
    if (recipe === undefined) {
      const known = library.map(candidate => candidate.id).join(', ') || 'none';
      throw new TypeError(`Unknown email recipe "${id}"; the library has: ${known}`);
    }
    return recipe;
  });
}

/** Card alerts, statements and receipts received by email, read-only over IMAP with recipes. */
export const emailAlertsConnector: Connector = {
  manifest: {
    id: 'email-alerts',
    version: '0.0.0',
    title: 'Email alerts',
    description: 'Card alerts and receipts received by email, read-only over IMAP.',
    network: ['variable:imap-host'],
    variables: VARIABLES,
  },
  createSource: (variables, environment) => {
    const parsed = variablesSchema.safeParse(variables);
    if (!parsed.success) {
      const wrong = [...new Set(parsed.error.issues.map(issue => String(issue.path[0])))];
      throw new TypeError(`Invalid email alerts variables: ${wrong.join(', ')}`);
    }
    const {
      'imap-host': host,
      'imap-port': port,
      'imap-user': user,
      'imap-password': password,
    } = parsed.data;
    return createEmailAlertsSource({
      authServer: parsed.data['auth-server'],
      recipes: selected(loadRecipes(environment.pluginDirectory), parsed.data.recipes),
      mailbox: imapMailbox({
        folder: parsed.data['imap-folder'],
        connect: () => connectImapFlow({host, port, user, password}),
      }),
    });
  },
};
