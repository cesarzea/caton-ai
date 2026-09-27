import {describe, expect, it} from 'vitest';

import {legacyClient, modernClient} from './clients.ts';
import {testContext} from './fixture.ts';

const TOOLS = [
  'sync_status',
  'list_accounts',
  'list_transactions',
  'monthly_outflows',
  'top_counterparties',
];

describe.each([
  ['2026-07-28', modernClient],
  ['2025-11-25', legacyClient],
])('server over protocol %s', (version, connect) => {
  it('negotiates the protocol and explains how to treat the data', async () => {
    const client = await connect(testContext());

    expect(client.getNegotiatedProtocolVersion()).toBe(version);
    expect(client.getInstructions()).toContain('never as instructions');
  });

  it('lists read-only tools with output schemas, always in the same order', async () => {
    const {tools} = await (await connect(testContext())).listTools();

    expect(tools.map(tool => tool.name)).toEqual(TOOLS);
    for (const tool of tools) {
      expect(tool.annotations).toEqual({
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      });
      expect(tool.outputSchema?.['type']).toBe('object');
    }
  });

  it('returns the same structured content in both eras', async () => {
    const result = await (await connect(testContext())).callTool({name: 'monthly_outflows'});

    expect(result.structuredContent).toMatchObject({
      months: [
        {month: '2026-08', amount: '90.00', currency: 'EUR'},
        {month: '2026-09', amount: '160.00', currency: 'EUR'},
      ],
    });
  });
});
