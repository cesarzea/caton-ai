import {chmodSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import {openLedger} from '@caton-ai/ledger';
import {Client} from '@modelcontextprotocol/client';
import {StdioClientTransport} from '@modelcontextprotocol/client/stdio';
import {syncConnection} from '@caton-ai/sync';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {workingSource} from './context.ts';

// Starts the real `caton mcp` process, as an MCP host does, over a temporary ledger.

const MAIN = join(import.meta.dirname, '..', 'src', 'main.ts');
let directory = '';

beforeAll(async () => {
  directory = mkdtempSync(join(tmpdir(), 'caton-mcp-'));
  const configPath = join(directory, 'config.json');
  writeFileSync(
    configPath,
    JSON.stringify({
      instances: [{id: 'millennium', title: 'Millennium', plugin: 'enable-banking', settings: {}}],
    }),
  );
  chmodSync(configPath, 0o600);
  const ledger = openLedger(join(directory, 'ledger.sqlite'));
  await syncConnection({
    name: 'millennium',
    source: () => workingSource,
    ledger,
    now: () => new Date(),
  });
  ledger.close();
});

afterAll(() => {
  rmSync(directory, {recursive: true, force: true});
});

async function connect(pinned: boolean): Promise<Client> {
  const client = new Client(
    {name: 'caton-test', version: '0.0.0'},
    pinned ? {versionNegotiation: {mode: {pin: '2026-07-28'}}} : {},
  );
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [MAIN, 'mcp'],
    env: {CATON_CONFIG_DIR: directory, CATON_DATA_DIR: directory},
    stderr: 'pipe',
  });
  await client.connect(transport);
  return client;
}

describe.each([
  [true, '2026-07-28'],
  [false, '2025-11-25'],
])('caton mcp over stdio (pinned: %s)', (pinned, version) => {
  it(`serves protocol ${version} and answers from the ledger`, async () => {
    const client = await connect(pinned);
    try {
      expect(client.getNegotiatedProtocolVersion()).toBe(version);
      const result = await client.callTool({name: 'monthly_outflows', arguments: {months: 1}});
      expect(result.structuredContent).toMatchObject({
        freshness: {complete: true, incompleteConnections: []},
      });
    } finally {
      await client.close();
    }
  });
});
