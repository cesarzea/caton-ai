import {describe, expect, it} from 'vitest';

import {languageModel, llmProvider} from '../src/index.ts';
import {providerOptions, sdkModel} from '../src/providers.ts';
import {KEYED} from '../src/variables.ts';

interface Sent {
  readonly url: string;
  readonly body: Record<string, unknown>;
}

function recording(sent: Sent[], answer: unknown): typeof fetch {
  return (input, init) => {
    sent.push({
      url: input instanceof Request ? input.url : input.toString(),
      body: JSON.parse(typeof init?.body === 'string' ? init.body : '{}') as Record<
        string,
        unknown
      >,
    });
    const headers = {'content-type': 'application/json'};
    return Promise.resolve(new Response(JSON.stringify(answer), {status: 200, headers}));
  };
}

const REQUEST = {instructions: 'Find it.', content: 'Paid 12', schema: {type: 'object'}};

const CLAUDE_ANSWER = {
  id: 'msg_1',
  type: 'message',
  role: 'assistant',
  model: 'claude-opus-5',
  content: [{type: 'text', text: '{"amount":"12.00"}'}],
  stop_reason: 'end_turn',
  stop_sequence: null,
  usage: {input_tokens: 10, output_tokens: 5},
};

describe('the Anthropic provider', () => {
  it('asks Claude through the Anthropic API with server-side fallbacks', async () => {
    const sent: Sent[] = [];
    const settings = {provider: 'anthropic', model: 'claude-opus-5', apiKey: 'test-key'} as const;
    const model = languageModel({...settings, fetch: recording(sent, CLAUDE_ANSWER)});

    const answer = await model.extract({
      instructions: 'Find it.',
      content: 'Paid 12',
      schema: {type: 'object'},
    });

    expect(answer.value).toEqual({amount: '12.00'});
    expect(sent[0]?.url).toBe('https://api.anthropic.com/v1/messages');
    expect(sent[0]?.body).toMatchObject({model: 'claude-opus-5', fallbacks: 'default'});
    expect(providerOptions({...settings, model: 'claude-haiku-4-5'})).toEqual({});
  });
});

describe('the Anthropic provider with a thinking effort', () => {
  it('asks Opus 5 for adaptive thinking at that effort, keeping the fallbacks', async () => {
    const sent: Sent[] = [];
    const fetch = recording(sent, CLAUDE_ANSWER);
    const settings = {provider: 'anthropic', model: 'claude-opus-5', apiKey: 'k'} as const;

    await languageModel({...settings, reasoning: 'high', fetch}).extract(REQUEST);

    expect(sent[0]?.body).toMatchObject({
      fallbacks: 'default',
      thinking: {type: 'adaptive'},
      output_config: {effort: 'high'},
    });
    expect(JSON.stringify(sent[0]?.body)).not.toContain('budget_tokens');
  });
});

describe('providers', () => {
  it('reach each provider, local ones at their address', () => {
    const provider = (id: Parameters<typeof sdkModel>[0]['provider'], baseUrl?: string) => {
      const model = sdkModel({provider: id, model: 'm', apiKey: 'k', baseUrl});
      return typeof model === 'string' ? model : model.provider;
    };

    for (const id of KEYED) {
      expect(provider(id).length).toBeGreaterThan(0);
    }
    expect(provider('anthropic')).toMatch(/^anthropic/u);
    expect(provider('openrouter')).toBe('openrouter');
    expect(provider('gateway')).toBe('gateway');
    expect(provider('ollama')).toMatch(/^ollama/u);
    expect(provider('openai-compatible', 'http://127.0.0.1:1234/v1')).toMatch(
      /^openai-compatible/u,
    );
  });

  it('name what a provider is missing', () => {
    expect(() => sdkModel({provider: 'openai', model: 'm'})).toThrow(
      'The openai provider needs an API key',
    );
    expect(() => sdkModel({provider: 'openai-compatible', model: 'm'})).toThrow(
      'The openai-compatible provider needs an address',
    );
  });
});

describe('llmProvider', () => {
  it('builds the model from its variables and names the wrong ones', () => {
    expect(
      llmProvider.createModel({provider: 'ollama', model: 'qwen3'}, {reasoning: 'low'}).name,
    ).toBe('ollama/qwen3');
    const wrong = {provider: 'nobody', 'base-url': 'not a url'};
    expect(() => llmProvider.createModel(wrong, {reasoning: 'low'})).toThrow(
      'Invalid language model variables: provider, model, base-url',
    );
  });
});
