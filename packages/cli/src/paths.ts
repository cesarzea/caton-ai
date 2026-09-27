import {homedir} from 'node:os';
import {join} from 'node:path';

/** Expands a leading `~` to the user's home directory. */
export function expandHome(path: string): string {
  return path === '~' || path.startsWith('~/') ? join(homedir(), path.slice(1)) : path;
}

/** Configuration directory; `CATON_CONFIG_DIR` overrides it (for example in a container). */
export function configDirectory(environment: NodeJS.ProcessEnv): string {
  return environment['CATON_CONFIG_DIR'] ?? join(homedir(), '.config', 'caton-ai');
}

/** Data directory holding the ledger; `CATON_DATA_DIR` overrides it (for example a volume). */
export function dataDirectory(environment: NodeJS.ProcessEnv): string {
  return environment['CATON_DATA_DIR'] ?? join(homedir(), '.local', 'share', 'caton-ai');
}
