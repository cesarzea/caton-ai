import {accountsCommand} from './commands/accounts.ts';
import {mcpCommand} from './commands/mcp.ts';
import {spendCommand} from './commands/spend.ts';
import {statusCommand} from './commands/status.ts';
import {syncCommand} from './commands/sync.ts';
import type {CommandContext} from './context.ts';

const USAGE = [
  'Usage: caton <command>',
  '',
  '  sync             Fetch accounts, movements and balances from every connection',
  '  accounts         List accounts with their latest balance',
  '  spend [months]   Money leaving your accounts per month, cash basis (default: 3 months);',
  '                   includes transfers between your own accounts',
  '  status           Latest sync of every connection',
  '  mcp              Serve the ledger read-only to AI assistants over MCP (stdio)',
];

/** Runs one CLI command and returns the process exit code. */
export async function run(args: readonly string[], context: CommandContext): Promise<number> {
  const [command, argument] = args;
  switch (command) {
    case 'sync':
      return syncCommand(context);
    case 'accounts':
      return accountsCommand(context);
    case 'spend':
      return spendCommand(context, monthsArgument(argument));
    case 'status':
      return statusCommand(context);
    case 'mcp':
      return mcpCommand(context);
    case undefined:
    case 'help':
      return usage(context, 0);
    default:
      return usage(context, 2);
  }
}

function usage(context: CommandContext, exitCode: number): number {
  USAGE.forEach(line => {
    context.output.line(line);
  });
  return exitCode;
}

function monthsArgument(value: string | undefined): number {
  const months = Number.parseInt(value ?? '3', 10);
  return Number.isInteger(months) && months > 0 && months <= 120 ? months : 3;
}
