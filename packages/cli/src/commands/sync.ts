import {syncConnection} from '@caton-ai/sync';

import {connections} from '../context.ts';
import type {CommandContext} from '../context.ts';
import {storeLookup} from '../secrets.ts';

/** Syncs every configured instance; returns the process exit code. */
export async function syncCommand(context: CommandContext): Promise<number> {
  const lookup = await storeLookup(context.config(), context.catalog, context.secrets.open);
  const ledger = context.ledger();
  let failures = 0;
  for (const instance of connections(context)) {
    const outcome = await syncConnection({
      name: instance.id,
      source: () => context.source(instance, lookup),
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
