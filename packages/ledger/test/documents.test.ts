import {money} from '@caton-ai/core';
import type {FinancialDocument} from '@caton-ai/core';
import {describe, expect, it} from 'vitest';

import {openLedger} from '../src/index.ts';
import {movement, snapshot} from './snapshot.ts';

const receipt: FinancialDocument = {
  id: 'email:<r1@apple.com>',
  kind: 'receipt',
  issuer: 'Apple',
  amount: money(999, 'EUR'),
  issuedOn: '2026-09-10',
  periodStart: '2026-09-10',
  periodEnd: '2026-10-09',
  dueOn: null,
  reference: 'MQ12345',
  verified: true,
  origin: 'email from no_reply@email.apple.com: Your receipt',
};

describe('documents', () => {
  it('are kept with the state of their source, and linked once', () => {
    const ledger = openLedger(':memory:');
    ledger.saveSync({...snapshot([movement()]), documents: [receipt], state: {value: {uid: 42}}});
    ledger.saveSync({...snapshot([movement()], '2026-09-27T16:00:00Z'), documents: [receipt]});

    expect(ledger.documents('2026-09-01')).toEqual([receipt]);
    expect(ledger.connectorState('millennium')).toEqual({uid: 42});
    expect(ledger.connectorState('other')).toBeNull();
    ledger.linkDocuments([{documentId: receipt.id, transactionId: movement().id}], new Date());
    ledger.linkDocuments([{documentId: receipt.id, transactionId: movement().id}], new Date());
    expect(ledger.unlinkedDocuments()).toEqual([]);
  });

  it('are saved from a partial read, whose run still counts as failed', () => {
    const ledger = openLedger(':memory:');
    const pending = {...receipt, amount: null, verified: false, dueOn: '2026-10-01'};
    ledger.saveSync({...snapshot([]), documents: [pending], error: 'the model stopped'});

    expect(ledger.unlinkedDocuments()).toEqual([pending]);
    expect(ledger.lastRun('millennium')).toMatchObject({
      outcome: 'failed',
      error: 'the model stopped',
    });
    expect(ledger.lastSuccessfulRun('millennium')).toBeNull();
  });
});
