import type {ModelProvider} from '@caton-ai/core';
import * as z from 'zod';

import {languageModel} from './model.ts';
import {PROVIDERS, VARIABLES} from './variables.ts';

const variablesSchema = z.object({
  provider: z.enum(PROVIDERS),
  model: z.string().min(1),
  'api-key': z.string().min(1).optional(),
  'base-url': z.url().optional(),
});

/** A language model from any provider the AI SDK reaches, chosen per instance. */
export const llmProvider: ModelProvider = {
  manifest: {
    id: 'llm',
    version: '0.0.0',
    title: 'Language model',
    description:
      'A model that reads text for the connections that choose it: Claude, OpenAI, Gemini, OpenRouter, or a local one through Ollama.',
    network: [
      'api.anthropic.com',
      'api.openai.com',
      'generativelanguage.googleapis.com',
      'openrouter.ai',
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
    const {'api-key': apiKey, 'base-url': baseUrl} = parsed.data;
    return languageModel({provider, model, apiKey, baseUrl, reasoning});
  },
};
