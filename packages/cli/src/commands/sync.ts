import {syncConnection} from '@caton-ai/sync';

import type {CommandContext} from '../context.ts';
import {secretResolver} from '../secrets.ts';

/** Syncs every configured connection; returns the process exit code. */
export async function syncCommand(context: CommandContext): Promise<number> {
  const environment = {secret: await secretResolver(context.config(), context.secrets.open)};
  const ledger = context.ledger();
  let failures = 0;
  for (const connection of context.config().connections) {
    const outcome = await syncConnection({
      name: connection.name,
      source: () => context.source(connection, environment),
      ledger,
      now: context.now,
    });
    if (outcome.ok) {
      context.output.line(
        `✓ ${outcome.name}: ${String(outcome.accounts)} account(s), ${String(outcome.transactions)} movement(s)`,
      );
    } else {
      failures += 1;
      context.output.error(`✗ ${outcome.name}: ${outcome.error}`);
    }
  }
  ledger.close();
  return failures === 0 ? 0 : 1;
}
