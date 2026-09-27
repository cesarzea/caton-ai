import {readFileSync} from 'node:fs';

import {ConfigError, assertPrivate} from './config.ts';
import {expandHome} from './paths.ts';

/** Reads a generic password from the OS credential store, by service and account. */
export type CredentialStore = (service: string, account: string) => string;

function fromFile(path: string): string {
  const expanded = expandHome(path);
  assertPrivate(expanded);
  return readFileSync(expanded, 'utf8');
}

function fromStore(store: CredentialStore, location: string): string {
  const separator = location.indexOf('/');
  if (separator <= 0 || separator === location.length - 1) {
    throw new ConfigError(
      `Keychain secrets are written keychain:<service>/<account>, got "${location}"`,
    );
  }
  return store(location.slice(0, separator), location.slice(separator + 1));
}

/**
 * Resolves secret references: `file:<path>` (readable by its owner only) or
 * `keychain:<service>/<account>` (the OS credential store, ADR 0012).
 */
export function secretReader(store: CredentialStore): (reference: string) => string {
  return reference => {
    const separator = reference.indexOf(':');
    const scheme = reference.slice(0, Math.max(separator, 0));
    const location = reference.slice(separator + 1);
    switch (scheme) {
      case 'file':
        return fromFile(location);
      case 'keychain':
        return fromStore(store, location);
      default:
        throw new ConfigError(
          `Unsupported secret reference "${reference}"; use file: or keychain:`,
        );
    }
  };
}
