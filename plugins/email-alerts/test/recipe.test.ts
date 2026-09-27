import {describe, expect, it} from 'vitest';

import {recipeSchema} from '../src/index.ts';
import {recipe} from './mail.ts';

const withFields = (fields: Record<string, string>): unknown => ({
  ...recipe(),
  fields: {...recipe().fields, ...fields},
});

describe('recipeSchema', () => {
  it('accepts a complete recipe and defaults to charges', () => {
    expect(recipe().direction).toBe('out');
  });

  it('requires exactly one capture group around each extracted value', () => {
    expect(recipeSchema.safeParse(withFields({amount: 'Importe: [\\d,]+'})).success).toBe(false);
    expect(recipeSchema.safeParse(withFields({amount: '(Importe): ([\\d,]+)'})).success).toBe(
      false,
    );
    expect(recipeSchema.safeParse(withFields({amount: '(?:Importe): ([\\d,]+)'})).success).toBe(
      true,
    );
  });

  it('rejects invalid expressions, domains and formats', () => {
    expect(recipeSchema.safeParse(withFields({merchant: '(unclosed'})).success).toBe(false);
    expect(recipeSchema.safeParse({...recipe(), senderDomain: 'not a domain'}).success).toBe(false);
    expect(recipeSchema.safeParse({...recipe(), dateFormat: 'DD/MM/YY'}).success).toBe(false);
  });
});
