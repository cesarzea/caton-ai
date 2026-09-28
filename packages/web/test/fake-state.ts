import type {InstanceInfo, StoreStatus} from '@caton-ai/api';

/** What the fake server holds. */
export interface FakeState {
  readonly calls: unknown[][];
  readonly stored: Map<string, string>;
  /** Secrets the configuration refers to, with who uses them. */
  readonly required: Map<string, string[]>;
  /** The configured instances. */
  readonly configured: InstanceInfo[];
  store: StoreStatus;
  signedIn: boolean;
  /** Connections the fake server is syncing. */
  syncing: string[];
}

/** Records a call to the fake server. */
export type Record = (...call: unknown[]) => Promise<void>;
