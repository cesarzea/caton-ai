import type {TransactionSource} from './source.ts';

/**
 * How a variable is entered and kept:
 * - `text`, `number`, `choice` (one of `choices`) and `list` (several) live in the configuration;
 * - `secret` (one line, such as a password) and `secret-file` (loaded whole from a file, such as
 *   a PEM key) live only in the encrypted secret store.
 */
export type VariableKind = 'text' | 'number' | 'choice' | 'list' | 'secret' | 'secret-file';

/** A value a plugin needs from the user, explained so that they know what it is and where to get it. */
export interface VariableSpec {
  /** Lowercase letters, digits and dashes, unique within the plugin, e.g. `imap-password`. */
  readonly key: string;
  readonly label: string;
  readonly kind: VariableKind;
  readonly required: boolean;
  readonly default?: string | number;
  /** Allowed values of a `choice` or `list`; plugins may also offer them at run time. */
  readonly choices?: readonly string[];
  /**
   * What the value is and where to obtain it, as long as needed. A small Markdown subset:
   * paragraphs, `- ` lists, `**bold**`, `` `code` `` and `[text](https://…)` links.
   */
  readonly help: string;
}

/**
 * What a connector plugin declares about itself. The user approves its permissions before it
 * runs (ADR 0006); `network` lists every host it may connect to. An entry `variable:<key>` means
 * the host is chosen by the user in that variable, and approved with the instance.
 */
export interface ConnectorManifest {
  /** Stable identifier, the first part of its secret keys (`plugin:instance:variable`). */
  readonly id: string;
  readonly version: string;
  /** Plugin name as shown to the user. */
  readonly title: string;
  readonly description: string;
  readonly network: readonly string[];
  readonly variables: readonly VariableSpec[];
}

/** What Catón AI offers a connector: never the ledger or the secret store. */
export interface ConnectorEnvironment {
  /** A directory of the plugin's own files, such as email recipes; it may not exist. */
  readonly pluginDirectory: string;
}

/** A connector plugin: turns one configured instance into a source of transactions. */
export interface Connector {
  readonly manifest: ConnectorManifest;
  /**
   * Builds the source of one instance from its variables, keyed as declared. Secrets arrive
   * already resolved: the plugin never sees the store. The plugin validates the values and
   * fails with a message that says which variable is wrong, never what it holds.
   */
  createSource(
    variables: Readonly<Record<string, unknown>>,
    environment: ConnectorEnvironment,
  ): TransactionSource;
}
