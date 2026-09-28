import {describe, expect, it} from 'vitest';

import {openLedger} from '../src/index.ts';
import type {ModelCallRecord} from '../src/index.ts';

const call = (overrides: Partial<ModelCallRecord>): ModelCallRecord => ({
  at: new Date('2026-09-28T10:00:00Z'),
  connection: 'amex',
  modelInstance: 'claude',
  provider: 'anthropic',
  model: 'claude-opus-5',
  outcome: 'ok',
  inputTokens: 1000,
  cacheReadTokens: null,
  cacheWriteTokens: null,
  outputTokens: 100,
  costNanoUsd: 7_500_000,
  costSource: 'estimated',
  pricesDate: 'bundled',
  ...overrides,
});

describe('language model calls', () => {
  it('add up exactly per model, counting estimated and unpriced calls', () => {
    const ledger = openLedger(':memory:');
    ledger.recordModelCall(call({}));
    ledger.recordModelCall(
      call({outcome: 'failed', costNanoUsd: 2_500_000, costSource: 'reported'}),
    );
    ledger.recordModelCall(call({costNanoUsd: null, costSource: 'unknown'}));
    ledger.recordModelCall(
      call({provider: 'ollama', model: 'qwen3', costNanoUsd: 0, costSource: 'reported'}),
    );
    ledger.recordModelCall(call({at: new Date('2026-08-31T23:00:00Z')}));

    expect(ledger.modelSpend('2026-09-01T00:00:00.000Z')).toEqual([
      {
        provider: 'anthropic',
        model: 'claude-opus-5',
        calls: 3,
        costNanoUsd: 10_000_000,
        unpriced: 1,
        estimated: 1,
      },
      {provider: 'ollama', model: 'qwen3', calls: 1, costNanoUsd: 0, unpriced: 0, estimated: 0},
    ]);
  });
});
