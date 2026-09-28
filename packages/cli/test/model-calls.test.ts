import {ModelError} from '@caton-ai/core';
import type {LanguageModel, ModelUsage} from '@caton-ai/core';
import {describe, expect, it} from 'vitest';

import {callRecord, recorded} from '../src/model-calls.ts';
import type {ModelCall} from '../src/model-calls.ts';

const USAGE: ModelUsage = {
  provider: 'anthropic',
  model: 'claude-opus-5',
  inputTokens: 10,
  cacheReadTokens: null,
  cacheWriteTokens: null,
  outputTokens: 5,
  reportedCostUsd: null,
};

const REQUEST = {instructions: 'i', content: 'c', schema: {}};
const who = {connection: 'amex', modelInstance: 'claude'};

function answering(result: () => Promise<{value: unknown; usage: ModelUsage}>): LanguageModel {
  return {name: 'anthropic/claude-opus-5', extract: result};
}

describe('recorded models', () => {
  it('report every call, including billed failures, and nothing for unbilled ones', async () => {
    const calls: ModelCall[] = [];
    const onCall = (call: ModelCall): number => calls.push(call);
    const ok = recorded(
      answering(() => Promise.resolve({value: 1, usage: USAGE})),
      who,
      onCall,
    );
    const billed = recorded(
      answering(() => Promise.reject(new ModelError('cut short', USAGE))),
      who,
      onCall,
    );
    const unbilled = recorded(
      answering(() => Promise.reject(new ModelError('offline'))),
      who,
      onCall,
    );

    expect(await ok.extract(REQUEST)).toEqual({value: 1, usage: USAGE});
    await expect(billed.extract(REQUEST)).rejects.toThrow('cut short');
    await expect(unbilled.extract(REQUEST)).rejects.toThrow('offline');
    expect(calls.map(call => call.outcome)).toEqual(['ok', 'failed']);
    expect(ok.name).toBe('anthropic/claude-opus-5');
  });
});

describe('recorded calls', () => {
  it('become ledger records with their cost', () => {
    const at = new Date('2026-09-28T10:00:00Z');
    const cost = {costNanoUsd: 7, costSource: 'estimated', pricesDate: 'bundled'} as const;

    expect(callRecord({...who, outcome: 'ok', usage: USAGE}, at, cost)).toEqual({
      at,
      ...who,
      provider: 'anthropic',
      model: 'claude-opus-5',
      outcome: 'ok',
      inputTokens: 10,
      cacheReadTokens: null,
      cacheWriteTokens: null,
      outputTokens: 5,
      ...cost,
    });
  });
});
