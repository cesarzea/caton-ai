import {recipeSchema} from '../src/index.ts';
import type {MailMessage, Recipe} from '../src/index.ts';

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

export function recipe(overrides: Record<string, unknown> = {}): Recipe {
  return recipeSchema.parse({
    id: 'example-card-charge',
    senderDomain: 'example-card.com',
    subject: 'cargo',
    account: {institution: 'Example Card', name: 'Gold', currency: 'EUR'},
    numberFormat: 'comma-decimal',
    dateFormat: 'DD/MM/YYYY',
    fields: {
      amount: 'Importe:\\s*([\\d.,]+)',
      merchant: 'Establecimiento:\\s*(.+)',
      date: 'Fecha:\\s*(\\S+)',
    },
    partialCoverage: 'charges below 50 EUR',
    ...overrides,
  });
}
