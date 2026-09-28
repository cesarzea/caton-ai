import {createAnthropic} from '@ai-sdk/anthropic';
import {createGoogle} from '@ai-sdk/google';
import {createOpenAI} from '@ai-sdk/openai';
import {createOpenAICompatible} from '@ai-sdk/openai-compatible';
import {createOpenRouter} from '@openrouter/ai-sdk-provider';
import type {ReasoningEffort} from '@caton-ai/core';
import type {LanguageModel as SdkModel} from 'ai';

import type {ProviderId} from './variables.ts';

export interface ModelSettings {
  readonly provider: ProviderId;
  readonly model: string;
  readonly apiKey?: string | undefined;
  readonly baseUrl?: string | undefined;
  /** How much the model reasons for the connection using it. */
  readonly reasoning?: ReasoningEffort | undefined;
  /** Only tests replace it. */
  readonly fetch?: typeof fetch | undefined;
}

const OLLAMA = 'http://127.0.0.1:11434';

// Models whose safety classifiers may decline a request: the API re-runs it on the fallback
// Anthropic recommends instead of answering with a refusal.
const WITH_FALLBACKS = new Set(['claude-opus-5']);

function required(value: string | undefined, what: string, provider: ProviderId): string {
  if (value === undefined || value === '') {
    throw new TypeError(`The ${provider} provider needs ${what}`);
  }
  return value;
}

type FetchOption = Readonly<{fetch?: typeof fetch}>;
type Builder = (settings: ModelSettings, common: FetchOption) => SdkModel;

const withKey = (settings: ModelSettings): string =>
  required(settings.apiKey, 'an API key', settings.provider);

function compatible(settings: ModelSettings, common: FetchOption, baseURL: string): SdkModel {
  const options = {...common, name: settings.provider, baseURL, supportsStructuredOutputs: true};
  const apiKey = settings.apiKey;
  return createOpenAICompatible(apiKey === undefined ? options : {...options, apiKey})(
    settings.model,
  );
}

const BUILDERS: Readonly<Record<ProviderId, Builder>> = {
  anthropic: (settings, common) =>
    createAnthropic({...common, apiKey: withKey(settings)})(settings.model),
  openai: (settings, common) =>
    createOpenAI({...common, apiKey: withKey(settings)})(settings.model),
  google: (settings, common) =>
    createGoogle({...common, apiKey: withKey(settings)})(settings.model),
  // OpenRouter reports the real cost of each call when asked to.
  openrouter: (settings, common) =>
    createOpenRouter({...common, apiKey: withKey(settings)})(settings.model, {
      usage: {include: true},
    }),
  ollama: (settings, common) => compatible(settings, common, `${settings.baseUrl ?? OLLAMA}/v1`),
  'openai-compatible': (settings, common) =>
    compatible(settings, common, required(settings.baseUrl, 'an address', settings.provider)),
};

/** The AI SDK model for the chosen provider. */
export function sdkModel(settings: ModelSettings): SdkModel {
  return BUILDERS[settings.provider](
    settings,
    settings.fetch === undefined ? {} : {fetch: settings.fetch},
  );
}

/** Options only some providers understand. */
export type ProviderOptions = Readonly<Record<string, {readonly fallbacks: 'default'}>>;

export function providerOptions({provider, model}: ModelSettings): ProviderOptions {
  return provider === 'anthropic' && WITH_FALLBACKS.has(model)
    ? {anthropic: {fallbacks: 'default'}}
    : {};
}
