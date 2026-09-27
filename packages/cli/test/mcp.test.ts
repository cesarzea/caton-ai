import {createCatonServer} from '@caton-ai/mcp';
import type {ServerContext} from '@caton-ai/mcp';
import {Client, InMemoryTransport} from '@modelcontextprotocol/client';
import {describe, expect, it} from 'vitest';

import {run} from '../src/app.ts';
import {testContext, workingSource} from './context.ts';
import type {TestContext} from './context.ts';

async function serve(context: TestContext): Promise<ServerContext> {
  expect(await run(['mcp'], context)).toBe(0);
  const [served] = context.served;
  if (served === undefined) {
    throw new Error('caton mcp served nothing');
  }
  return served;
}

describe('caton mcp', () => {
  it('serves the read-only ledger for the configured connections, writing nothing to stdout', async () => {
    const context = testContext({millennium: workingSource, revolut: workingSource});
    const served = await serve(context);

    expect(context.lines).toEqual([]);
    expect(served.connections).toEqual(['millennium', 'revolut']);
    expect(served.ledger()).toBe(context.readOnlyLedger());
  });

  it('logs unexpected server errors to stderr only', async () => {
    const context = testContext({});
    const served = await serve(context);

    served.logError(new Error('disk I/O error'));
    served.logError('plain failure');

    expect(context.lines).toEqual([]);
    expect(context.errors[0]).toContain('disk I/O error');
    expect(context.errors[1]).toBe('plain failure');
  });
});

describe('caton mcp figures', () => {
  it('reports the same monthly outflows as caton spend', async () => {
    const context = testContext({millennium: workingSource});
    await run(['sync'], context);
    await run(['spend', '2'], context);
    const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
    await createCatonServer(await serve(context)).connect(serverSide);
    const client = new Client({name: 'caton-test', version: '0.0.0'});
    await client.connect(clientSide);

    const result = await client.callTool({name: 'monthly_outflows', arguments: {months: 2}});

    expect(context.lines.at(-1)).toBe('2026-09  €160.00');
    expect(result.structuredContent).toMatchObject({
      months: [{month: '2026-09', amount: '160.00', currency: 'EUR'}],
    });
  });
});
