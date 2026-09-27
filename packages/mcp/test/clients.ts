import {Client, StreamableHTTPClientTransport} from '@modelcontextprotocol/client';
import {InMemoryTransport, createMcpHandler} from '@modelcontextprotocol/server';

import {createCatonServer} from '../src/index.ts';
import type {ServerContext} from '../src/index.ts';

const CLIENT = {name: 'caton-test', version: '0.0.0'};

/** A client speaking the 2026-07-28 protocol, stateless, over an in-process HTTP handler. */
export async function modernClient(context: ServerContext): Promise<Client> {
  const handler = createMcpHandler(() => createCatonServer(context));
  const client = new Client(CLIENT, {versionNegotiation: {mode: {pin: '2026-07-28'}}});
  const transport = new StreamableHTTPClientTransport(new URL('http://localhost/mcp'), {
    fetch: (input, init) => handler.fetch(new Request(input, init)),
  });
  await client.connect(transport);
  return client;
}

/** A 2025-era client, which opens with `initialize`, as older hosts still do. */
export async function legacyClient(context: ServerContext): Promise<Client> {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await createCatonServer(context).connect(serverSide);
  const client = new Client(CLIENT);
  await client.connect(clientSide);
  return client;
}

/** Calls one tool over the 2026-07-28 protocol. */
export async function callTool(
  context: ServerContext,
  name: string,
  args: Record<string, unknown> = {},
): Promise<Awaited<ReturnType<Client['callTool']>>> {
  return (await modernClient(context)).callTool({name, arguments: args});
}

/** The text of the first content block of a result. */
export function textOf(result: Awaited<ReturnType<Client['callTool']>>): string {
  const [first] = result.content;
  return first?.type === 'text' ? first.text : '';
}
