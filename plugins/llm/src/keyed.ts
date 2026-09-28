import {createAlibaba} from '@ai-sdk/alibaba';
import {createAnthropic} from '@ai-sdk/anthropic';
import {createBaseten} from '@ai-sdk/baseten';
import {createCerebras} from '@ai-sdk/cerebras';
import {createCohere} from '@ai-sdk/cohere';
import {createDeepInfra} from '@ai-sdk/deepinfra';
import {createDeepSeek} from '@ai-sdk/deepseek';
import {createFireworks} from '@ai-sdk/fireworks';
import {createGateway} from '@ai-sdk/gateway';
import {createGoogle} from '@ai-sdk/google';
import {createGroq} from '@ai-sdk/groq';
import {createMiniMax} from '@ai-sdk/minimax';
import {createMistral} from '@ai-sdk/mistral';
import {createMoonshotAI} from '@ai-sdk/moonshotai';
import {createOpenAI} from '@ai-sdk/openai';
import {createPerplexity} from '@ai-sdk/perplexity';
import {createTogetherAI} from '@ai-sdk/togetherai';
import {createXai} from '@ai-sdk/xai';
import {createOpenRouter} from '@openrouter/ai-sdk-provider';
import type {LanguageModel as SdkModel} from 'ai';

import type {KeyedProvider} from './variables.ts';

type Options = Readonly<{apiKey: string; fetch?: typeof fetch}>;
type Factory = (options: Options) => (model: string) => SdkModel;

/** How each provider reached with the user's own key builds a model. */
export const KEYED_FACTORIES: Readonly<Record<KeyedProvider, Factory>> = {
  anthropic: createAnthropic,
  openai: createOpenAI,
  google: createGoogle,
  xai: createXai,
  mistral: createMistral,
  deepseek: createDeepSeek,
  groq: createGroq,
  cerebras: createCerebras,
  togetherai: createTogetherAI,
  fireworks: createFireworks,
  deepinfra: createDeepInfra,
  cohere: createCohere,
  perplexity: createPerplexity,
  moonshotai: createMoonshotAI,
  alibaba: createAlibaba,
  minimax: createMiniMax,
  baseten: createBaseten,
  // OpenRouter reports the real cost of each call when asked to.
  openrouter: options => model => createOpenRouter(options)(model, {usage: {include: true}}),
  gateway: createGateway,
};
