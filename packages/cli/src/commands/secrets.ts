import type {KeySource} from '@caton-ai/secrets';

import type {CommandContext} from '../context.ts';
import {expandHome} from '../paths.ts';

const USAGE = [
  'Usage: caton secrets <action>',
  '',
  '  init passphrase         Create the store; its key is protected by a passphrase',
  '  init file <path>        Create the store; its key lives in a file (or a container secret)',
  '  init os-store           Create the store; its key lives in the OS credential store',
  '  set <name>              Add or replace a secret, typed without echo or piped on stdin',
  '  list                    Names of the stored secrets, never their values',
  '  remove <name>           Delete a secret',
  '',
  'Refer to a secret in the configuration as "age:<name>".',
];

function keySource(kind: string | undefined, path: string | undefined): KeySource | undefined {
  if (kind === 'passphrase' || kind === 'os-store') {
    return {source: kind};
  }
  return kind === 'file' && path !== undefined
    ? {source: 'file', path: expandHome(path)}
    : undefined;
}

function usage(context: CommandContext): number {
  USAGE.forEach(line => {
    context.output.line(line);
  });
  return 2;
}

async function init(context: CommandContext, key: KeySource): Promise<number> {
  await context.secrets.init(key);
  context.output.line(`✓ Secret store created; its key is kept by: ${key.source}`);
  context.output.line(
    '  Losing that key (a forgotten passphrase, a deleted file) loses every secret.',
  );
  return 0;
}

async function set(context: CommandContext, name: string): Promise<number> {
  const value = await context.readSecretValue(`Value of ${name}: `);
  if (value === '') {
    context.output.error('Nothing was saved: the value is empty');
    return 1;
  }
  await (await context.secrets.open()).set(name, value);
  context.output.line(`✓ Secret "${name}" saved; refer to it as "age:${name}"`);
  return 0;
}

async function list(context: CommandContext): Promise<number> {
  const names = (await context.secrets.open()).names();
  (names.length === 0 ? ['No secrets yet'] : names).forEach(name => {
    context.output.line(name);
  });
  return 0;
}

async function remove(context: CommandContext, name: string): Promise<number> {
  const removed = await (await context.secrets.open()).remove(name);
  context.output.line(removed ? `✓ Secret "${name}" removed` : `No secret named "${name}"`);
  return removed ? 0 : 1;
}

/** Manages the encrypted secret store (ADR 0017). Values are never printed. */
export async function secretsCommand(
  context: CommandContext,
  args: readonly string[],
): Promise<number> {
  const [action, argument, extra] = args;
  const key = keySource(argument, extra);
  if (action === 'init' && key !== undefined) {
    return init(context, key);
  }
  if (action === 'set' && argument !== undefined) {
    return set(context, argument);
  }
  if (action === 'list') {
    return list(context);
  }
  return action === 'remove' && argument !== undefined ? remove(context, argument) : usage(context);
}
