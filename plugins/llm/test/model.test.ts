import {ModelError} from '@caton-ai/core';
import {APICallError, RetryError} from 'ai';
import {MockLanguageModelV4} from 'ai/test';
import {describe, expect, it} from 'vitest';

import {languageModel} from '../src/index.ts';

const REQUEST = {
  instructions: 'Find the charge.',
  content: 'You paid 12.00 EUR',
  schema: {type: 'object', properties: {amount: {type: 'string'}}, required: ['amount']},
};

const USAGE = {
  inputTokens: {total: 100, noCache: 60, cacheRead: 40, cacheWrite: undefined},
  outputTokens: {total: 20, text: 20, reasoning: undefined},
};

type Answer = Partial<Awaited<ReturnType<MockLanguageModelV4['doGenerate']>>>;

function answering(text: string, answer: Answer = {}): MockLanguageModelV4 {
  return new MockLanguageModelV4({
    doGenerate: () =>
      Promise.resolve({
        content: [{type: 'text', text}],
        finishReason: {unified: 'stop', raw: 'end_turn'},
        usage: USAGE,
        response: {modelId: 'claude-opus-5-served'},
        warnings: [],
        ...answer,
      }),
  });
}

const settings = {provider: 'anthropic', model: 'claude-opus-5'} as const;
const extract = (
  mock: MockLanguageModelV4,
  provider: 'anthropic' | 'ollama' | 'openrouter' = 'anthropic',
) => languageModel({...settings, provider}, mock).extract(REQUEST);

async function rejection(promise: Promise<unknown>): Promise<ModelError> {
  const error: unknown = await promise.catch((caught: unknown) => caught);
  if (!(error instanceof ModelError)) {
    throw new Error('expected a ModelError');
  }
  return error;
}

const EXPECTED_USAGE = {
  provider: 'anthropic',
  model: 'claude-opus-5-served',
  inputTokens: 100,
  cacheReadTokens: 40,
  cacheWriteTokens: null,
  outputTokens: 20,
  reportedCostUsd: null,
};

describe('languageModel answers', () => {
  it('return the answer with what the call consumed and who answered it', async () => {
    const mock = answering('{"amount":"12.00"}');

    expect(await extract(mock)).toEqual({value: {amount: '12.00'}, usage: EXPECTED_USAGE});
    expect(mock.doGenerateCalls[0]?.responseFormat).toMatchObject({
      type: 'json',
      schema: REQUEST.schema,
    });
    expect(languageModel(settings, mock).name).toBe('anthropic/claude-opus-5');
  });

  it('keep the cost the provider reports, and none for local models', async () => {
    const metadata = {openrouter: {usage: {cost: 0.0012}}};
    const openrouter = answering('{"amount":"1"}', {providerMetadata: metadata});

    expect((await extract(openrouter, 'openrouter')).usage.reportedCostUsd).toBeCloseTo(0.0012);
    expect((await extract(answering('{"amount":"1"}'), 'ollama')).usage.reportedCostUsd).toBe(0);
  });
});

describe('languageModel failed answers', () => {
  it('report refusals, cut answers and answers that are not JSON, with what they cost', async () => {
    const stopped = (text: string, unified: 'content-filter' | 'length', raw: string) =>
      rejection(extract(answering(text, {finishReason: {unified, raw}})));
    const failures = [
      await stopped('', 'content-filter', 'refusal'),
      await stopped('{"amo', 'length', 'max_tokens'),
      await rejection(extract(answering('not json'))),
    ];

    expect(failures.map(failure => failure.message)).toEqual([
      'The model declined to read this text',
      'The model answer was cut short',
      'The model answer was not valid JSON',
    ]);
    expect(failures.map(failure => failure.usage?.inputTokens)).toEqual([100, 100, 100]);
  });
});

const apiError = (statusCode?: number): APICallError =>
  new APICallError({
    message: 'You paid 12.00 EUR',
    url: 'https://api.anthropic.com/v1/messages',
    requestBodyValues: {},
    isRetryable: false,
    ...(statusCode === undefined ? {} : {statusCode}),
  });

describe('languageModel API failures', () => {
  it('are described without the text sent or the answer', async () => {
    const failing = (error: Error) =>
      new MockLanguageModelV4({doGenerate: () => Promise.reject(error)});
    const errors = [apiError(429)];
    const cases: [Error, string][] = [
      [apiError(401), 'The anthropic API refused the key'],
      [
        new RetryError({message: 'x', reason: 'maxRetriesExceeded', errors}),
        'The anthropic API is limiting requests; try again later',
      ],
      [apiError(500), 'The anthropic API answered 500'],
      [apiError(), 'The anthropic API could not be reached'],
      [new Error('You paid 12.00 EUR'), 'The anthropic request failed'],
    ];
    for (const [error, message] of cases) {
      const failed = await rejection(extract(failing(error)));
      expect([failed.message, failed.usage]).toEqual([message, null]);
    }
  });
});
