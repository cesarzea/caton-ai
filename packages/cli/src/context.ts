import type {TransactionSource} from '@caton-ai/core';
import type {Ledger} from '@caton-ai/ledger';

import type {CatonConfig, Connection} from './config.ts';
import type {Output} from './output.ts';

/** Everything a command needs from the outside world, injected so commands stay testable. */
export interface CommandContext {
  readonly config: () => CatonConfig;
  readonly ledger: () => Ledger;
  readonly source: (connection: Connection) => TransactionSource;
  readonly output: Output;
  readonly now: () => Date;
  readonly locale: string;
}

/** Connections whose most recent sync failed or never ran: their figures cannot be trusted. */
export function untrustedConnections(context: CommandContext, ledger: Ledger): string[] {
  return context
    .config()
    .connections.filter(connection => ledger.lastRun(connection.name)?.outcome !== 'ok')
    .map(connection => connection.name);
}
