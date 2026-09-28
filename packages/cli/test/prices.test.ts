import {mkdtempSync, readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import type {ModelUsage} from '@caton-ai/core';
import {findProvider} from '@pydantic/genai-prices';
import type {Provider} from '@pydantic/genai-prices';
import {describe, expect, it} from 'vitest';

import {priceBook} from '../src/prices.ts';

const IDS = [
  'anthropic',
  'openai',
  'google',
  'mistral',
  'deepseek',
  'groq',
  'cohere',
  'x-ai',
  'cerebras',
  'perplexity',
  'fireworks',
];
const CURRENT = IDS.map(id => findProvider({providerId: id})).filter(
  (provider): provider is Provider => provider !== undefined,
);

const usage = (overrides: Partial<ModelUsage>): ModelUsage => ({
  provider: 'anthropic',
  model: 'claude-opus-5',
  inputTokens: 1_000_000,
  cacheReadTokens: null,
  cacheWriteTokens: null,
  outputTokens: 0,
  reportedCostUsd: null,
  ...overrides,
});

const serving = (data: unknown, status = 200): typeof fetch => {
  const calls: string[] = [];
  const fetcher: typeof fetch = input => {
    calls.push(input instanceof Request ? input.url : input.toString());
    return Promise.resolve(new Response(JSON.stringify(data), {status}));
  };
  return Object.assign(fetcher, {calls});
};

const fileIn = (): string => join(mkdtempSync(join(tmpdir(), 'caton-prices-')), 'prices.json');
const at = new Date('2026-09-28T10:00:00Z');

describe('pricing a call', () => {
  it('uses the reported cost, else an estimate, else says it is unknown', () => {
    const book = priceBook(fileIn(), () => at, serving([]));

    expect(book.price(usage({reportedCostUsd: 0.0012}), at)).toEqual({
      costNanoUsd: 1_200_000,
      costSource: 'reported',
      pricesDate: null,
    });
    expect(book.price(usage({}), at)).toEqual({
      costNanoUsd: 5_000_000_000,
      costSource: 'estimated',
      pricesDate: 'bundled',
    });
    expect(
      book.price(usage({provider: 'gateway', model: 'anthropic/claude-opus-5'}), at).costNanoUsd,
    ).toBe(5_000_000_000);
    expect(book.price(usage({provider: 'deepinfra', model: 'x'}), at).costSource).toBe('unknown');
    expect(book.price(usage({inputTokens: null, outputTokens: null}), at).costSource).toBe(
      'unknown',
    );
  });
});

describe('refreshing prices', () => {
  it('downloads at most once a day and keeps what it downloaded', async () => {
    const file = fileIn();
    const fetcher = serving(CURRENT);
    const book = priceBook(file, () => at, fetcher);

    await book.refresh();
    await book.refresh();

    expect((fetcher as unknown as {calls: string[]}).calls).toHaveLength(1);
    expect(book.state()).toEqual({date: at.toISOString(), error: null});
    expect(priceBook(file, () => at, serving([])).state().date).toBe(at.toISOString());
  });
});

describe('refreshing prices that fail', () => {
  it('refuses implausible prices and failed downloads, keeping the last good ones', async () => {
    const inflated = CURRENT.map(provider => ({
      ...provider,
      models: provider.models.map(model => ({
        ...model,
        prices: {input_mtok: 999, output_mtok: 999},
      })),
    }));
    const refused = priceBook(fileIn(), () => at, serving(inflated));
    await refused.refresh();
    const failed = priceBook(fileIn(), () => at, serving({}, 503));
    await failed.refresh();

    expect(refused.state().error).toMatch(/^the new prices were refused: they change the price/u);
    expect(failed.state()).toEqual({date: null, error: 'the price file answered 503'});
    expect(refused.price(usage({}), at).costNanoUsd).toBe(5_000_000_000);
  });

  it('refuses a file of another shape', async () => {
    const file = fileIn();
    const book = priceBook(file, () => at, serving([{nothing: true}]));
    await book.refresh();

    expect(book.state().error).toBe('the price file has an unexpected format');
    expect(JSON.parse(readFileSync(file, 'utf8'))).toMatchObject({providers: null});
  });
});
