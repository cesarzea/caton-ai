import {readFileSync} from 'node:fs';

import type {Vault} from '@caton-ai/secrets';

import {ConfigError, assertPrivate} from './config.ts';
import {expandHome} from './paths.ts';

const FILE = 'file:';
const STORE = 'age:';

/** Whether any setting refers to the secret store, so that it is opened only when needed. */
function refersToStore(value: unknown): boolean {
  if (typeof value === 'string') {
    return value.startsWith(STORE);
  }
  if (typeof value === 'object' && value !== null) {
    return Object.values(value).some(refersToStore);
  }
  return false;
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
  const vault = refersToStore(config)
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

const MIN_PASSPHRASE_LENGTH = 12;

/** Asks for the store passphrase; a new one must be long enough and typed twice. */
export function passphraseAsker(
  ask: (question: string) => Promise<string>,
): (confirm: boolean) => Promise<string> {
  return async confirm => {
    const passphrase = await ask('Secret store passphrase: ');
    if (!confirm) {
      return passphrase;
    }
    if (passphrase.length < MIN_PASSPHRASE_LENGTH) {
      throw new ConfigError(
        `Use a passphrase of at least ${String(MIN_PASSPHRASE_LENGTH)} characters`,
      );
    }
    if ((await ask('Repeat the passphrase: ')) !== passphrase) {
      throw new ConfigError('The passphrases do not match');
    }
    return passphrase;
  };
}
