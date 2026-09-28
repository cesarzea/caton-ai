import type {VariableSpec} from '@caton-ai/core';

export const PROVIDERS = [
  'anthropic',
  'openai',
  'google',
  'openrouter',
  'ollama',
  'openai-compatible',
] as const;

export type ProviderId = (typeof PROVIDERS)[number];

/** Providers reached with a key of the user's account there. */
const KEYED: readonly ProviderId[] = ['anthropic', 'openai', 'google', 'openrouter'];

export const VARIABLES: readonly VariableSpec[] = [
  {
    key: 'provider',
    label: 'Provider',
    kind: 'choice',
    required: true,
    choices: PROVIDERS,
    help: [
      'Who runs the model. **anthropic** (Claude), **openai** and **google** (Gemini) are called directly with your key; **openrouter** reaches hundreds of models with one key and reports the real cost of each call.',
      '**ollama** runs a model on this computer, so the text never leaves it; **openai-compatible** is any other local server that speaks the OpenAI API without a key, such as LM Studio or llama.cpp.',
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
      'Where to create one: [Anthropic](https://console.anthropic.com/settings/keys), [OpenAI](https://platform.openai.com/api-keys), [Google AI Studio](https://aistudio.google.com/apikey) or [OpenRouter](https://openrouter.ai/settings/keys).',
    ].join('\n\n'),
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
