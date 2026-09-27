import type {TransactionSource} from './source.ts';

/**
 * What a connector plugin declares about itself. The user approves its permissions before it
 * runs (ADR 0006); `network` lists every host it may connect to.
 */
export interface ConnectorManifest {
  /** Stable identifier, used as the `type` of the connections it serves. */
  readonly id: string;
  readonly version: string;
  readonly description: string;
  readonly network: readonly string[];
}

/** What Catón AI offers a connector: never the ledger, only what it needs to build a source. */
export interface ConnectorEnvironment {
  /**
   * Reads a secret from a reference such as `file:~/.config/caton-ai/app.pem`, refusing
   * secrets that other users could read. Secrets are never written to configuration or logs.
   */
  readonly secret: (reference: string) => string;
}

/** A connector plugin: turns one configured connection into a source of transactions. */
export interface Connector {
  readonly manifest: ConnectorManifest;
  /**
   * Builds the source of one connection. `pluginSettings` are shared by every connection of
   * this connector; both settings are untrusted input that the connector validates, failing
   * with a message that says what is wrong.
   */
  createSource(
    pluginSettings: unknown,
    connectionSettings: unknown,
    environment: ConnectorEnvironment,
  ): TransactionSource;
}
