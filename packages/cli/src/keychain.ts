import {execFileSync} from 'node:child_process';

import {ConfigError} from './config.ts';
import type {CredentialStore} from './secrets.ts';

/** Absolute path: a `security` earlier in `PATH` could otherwise receive the request. */
const SECURITY_TOOL = '/usr/bin/security';

/** The macOS Keychain, through the `security` tool; the secret never touches a file or the shell. */
export const macOsKeychain: CredentialStore = (service, account) => {
  try {
    return execFileSync(
      SECURITY_TOOL,
      ['find-generic-password', '-s', service, '-a', account, '-w'],
      {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      },
    ).trimEnd();
  } catch {
    throw new ConfigError(`No Keychain password for service "${service}" and account "${account}"`);
  }
};
