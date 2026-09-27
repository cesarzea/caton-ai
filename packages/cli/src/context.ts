import type {Catalog} from '@caton-ai/instances';
import type {Ledger, LedgerReader} from '@caton-ai/ledger';
import type {ServerContext} from '@caton-ai/mcp';
import type {KeySource, Vault} from '@caton-ai/secrets';

import type {CatonConfig} from './config.ts';
import type {ConfigFile} from './config-file.ts';
import type {SourceFor} from './connectors.ts';
import type {Output} from './output.ts';

/** Everything a command needs from the outside world, injected so commands stay testable. */
export interface CommandContext {
  readonly config: () => CatonConfig;
  readonly ledger: () => Ledger;
  readonly readOnlyLedger: () => LedgerReader;
  /** Serves the MCP server over stdio; it keeps running after the command returns. */
  readonly serveMcp: (context: ServerContext) => void;
  readonly source: SourceFor;
  /** The variables each installed plugin declares. */
  readonly catalog: Catalog;
  /** The configuration file as JSON. */
  readonly configFile: ConfigFile;
  /** The encrypted secret store (ADR 0017); opening it may ask for its passphrase. */
  readonly secrets: {
    readonly init: (key: KeySource) => Promise<void>;
    readonly open: () => Promise<Vault>;
  };
  /** Starts the local web interface on the loopback address. */
  readonly startWeb: (port: number) => Promise<{readonly origin: string; accessLink(): string}>;
  /** A secret value typed without echo, or piped on stdin. */
  readonly readSecretValue: (question: string) => Promise<string>;
  readonly output: Output;
  readonly now: () => Date;
  readonly locale: string;
}

/** Instances whose most recent sync failed or never ran: their figures cannot be trusted. */
export function untrustedConnections(context: CommandContext, ledger: Ledger): string[] {
  return context
    .config()
    .instances.filter(instance => ledger.lastRun(instance.id)?.outcome !== 'ok')
    .map(instance => instance.id);
}
