import type {Connector} from '@caton-ai/core';
import * as z from 'zod';

import {imapMailbox} from './imap.ts';
import {connectImapFlow} from './imapflow-session.ts';
import {recipeSchema} from './recipe.ts';
import type {Recipe} from './recipe.ts';
import {createEmailAlertsSource} from './source.ts';

const pluginSettingsSchema = z.object({
  /** The recipe library shared by every mailbox. */
  recipes: z
    .array(recipeSchema)
    .refine(recipes => new Set(recipes.map(({id}) => id)).size === recipes.length, {
      message: 'Recipe ids must be unique',
    }),
});

const connectionSettingsSchema = z.looseObject({
  imap: z.object({
    host: z.string().min(1),
    port: z.number().int().min(1).max(65_535).default(993),
    user: z.string().min(1),
    /** Secret reference to an app password, such as `keychain:caton-ai/user@example.com`. */
    password: z.string().min(1),
    folder: z.string().min(1).optional(),
  }),
  /** Receiving server whose `Authentication-Results` are trusted, e.g. `mx.google.com`. */
  authServer: z.string().min(1),
  /** Ids of the library recipes this mailbox uses. */
  recipes: z.array(z.string()).min(1),
});

function parsed<T>(schema: z.ZodType<T>, value: unknown, what: string): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new TypeError(`Invalid email alerts ${what}: ${z.prettifyError(result.error)}`);
  }
  return result.data;
}

function selected(library: readonly Recipe[], ids: readonly string[]): Recipe[] {
  return ids.map(id => {
    const recipe = library.find(candidate => candidate.id === id);
    if (recipe === undefined) {
      throw new TypeError(
        `Unknown email recipe "${id}"; the library has: ${library.map(r => r.id).join(', ')}`,
      );
    }
    return recipe;
  });
}

/** Card alerts, statements and receipts received by email, read over IMAP with recipes. */
export const emailAlertsConnector: Connector = {
  manifest: {
    id: 'email-alerts',
    version: '0.0.0',
    description: 'Card alerts and receipts received by email, read-only over IMAP.',
    network: ['connection:imap.host'],
  },
  createSource: (pluginSettings, connectionSettings, environment) => {
    const {recipes: library} = parsed(pluginSettingsSchema, pluginSettings, 'plugin settings');
    const connection = parsed(connectionSettingsSchema, connectionSettings, 'connection');
    const {host, port, user, folder} = connection.imap;
    const password = environment.secret(connection.imap.password);
    return createEmailAlertsSource({
      authServer: connection.authServer,
      recipes: selected(library, connection.recipes),
      mailbox: imapMailbox({folder, connect: () => connectImapFlow({host, port, user, password})}),
    });
  },
};
