import {copyFileSync, readFileSync, renameSync, rmSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';

import {assertPrivate} from './config.ts';

/**
 * The configuration file as JSON. A replacement keeps a backup next to it and is written for its
 * owner only, through a temporary file, so a crash never leaves it half written.
 */
export function configFile(
  directory: string,
  now: () => Date,
): {read: () => unknown; replace: (config: unknown) => string} {
  const path = join(directory, 'config.json');
  return {
    read: () => {
      assertPrivate(path);
      return JSON.parse(readFileSync(path, 'utf8')) as unknown;
    },
    replace: config => {
      const backup = `${path}.bak-${now().toISOString().replaceAll(/[:.]/gu, '-')}`;
      copyFileSync(path, backup);
      const temporary = `${path}.${String(process.pid)}.tmp`;
      try {
        writeFileSync(temporary, `${JSON.stringify(config, null, 2)}\n`, {mode: 0o600, flag: 'wx'});
        renameSync(temporary, path);
      } finally {
        rmSync(temporary, {force: true});
      }
      return backup;
    },
  };
}
