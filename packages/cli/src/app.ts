import {accountsCommand} from './commands/accounts.ts';
import {configCommand} from './commands/config.ts';
import {mcpCommand} from './commands/mcp.ts';
import {secretsCommand} from './commands/secrets.ts';
import {DEFAULT_PORT, serveCommand} from './commands/serve.ts';
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
  '  secrets          Manage the encrypted secret store (caton secrets help)',
  '  config migrate   Convert the configuration file to instances, keeping a backup',
  `  serve [port]     Open the web interface on this computer (default port: ${String(DEFAULT_PORT)})`,
];

type Command = (context: CommandContext, args: readonly string[]) => number | Promise<number>;

const COMMANDS = new Map<string, Command>([
  ['sync', context => syncCommand(context)],
  ['accounts', context => accountsCommand(context)],
  ['spend', (context, [months]) => spendCommand(context, monthsArgument(months))],
  ['status', context => statusCommand(context)],
  ['mcp', context => mcpCommand(context)],
  ['secrets', (context, args) => secretsCommand(context, args)],
  ['config', (context, args) => configCommand(context, args)],
  ['serve', (context, [port]) => serveCommand(context, portArgument(port))],
]);

/** Runs one CLI command and returns the process exit code. */
export async function run(args: readonly string[], context: CommandContext): Promise<number> {
  const [command = 'help', ...rest] = args;
  const handler = COMMANDS.get(command);
  if (handler !== undefined) {
    return handler(context, rest);
  }
  return usage(context, command === 'help' ? 0 : 2);
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

function portArgument(value: string | undefined): number {
  const port = Number.parseInt(value ?? String(DEFAULT_PORT), 10);
  return Number.isInteger(port) && port > 0 && port < 65_536 ? port : DEFAULT_PORT;
}
