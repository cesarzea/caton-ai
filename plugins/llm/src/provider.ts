import type {ModelProvider} from '@caton-ai/core';
import * as z from 'zod';

import {languageModel} from './model.ts';
import {PROVIDERS, VARIABLES} from './variables.ts';

const variablesSchema = z.object({
  provider: z.enum(PROVIDERS),
  model: z.string().min(1),
  'api-key': z.string().min(1).optional(),
  'server-key': z.string().min(1).optional(),
  'base-url': z.url().optional(),
});

/** A language model from any provider the AI SDK reaches, chosen per instance. */
export const llmProvider: ModelProvider = {
  manifest: {
    id: 'llm',
    version: '0.0.0',
    title: 'Language model',
    description:
      'A model that reads text for the connections that choose it: from 17 providers directly, through OpenRouter or Vercel AI Gateway, locally with Ollama, or from any OpenAI-compatible server.',
    // Only the chosen provider is contacted.
    network: [
      'api.anthropic.com',
      'api.openai.com',
      'generativelanguage.googleapis.com',
      'api.x.ai',
      'api.mistral.ai',
      'api.deepseek.com',
      'api.groq.com',
      'api.cerebras.ai',
      'api.together.xyz',
      'api.fireworks.ai',
      'api.deepinfra.com',
      'api.cohere.com',
      'api.perplexity.ai',
      'api.moonshot.ai',
      'dashscope-intl.aliyuncs.com',
      'api.minimax.io',
      'inference.baseten.co',
      'openrouter.ai',
      'ai-gateway.vercel.sh',
      'variable:base-url',
    ],
    variables: VARIABLES,
  },
  createModel: (variables, {reasoning}) => {
    const parsed = variablesSchema.safeParse(variables);
    if (!parsed.success) {
      const wrong = [...new Set(parsed.error.issues.map(issue => String(issue.path[0])))];
      throw new TypeError(`Invalid language model variables: ${wrong.join(', ')}`);
    }
    const {provider, model} = parsed.data;
    const {'api-key': apiKey = parsed.data['server-key'], 'base-url': baseUrl} = parsed.data;
    return languageModel({provider, model, apiKey, baseUrl, reasoning});
  },
};
