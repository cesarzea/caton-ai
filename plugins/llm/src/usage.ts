import type {ModelUsage} from '@caton-ai/core';
import type {LanguageModelUsage, ProviderMetadata} from 'ai';
import * as z from 'zod';

import type {ModelSettings} from './providers.ts';

const openRouterCost = z.object({openrouter: z.object({usage: z.object({cost: z.number()})})});

function reportedCost(
  settings: ModelSettings,
  metadata: ProviderMetadata | undefined,
): number | null {
  if (settings.provider === 'ollama') {
    return 0;
  }
  const parsed = openRouterCost.safeParse(metadata);
  return parsed.success ? parsed.data.openrouter.usage.cost : null;
}

const orNull = (count: number | undefined): number | null => count ?? null;

function tokens(
  usage: LanguageModelUsage | undefined,
): Omit<ModelUsage, 'provider' | 'model' | 'reportedCostUsd'> {
  return {
    inputTokens: orNull(usage?.inputTokens),
    cacheReadTokens: orNull(usage?.inputTokenDetails.cacheReadTokens),
    cacheWriteTokens: orNull(usage?.inputTokenDetails.cacheWriteTokens),
    outputTokens: orNull(usage?.outputTokens),
  };
}

/** What a call consumed, as the host records it. */
export function usageOf(
  settings: ModelSettings,
  usage: LanguageModelUsage | undefined,
  answeredBy: string | undefined,
  metadata?: ProviderMetadata,
): ModelUsage {
  return {
    provider: settings.provider,
    model: answeredBy ?? settings.model,
    ...tokens(usage),
    reportedCostUsd: reportedCost(settings, metadata),
  };
}
