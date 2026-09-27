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

export const VARIABLES: readonly VariableSpec[] = [
  {
    key: 'provider',
    label: 'Provider',
    kind: 'choice',
    required: true,
    choices: PROVIDERS,
    help: [
      'Who runs the model. **anthropic** (Claude), **openai** and **google** (Gemini) are called directly with your key; **openrouter** reaches hundreds of models with one key and reports the real cost of each call.',
      '**ollama** runs a model on this computer, so the text never leaves it; **openai-compatible** is any other server that speaks the OpenAI API, such as LM Studio or llama.cpp.',
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
    required: false,
    help: [
      "A key from the provider's console, billed to your account there. Needed for anthropic, openai, google and openrouter; ollama needs none.",
      'When several models use the same account, save the key once as a **shared secret** and write `${its-name}` here.',
    ].join('\n\n'),
  },
  {
    key: 'base-url',
    label: 'Address',
    kind: 'text',
    required: false,
    help: 'Only for ollama and openai-compatible: where the server listens. Ollama on this computer needs nothing here (`http://127.0.0.1:11434`); an openai-compatible server needs its address, such as `http://127.0.0.1:1234/v1`.',
  },
];
