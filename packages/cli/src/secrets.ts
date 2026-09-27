import {readFileSync} from 'node:fs';

import type {Vault} from '@caton-ai/secrets';

import {ConfigError, assertPrivate} from './config.ts';
import type {CatonConfig} from './config.ts';
import {expandHome} from './paths.ts';

const FILE = 'file:';
const STORE = 'age:';

/** Names of the store secrets a setting refers to, however deeply nested. */
function storeNames(value: unknown): string[] {
  if (typeof value === 'string') {
    return value.startsWith(STORE) ? [value.slice(STORE.length)] : [];
  }
  return typeof value === 'object' && value !== null
    ? Object.values(value).flatMap(storeNames)
    : [];
}

/**
 * Who refers to each store secret: a connection by its name, or a plugin whose shared settings
 * serve all its connections. It tells the interface which secrets are needed.
 */
export function secretReferences(config: CatonConfig): Map<string, string[]> {
  const references = new Map<string, string[]>();
  const add = (owner: string, settings: unknown): void => {
    for (const name of new Set(storeNames(settings))) {
      references.set(name, [...(references.get(name) ?? []), owner]);
    }
  };
  Object.entries(config.plugins).forEach(([id, settings]) => {
    add(`${id} (all its connections)`, settings);
  });
  config.connections.forEach(connection => {
    add(connection.name, connection);
  });
  return references;
}

function fromFile(path: string): string {
  const expanded = expandHome(path);
  assertPrivate(expanded);
  return readFileSync(expanded, 'utf8');
}

function fromStore(vault: Vault | Error | undefined, name: string): string {
  if (vault instanceof Error) {
    throw vault;
  }
  const value = vault?.get(name);
  if (value === undefined) {
    throw new ConfigError(
      `No secret "${name}" in the store; add it with: caton secrets set ${name}`,
    );
  }
  return value;
}

/**
 * Resolves `file:<path>` and `age:<name>` references. The store is opened, and its passphrase
 * asked, once and only if the configuration refers to it. If it cannot be opened, only the
 * connections that need it fail.
 */
export async function secretResolver(
  config: unknown,
  openVault: () => Promise<Vault>,
): Promise<(reference: string) => string> {
  const vault =
    storeNames(config).length > 0
      ? await openVault().catch((error: unknown) =>
          error instanceof Error ? error : new Error(String(error)),
        )
      : undefined;
  return reference => {
    if (reference.startsWith(FILE)) {
      return fromFile(reference.slice(FILE.length));
    }
    if (reference.startsWith(STORE)) {
      return fromStore(vault, reference.slice(STORE.length));
    }
    throw new ConfigError(
      `Unsupported secret reference "${reference}"; use file:<path> or age:<name>`,
    );
  };
}

/** Asks for the store passphrase; a new one is typed twice. */
export function passphraseAsker(
  ask: (question: string) => Promise<string>,
): (confirm: boolean) => Promise<string> {
  return async confirm => {
    const passphrase = await ask('Secret store passphrase: ');
    if (!confirm) {
      return passphrase;
    }
    if ((await ask('Repeat the passphrase: ')) !== passphrase) {
      throw new ConfigError('The passphrases do not match');
    }
    return passphrase;
  };
}
