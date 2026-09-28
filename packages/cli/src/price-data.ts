import {calcPrice, findProvider} from '@pydantic/genai-prices';
import type {Provider} from '@pydantic/genai-prices';
import * as z from 'zod';

const modelSchema = z.looseObject({id: z.string().min(1), prices: z.unknown()});
const providerSchema = z.looseObject({
  id: z.string().min(1),
  name: z.string(),
  api_pattern: z.string(),
  models: z.array(modelSchema),
});

/** The price file of genai-prices: every provider, since loading it replaces all prices. */
export const priceDataSchema = z.array(providerSchema).min(10);

/** What is kept on disk: the last good prices, and the last attempt to refresh them. */
export const storedPricesSchema = z.object({
  fetchedAt: z.iso.datetime().nullable(),
  attemptedAt: z.iso.datetime(),
  error: z.string().nullable(),
  providers: priceDataSchema.nullable(),
});

export type StoredPrices = z.infer<typeof storedPricesSchema>;

export type PriceData = z.infer<typeof priceDataSchema>;

/** The checked file as genai-prices types it; the schema checks only what Catón AI relies on. */
export const asProviders = (data: PriceData): Provider[] => data as unknown as Provider[];

/** Well-known models whose price is compared before accepting new data. */
const PROBES = [
  ['anthropic', 'claude-opus-5'],
  ['anthropic', 'claude-haiku-4-5'],
  ['openai', 'gpt-5'],
  ['google', 'gemini-2.5-flash'],
  ['mistral', 'mistral-large-latest'],
  ['deepseek', 'deepseek-chat'],
] as const;

const PROBE_USAGE = {input_tokens: 1_000_000, output_tokens: 1_000_000};

function probe(providerId: string, model: string, provider?: Provider): number | null {
  try {
    const options = provider === undefined ? {providerId} : {provider};
    return calcPrice(PROBE_USAGE, model, options)?.total_price ?? null;
  } catch {
    return null;
  }
}

function changeOf(current: number | null, next: number | null, name: string): string | null {
  if (current === null) {
    return null;
  }
  if (next === null) {
    return `they drop ${name}`;
  }
  const ratio = next / current;
  return ratio > 10 || ratio < 0.1
    ? `they change the price of ${name} ${ratio.toFixed(2)} times`
    : null;
}

function probeProblem(providers: readonly Provider[]): string | null {
  for (const [providerId, model] of PROBES) {
    const provider = providers.find(candidate => candidate.id === providerId);
    const next = provider === undefined ? null : probe(providerId, model, provider);
    const problem = changeOf(probe(providerId, model), next, `${providerId}/${model}`);
    if (problem !== null) {
      return problem;
    }
  }
  return null;
}

/**
 * Why new price data is refused, or null when it is plausible next to the prices in use: it must
 * keep the well-known models at a price within ten times the current one, and most models.
 */
export function implausible(providers: readonly Provider[]): string | null {
  const current = providers.reduce(
    (total, provider) => total + (findProvider({providerId: provider.id})?.models.length ?? 0),
    0,
  );
  const next = providers.reduce((total, provider) => total + provider.models.length, 0);
  if (next < current * 0.8) {
    return `they drop ${String(current - next)} of ${String(current)} models`;
  }
  return probeProblem(providers);
}
