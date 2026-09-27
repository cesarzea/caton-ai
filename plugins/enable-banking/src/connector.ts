import type {Connector} from '@caton-ai/core';
import * as z from 'zod';

import {createEnableBankingSource} from './source.ts';
import {VARIABLES} from './variables.ts';

const variablesSchema = z.object({
  'app-id': z.string().min(1),
  'private-key': z.string().includes('PRIVATE KEY'),
  'session-id': z.string().min(1),
});

/** Enable Banking (PSD2) connector for European banks. */
export const enableBankingConnector: Connector = {
  manifest: {
    id: 'enable-banking',
    version: '0.0.0',
    title: 'Enable Banking',
    description: 'European bank accounts through Enable Banking (PSD2, read-only).',
    network: ['api.enablebanking.com'],
    variables: VARIABLES,
  },
  createSource: variables => {
    const parsed = variablesSchema.safeParse(variables);
    if (!parsed.success) {
      // Only the names of the wrong variables: never their values, which include the key.
      const wrong = [...new Set(parsed.error.issues.map(issue => String(issue.path[0])))];
      throw new TypeError(`Invalid Enable Banking variables: ${wrong.join(', ')}`);
    }
    return createEnableBankingSource({
      appId: parsed.data['app-id'],
      privateKeyPem: parsed.data['private-key'],
      sessionId: parsed.data['session-id'],
    });
  },
};
