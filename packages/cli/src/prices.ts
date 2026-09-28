import {existsSync, readFileSync, renameSync, writeFileSync} from 'node:fs';

import type {ModelUsage} from '@caton-ai/core';
import {calcPrice, REMOTE_DATA_JSON_URL, updatePrices} from '@pydantic/genai-prices';

import {asProviders, implausible, priceDataSchema, storedPricesSchema} from './price-data.ts';
import type {PriceData, StoredPrices} from './price-data.ts';

export interface PricedCost {
  readonly costNanoUsd: number | null;
  readonly costSource: 'reported' | 'estimated' | 'unknown';
  readonly pricesDate: string | null;
}

/** Which prices are in use: downloaded on `date`, or the ones bundled when null. */
interface PriceState {
  readonly date: string | null;
  readonly error: string | null;
}

export interface PriceBook {
  readonly state: () => PriceState;
  /** Downloads new prices when the last attempt is a day old; never throws. */
  readonly refresh: () => Promise<void>;
  readonly price: (usage: ModelUsage, at: Date) => PricedCost;
}

const DAY_MS = 86_400_000;

// Where genai-prices files a provider under another name.
const ALIASES: Readonly<Record<string, string>> = {togetherai: 'together'};

const nano = (usd: number): number => Math.round(usd * 1e9);

/** The provider and model to price: a gateway call is priced as the provider it reached. */
function priceRef({provider, model}: ModelUsage): {providerId: string; model: string} {
  const [prefix = '', ...rest] = model.split('/');
  const routed = provider === 'gateway' && rest.length > 0;
  const id = routed ? prefix : provider;
  return {providerId: ALIASES[id] ?? id, model: routed ? rest.join('/') : model};
}

function tokensOf(usage: ModelUsage): Record<string, number> {
  const tokens: Record<string, number> = {
    input_tokens: usage.inputTokens ?? 0,
    output_tokens: usage.outputTokens ?? 0,
  };
  if (usage.cacheReadTokens !== null) {
    tokens['cache_read_tokens'] = usage.cacheReadTokens;
  }
  if (usage.cacheWriteTokens !== null) {
    tokens['cache_write_tokens'] = usage.cacheWriteTokens;
  }
  return tokens;
}

function estimate(usage: ModelUsage, at: Date): number | null {
  if (usage.inputTokens === null && usage.outputTokens === null) {
    return null;
  }
  const {providerId, model} = priceRef(usage);
  try {
    return calcPrice(tokensOf(usage), model, {providerId, timestamp: at})?.total_price ?? null;
  } catch {
    return null;
  }
}

function apply(data: PriceData): void {
  updatePrices(({setProviderData}) => {
    setProviderData(asProviders(data));
  });
}

function read(file: string): StoredPrices | null {
  if (!existsSync(file)) {
    return null;
  }
  const parsed = storedPricesSchema.safeParse(JSON.parse(readFileSync(file, 'utf8')));
  return parsed.success ? parsed.data : null;
}

function write(file: string, stored: StoredPrices): void {
  writeFileSync(`${file}.tmp`, JSON.stringify(stored), {mode: 0o600});
  renameSync(`${file}.tmp`, file);
}

async function download(fetcher: typeof fetch): Promise<PriceData> {
  const response = await fetcher(REMOTE_DATA_JSON_URL, {signal: AbortSignal.timeout(30_000)});
  if (!response.ok) {
    throw new Error(`the price file answered ${String(response.status)}`);
  }
  const parsed = priceDataSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new Error('the price file has an unexpected format');
  }
  const problem = implausible(asProviders(parsed.data));
  if (problem !== null) {
    throw new Error(`the new prices were refused: ${problem}`);
  }
  return parsed.data;
}

/** A refresh attempt: the new prices, or the last good ones with the reason they stay. */
async function attempt(
  stored: StoredPrices | null,
  attemptedAt: string,
  fetcher: typeof fetch,
): Promise<StoredPrices> {
  try {
    const providers = await download(fetcher);
    apply(providers);
    return {fetchedAt: attemptedAt, attemptedAt, error: null, providers};
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {...(stored ?? {fetchedAt: null, providers: null}), attemptedAt, error: message};
  }
}

function priced(usage: ModelUsage, at: Date, pricesDate: string): PricedCost {
  if (usage.reportedCostUsd !== null) {
    return {costNanoUsd: nano(usage.reportedCostUsd), costSource: 'reported', pricesDate: null};
  }
  const usd = estimate(usage, at);
  return usd === null
    ? {costNanoUsd: null, costSource: 'unknown', pricesDate: null}
    : {costNanoUsd: nano(usd), costSource: 'estimated', pricesDate};
}

/** The prices of language models, from genai-prices, refreshed at most once a day. */
export function priceBook(file: string, now: () => Date, fetcher: typeof fetch): PriceBook {
  let stored = read(file);
  if (stored !== null && stored.providers !== null) {
    apply(stored.providers);
  }
  const state = (): PriceState => ({date: stored?.fetchedAt ?? null, error: stored?.error ?? null});
  return {
    state,
    refresh: async () => {
      const at = now();
      if (stored !== null && at.getTime() - Date.parse(stored.attemptedAt) < DAY_MS) {
        return;
      }
      stored = await attempt(stored, at.toISOString(), fetcher);
      write(file, stored);
    },
    price: (usage, at) => priced(usage, at, state().date ?? 'bundled'),
  };
}
