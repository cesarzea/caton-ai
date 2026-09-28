import {describe, expect, it} from 'vitest';

import {callTool, textOf} from './clients.ts';
import {testContext} from './fixture.ts';

describe('list_documents', () => {
  it('returns documents newest first, with their state, and without ids', async () => {
    const result = await callTool(testContext(), 'list_documents', {});

    expect(result.structuredContent).toMatchObject({
      documents: [
        {kind: 'renewal', amount: null, verified: false, linked: false},
        {
          kind: 'receipt',
          issuer: 'Example AI Inc',
          amount: {amount: '160.00', currency: 'EUR'},
          verified: true,
          linked: true,
          reference: 'INV-1',
        },
      ],
      total: 2,
      truncated: false,
    });
    expect(textOf(result)).not.toContain('email:<');
  });
});

describe('list_documents filters', () => {
  it('filter by kind, state, link and date, a page at a time', async () => {
    const pick = async (input: Record<string, unknown>) =>
      (
        (await callTool(testContext(), 'list_documents', input)).structuredContent as {
          total: number;
        }
      ).total;

    expect(await pick({kind: 'receipt'})).toBe(1);
    expect(await pick({state: 'to-review'})).toBe(1);
    expect(await pick({linked: true})).toBe(1);
    expect(await pick({from: '2026-09-15'})).toBe(1);
    const page = (await callTool(testContext(), 'list_documents', {limit: 1})).structuredContent;
    expect(page).toMatchObject({total: 2, truncated: true});
  });
});
