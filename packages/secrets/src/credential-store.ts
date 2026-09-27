import {execFileSync} from 'node:child_process';

import {SecretsError} from './errors.ts';

/** An operating system credential store, holding one value per service and account. */
export interface CredentialStore {
  read(service: string, account: string): string;
  write(service: string, account: string, value: string): void;
}

/** Runs a program by absolute path, with an optional stdin, and returns its stdout. */
export type Runner = (file: string, args: readonly string[], input?: string) => string;

const defaultRunner: Runner = (file, args, input) =>
  execFileSync(file, args, {encoding: 'utf8', input, stdio: ['pipe', 'pipe', 'ignore']});

// Absolute paths: a program of the same name earlier in PATH could otherwise receive the key.
const SECURITY = '/usr/bin/security';
const SECRET_TOOL = '/usr/bin/secret-tool';

/** Service, account and value are interpolated into a `security -i` command: plain tokens only. */
const PLAIN = /^[\w.@-]+$/u;

function plain(...values: readonly string[]): void {
  if (!values.every(value => PLAIN.test(value))) {
    throw new SecretsError('Credential store names and values must be plain tokens');
  }
}

function attempt<T>(what: string, work: () => T): T {
  try {
    return work();
  } catch (error) {
    throw new SecretsError(`Could not ${what} the OS credential store`, {cause: error});
  }
}

function macOs(run: Runner): CredentialStore {
  return {
    read: (service, account) =>
      attempt('read', () =>
        run(SECURITY, ['find-generic-password', '-s', service, '-a', account, '-w']).trimEnd(),
      ),
    write: (service, account, value) => {
      plain(service, account, value);
      // Through stdin, never argv, where other processes of the user could see it.
      attempt('write', () =>
        run(SECURITY, ['-i'], `add-generic-password -s ${service} -a ${account} -U -w ${value}\n`),
      );
    },
  };
}

function linux(run: Runner): CredentialStore {
  const attributes = (service: string, account: string): string[] => [
    'service',
    service,
    'account',
    account,
  ];
  return {
    read: (service, account) =>
      attempt('read', () =>
        run(SECRET_TOOL, ['lookup', ...attributes(service, account)]).trimEnd(),
      ),
    write: (service, account, value) => {
      attempt('write', () =>
        run(SECRET_TOOL, ['store', '--label=Catón AI', ...attributes(service, account)], value),
      );
    },
  };
}

function unsupported(platform: string): CredentialStore {
  const refuse = (): never => {
    throw new SecretsError(
      `The OS credential store is not supported on ${platform} yet; use a passphrase or key file`,
    );
  };
  return {read: refuse, write: refuse};
}

/** The credential store of this platform: macOS Keychain, or Secret Service on Linux. */
export function osCredentialStore(
  platform: string = process.platform,
  run: Runner = defaultRunner,
): CredentialStore {
  switch (platform) {
    case 'darwin':
      return macOs(run);
    case 'linux':
      return linux(run);
    default:
      return unsupported(platform);
  }
}
