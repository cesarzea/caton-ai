import {formatMoney} from '@caton-ai/core';
import type {LedgerDocument} from '@caton-ai/ledger';

import type {CommandContext} from '../context.ts';
import {table} from '../output.ts';

const DAY_MS = 86_400_000;

function row(context: CommandContext, {document, transactionId}: LedgerDocument): string[] {
  return [
    document.issuedOn,
    document.kind,
    document.issuer,
    document.amount === null ? '—' : formatMoney(document.amount, context.locale),
    document.verified ? 'verified' : 'to review',
    transactionId === null ? '—' : 'linked',
  ];
}

/**
 * Documents of the last `days` (ADR 0016): what each is, whether it was verified or waits for
 * review, and whether it was linked to a movement.
 */
export function documentsCommand(context: CommandContext, days: number): number {
  const ledger = context.ledger();
  const from = new Date(context.now().getTime() - days * DAY_MS).toISOString().slice(0, 10);
  const documents = ledger.documents(from);
  ledger.close();
  if (documents.length === 0) {
    context.output.line(`No documents in the last ${String(days)} days.`);
    return 0;
  }
  const header = ['Date', 'Kind', 'Issuer', 'Amount', 'State', 'Movement'];
  table([header, ...documents.map(item => row(context, item))]).forEach(line => {
    context.output.line(line);
  });
  const toReview = documents.filter(item => !item.document.verified).length;
  if (toReview > 0) {
    context.output.error(
      `⚠ ${String(toReview)} document(s) to review: their fields are not all written in the email`,
    );
  }
  return 0;
}
