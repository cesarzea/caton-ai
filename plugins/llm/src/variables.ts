import type {VariableSpec} from '@caton-ai/core';

/** Providers reached with a key of the user's account there, one key per provider. */
export const KEYED = [
  'anthropic',
  'openai',
  'google',
  'xai',
  'mistral',
  'deepseek',
  'groq',
  'cerebras',
  'togetherai',
  'fireworks',
  'deepinfra',
  'cohere',
  'perplexity',
  'moonshotai',
  'alibaba',
  'minimax',
  'baseten',
  'openrouter',
  'gateway',
] as const;

export type KeyedProvider = (typeof KEYED)[number];

export const PROVIDERS = [...KEYED, 'ollama', 'openai-compatible'] as const;

export type ProviderId = (typeof PROVIDERS)[number];

export const VARIABLES: readonly VariableSpec[] = [
  {
    key: 'provider',
    label: 'Provider',
    kind: 'choice',
    required: true,
    choices: PROVIDERS,
    help: [
      'Who runs the model. Most are called directly with your key there: **anthropic** (Claude), **openai**, **google** (Gemini), **xai** (Grok), **mistral**, **deepseek**, **groq**, **cerebras**, **togetherai**, **fireworks**, **deepinfra**, **cohere**, **perplexity**, **moonshotai** (Kimi), **alibaba** (Qwen), **minimax** and **baseten**.',
      'Two reach hundreds of models of many providers with one key: **openrouter**, which reports the real cost of each call, and **gateway** (Vercel AI Gateway). Model names then carry the provider, such as `anthropic/claude-opus-5`.',
      '**ollama** runs a model on this computer, so the text never leaves it; **openai-compatible** is any other server that speaks the OpenAI API, such as LM Studio, llama.cpp or a hosted one.',
    ].join('\n\n'),
  },
  {
    key: 'model',
    label: 'Model',
    kind: 'text',
    required: true,
    help: [
      "The model's name as the provider writes it: `claude-opus-5` or the cheaper `claude-haiku-4-5` for anthropic, `anthropic/claude-opus-5` for openrouter, or a model already downloaded with `ollama pull` for ollama.",
      'Larger models read emails more accurately; smaller ones cost less.',
    ].join('\n\n'),
  },
  {
    key: 'api-key',
    label: 'API key',
    kind: 'secret',
    required: true,
    when: {variable: 'provider', values: KEYED},
    sharedPer: 'provider',
    help: [
      "A key from the provider's console, billed to your account there. It is saved encrypted once per provider and reused by every model of that provider.",
      "Create it in the API keys page of the provider's console, for example [Anthropic](https://console.anthropic.com/settings/keys), [OpenAI](https://platform.openai.com/api-keys), [Google AI Studio](https://aistudio.google.com/apikey), [OpenRouter](https://openrouter.ai/settings/keys) or [Vercel AI Gateway](https://vercel.com/dashboard/ai-gateway/api-keys).",
    ].join('\n\n'),
  },
  {
    key: 'server-key',
    label: 'Server key',
    kind: 'secret',
    required: false,
    when: {variable: 'provider', values: ['openai-compatible']},
    help: 'Only if the server asks for one, as hosted ones do. It belongs to this model alone, since each server has its own.',
  },
  {
    key: 'base-url',
    label: 'Address',
    kind: 'text',
    required: false,
    when: {variable: 'provider', values: ['ollama', 'openai-compatible']},
    help: 'Where the server listens. Ollama on this computer needs nothing here (`http://127.0.0.1:11434`); an openai-compatible server needs its address, such as `http://127.0.0.1:1234/v1`.',
  },
];
