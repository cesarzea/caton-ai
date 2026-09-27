import type {CommandContext} from '../context.ts';

/**
 * Serves the ledger read-only over MCP on stdin/stdout. Stdout belongs to the protocol from here
 * on: unexpected errors go to stderr only.
 */
export function mcpCommand(context: CommandContext): number {
  context.serveMcp({
    ledger: context.readOnlyLedger,
    connections: context.config().connections.map(connection => connection.name),
    now: context.now,
    logError: error => {
      context.output.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
    },
  });
  return 0;
}
