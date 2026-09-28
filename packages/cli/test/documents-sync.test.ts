import {money} from '@caton-ai/core';
import type {FinancialDocument, ModelUsage, TransactionSource} from '@caton-ai/core';
import {describe, expect, it} from 'vitest';

import {run} from '../src/app.ts';
import type {SourceFor} from '../src/connectors.ts';
import {stagedState} from '../src/state.ts';
import {testContext, workingSource} from './context.ts';

const RECEIPT: FinancialDocument = {
  id: 'email:<1@x>',
  kind: 'receipt',
  issuer: 'Example AI Inc',
  amount: money(16_000, 'EUR'),
  issuedOn: '2026-09-14',
  periodStart: null,
  periodEnd: null,
  dueOn: null,
  reference: null,
  account: null,
  verified: true,
  origin: 'email',
};

const USAGE: ModelUsage = {
  provider: 'anthropic',
  model: 'claude-opus-5',
  inputTokens: 10,
  cacheReadTokens: null,
  cacheWriteTokens: null,
  outputTokens: 5,
  reportedCostUsd: null,
};

/** A source that reads the receipt with its model and moves its state forward. */
const reading: SourceFor = (_instance, _lookup, hooks) => {
  hooks?.onModelCall?.({connection: 'mail', modelInstance: 'claude', outcome: 'ok', usage: USAGE});
  hooks?.state?.write({lastUid: 3});
  const source: TransactionSource = {
    ...workingSource,
    listDocuments: () => Promise.resolve([RECEIPT]),
  };
  return source;
};

describe('caton sync with documents', () => {
  it('records model calls, keeps state, and links documents to movements of any connection', async () => {
    const context = {...testContext({millennium: workingSource}), source: reading};

    expect(await run(['sync'], context)).toBe(0);
    expect(context.lines).toEqual(['✓ millennium: 1 account(s), 1 movement(s), 1 document(s)']);
    const ledger = context.ledger();
    expect(ledger.documents('2026-09-01')[0]?.transactionId).toBe('eb:hash-abc:1');
    expect(ledger.connectorState('millennium')).toEqual({lastUid: 3});
    expect(ledger.modelSpend('2026-09-01')).toMatchObject([
      {model: 'claude-opus-5', calls: 1, costNanoUsd: 1_500_000},
    ]);
  });
});

describe('stagedState', () => {
  it('reads the saved value until a new one is written, which is only staged', () => {
    const state = stagedState({lastUid: 1});

    expect([state.port.read(), state.staged()]).toEqual([{lastUid: 1}, undefined]);
    state.port.write({lastUid: 2});
    expect([state.port.read(), state.staged()]).toEqual([{lastUid: 2}, {value: {lastUid: 2}}]);
  });
});

/** A context whose prices failed to refresh, with two calls to a model of unknown price. */
function withSpend(): ReturnType<typeof testContext> {
  const base = testContext({});
  const prices = base.prices();
  const context = {
    ...base,
    prices: () => ({...prices, state: () => ({date: null, error: 'the price file answered 503'})}),
  };
  const call = {
    at: new Date('2026-09-20T10:00:00Z'),
    connection: 'mail',
    modelInstance: 'claude',
    provider: 'deepinfra',
    model: 'x',
    outcome: 'ok',
    inputTokens: 1,
    cacheReadTokens: null,
    cacheWriteTokens: null,
    outputTokens: 1,
  } as const;
  const ledger = context.ledger();
  ledger.recordModelCall({...call, costNanoUsd: null, costSource: 'unknown', pricesDate: null});
  ledger.recordModelCall({
    ...call,
    costNanoUsd: 2_000_000,
    costSource: 'estimated',
    pricesDate: 'bundled',
  });
  return context;
}

describe('caton status with model spend', () => {
  it('lists the month per model and fails on stale prices or unknown costs', async () => {
    const context = withSpend();

    expect(await run(['status'], context)).toBe(1);
    expect(context.lines).toContain(
      'Model prices: the ones bundled with Catón AI (not downloaded yet)',
    );
    expect(context.lines).toContain(
      '  deepinfra/x: 2 call(s), $0.0020 (1 estimated, 1 with unknown price)',
    );
    expect(context.errors).toContain(
      '✗ Model prices could not be refreshed: the price file answered 503',
    );
  });
});
