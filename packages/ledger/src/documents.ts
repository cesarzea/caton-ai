import type {DatabaseSync} from 'node:sqlite';

import {money} from '@caton-ai/core';
import type {DocumentKind, DocumentLink, FinancialDocument} from '@caton-ai/core';

export function upsertDocument(
  database: DatabaseSync,
  source: string,
  document: FinancialDocument,
  seenAt: string,
): void {
  database
    .prepare(
      `INSERT INTO documents (id, source, kind, issuer, amount_minor, currency, issued_on,
         period_start, period_end, due_on, reference, verified, origin, first_seen_at, last_seen_at)
       VALUES ($id, $source, $kind, $issuer, $amountMinor, $currency, $issuedOn, $periodStart,
         $periodEnd, $dueOn, $reference, $verified, $origin, $seenAt, $seenAt)
       ON CONFLICT (id) DO UPDATE SET kind = excluded.kind, issuer = excluded.issuer,
         amount_minor = excluded.amount_minor, currency = excluded.currency,
         issued_on = excluded.issued_on, period_start = excluded.period_start,
         period_end = excluded.period_end, due_on = excluded.due_on, reference = excluded.reference,
         verified = excluded.verified, origin = excluded.origin, last_seen_at = excluded.last_seen_at`,
    )
    .run({
      id: document.id,
      kind: document.kind,
      issuer: document.issuer,
      issuedOn: document.issuedOn,
      periodStart: document.periodStart,
      periodEnd: document.periodEnd,
      dueOn: document.dueOn,
      reference: document.reference,
      origin: document.origin,
      source,
      amountMinor: document.amount?.minorUnits ?? null,
      currency: document.amount?.currency ?? null,
      verified: document.verified ? 1 : 0,
      seenAt,
    });
}

const text = (value: unknown): string | null => (typeof value === 'string' ? value : null);

function documentOf(row: Record<string, unknown>): FinancialDocument {
  const currency = text(row['currency']);
  const minor = row['amount_minor'];
  return {
    id: String(row['id']),
    kind: String(row['kind']) as DocumentKind,
    issuer: String(row['issuer']),
    amount: currency === null || typeof minor !== 'number' ? null : money(minor, currency),
    issuedOn: String(row['issued_on']),
    periodStart: text(row['period_start']),
    periodEnd: text(row['period_end']),
    dueOn: text(row['due_on']),
    reference: text(row['reference']),
    verified: row['verified'] === 1,
    origin: String(row['origin']),
  };
}

/** Documents issued on or after `fromDate`, newest first. */
export function readDocuments(database: DatabaseSync, fromDate: string): FinancialDocument[] {
  return database
    .prepare('SELECT * FROM documents WHERE issued_on >= $fromDate ORDER BY issued_on DESC, id')
    .all({fromDate})
    .map(documentOf);
}

/** Documents not linked to any transaction yet. */
export function readUnlinkedDocuments(database: DatabaseSync): FinancialDocument[] {
  return database
    .prepare(
      `SELECT * FROM documents WHERE id NOT IN (SELECT document_id FROM document_links)
       ORDER BY issued_on DESC, id`,
    )
    .all()
    .map(documentOf);
}

export function insertLinks(
  database: DatabaseSync,
  links: readonly DocumentLink[],
  linkedAt: string,
): void {
  const insert = database.prepare(
    `INSERT OR IGNORE INTO document_links (document_id, transaction_id, linked_by, linked_at)
     VALUES ($documentId, $transactionId, 'auto', $linkedAt)`,
  );
  links.forEach(link => {
    insert.run({...link, linkedAt});
  });
}

/** The value an instance kept at its last saved sync, or null. */
export function readState(database: DatabaseSync, source: string): unknown {
  const row = database.prepare('SELECT value FROM connector_state WHERE source = $source').get({
    source,
  });
  return row === undefined ? null : (JSON.parse(String(row['value'])) as unknown);
}

export function writeState(
  database: DatabaseSync,
  source: string,
  value: unknown,
  updatedAt: string,
): void {
  database
    .prepare(
      `INSERT INTO connector_state (source, value, updated_at) VALUES ($source, $value, $updatedAt)
       ON CONFLICT (source) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    )
    .run({source, value: JSON.stringify(value), updatedAt});
}
