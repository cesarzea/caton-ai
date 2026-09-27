import type {Connector} from '@caton-ai/core';
import * as z from 'zod';

import {createEnableBankingSource} from './source.ts';

const pluginSettingsSchema = z.object({
  appId: z.string().min(1),
  /** Secret reference to the application's RSA private key, e.g. `file:~/.config/caton-ai/app.pem`. */
  privateKey: z.string().min(1),
});

const connectionSettingsSchema = z.looseObject({
  /** Authorised PSD2 session (consent) giving access to the linked accounts. */
  sessionId: z.string().min(1),
});

function parsed<T>(schema: z.ZodType<T>, value: unknown, what: string): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new TypeError(`Invalid Enable Banking ${what}: ${z.prettifyError(result.error)}`);
  }
  return result.data;
}

/** Enable Banking (PSD2) connector for European banks. */
export const enableBankingConnector: Connector = {
  manifest: {
    id: 'enable-banking',
    version: '0.0.0',
    description: 'European bank accounts through Enable Banking (PSD2, read-only).',
    network: ['api.enablebanking.com'],
  },
  createSource: (pluginSettings, connectionSettings, environment) => {
    const plugin = parsed(pluginSettingsSchema, pluginSettings, 'plugin settings');
    const connection = parsed(connectionSettingsSchema, connectionSettings, 'connection');
    return createEnableBankingSource({
      appId: plugin.appId,
      privateKeyPem: environment.secret(plugin.privateKey),
      sessionId: connection.sessionId,
    });
  },
};
