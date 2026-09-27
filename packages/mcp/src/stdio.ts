import {serveStdio} from '@modelcontextprotocol/server/stdio';

import type {ServerContext} from './context.ts';
import {createCatonServer} from './server.ts';

/**
 * Serves the Catón AI MCP server over stdin/stdout until the host closes the connection. Hosts
 * speaking the 2026-07-28 protocol and 2025-era hosts are both served. Nothing else may write to
 * stdout while it runs.
 */
export function serveOverStdio(context: ServerContext): void {
  serveStdio(() => createCatonServer(context), {onerror: context.logError});
}
