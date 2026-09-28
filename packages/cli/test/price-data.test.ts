import {findProvider} from '@pydantic/genai-prices';
import type {Provider} from '@pydantic/genai-prices';
import {describe, expect, it} from 'vitest';

import {implausible} from '../src/price-data.ts';

const IDS = ['anthropic', 'openai', 'google', 'mistral', 'deepseek'];
const current = IDS.map(id => findProvider({providerId: id})).filter(
  (provider): provider is Provider => provider !== undefined,
);

describe('implausible price data', () => {
  it('accepts the prices in use, and refuses data that drops models or providers', () => {
    const halved = current.map(provider => ({...provider, models: provider.models.slice(0, 1)}));

    expect(implausible(current)).toBeNull();
    expect(implausible(halved)).toMatch(/^they drop \d+ of \d+ models$/u);
    expect(implausible(current.filter(provider => provider.id !== 'anthropic'))).toBe(
      'they drop anthropic/claude-opus-5',
    );
  });
});
