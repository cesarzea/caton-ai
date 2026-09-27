import type {LedgerReader} from '@caton-ai/ledger';

/** What the tools need from the outside world, injected so they stay testable. */
export interface ServerContext {
  /** Opens the ledger read-only for one tool call; it is closed as soon as the call ends. */
  readonly ledger: () => LedgerReader;
  /** Names of the configured connections, to tell complete figures from incomplete ones. */
  readonly connections: readonly string[];
  readonly now: () => Date;
  /** Reports unexpected errors out of band (stderr); they never reach the model. */
  readonly logError: (error: unknown) => void;
}
