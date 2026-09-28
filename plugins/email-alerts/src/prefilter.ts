import {mentionsAmount} from './amount.ts';
import {belongsTo, isAuthentic} from './authenticity.ts';
import type {MailMessage} from './message.ts';

/**
 * Words any of which a message must contain for the server to return it: money documents in
 * English, Spanish, French, German, Italian and Portuguese.
 */
export const SEARCH_WORDS = [
  'receipt',
  'invoice',
  'refund',
  'subscription',
  'renewal',
  'payment',
  'charge',
  'statement',
  'billing',
  'order',
  'factura',
  'recibo',
  'reembolso',
  'devolución',
  'suscripción',
  'renovación',
  'pago',
  'cargo',
  'extracto',
  'pedido',
  'facture',
  'reçu',
  'paiement',
  'rechnung',
  'quittung',
  'zahlung',
  'fattura',
  'ricevuta',
  'pagamento',
  'fatura',
] as const;

/** Domains of public mailbox providers: sharing one with the mailbox says nothing. */
const PUBLIC_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'yahoo.com',
  'icloud.com',
  'me.com',
  'proton.me',
  'protonmail.com',
  'gmx.com',
]);

export type Verdict =
  | {readonly read: true; readonly domain: string}
  | {readonly read: false; readonly reason: 'own' | 'unauthenticated' | 'no-amount'};

const domainOf = (address: string): string => (address.split('@').at(-1) ?? '').toLowerCase();

/** Mail the user sent, such as invoices to clients, is not a cost. */
function isOwn(from: string, ownAddress: string): boolean {
  const own = domainOf(ownAddress);
  return (
    from.toLowerCase() === ownAddress.toLowerCase() ||
    (!PUBLIC_DOMAINS.has(own) && belongsTo(domainOf(from), own))
  );
}

/**
 * Whether a message goes to the model: not the user's own, authenticated by the receiving
 * server for its sender's domain, and with an amount. Everything else stays on this computer.
 */
export function prefilter(
  message: MailMessage,
  text: string,
  options: {readonly ownAddress: string; readonly authServer: string},
): Verdict {
  const domain = domainOf(message.from);
  if (isOwn(message.from, options.ownAddress)) {
    return {read: false, reason: 'own'};
  }
  if (domain === '' || !isAuthentic(message, domain, options.authServer)) {
    return {read: false, reason: 'unauthenticated'};
  }
  return mentionsAmount(`${message.subject}\n${text}`)
    ? {read: true, domain}
    : {read: false, reason: 'no-amount'};
}
