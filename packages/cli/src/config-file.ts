import {copyFileSync, readFileSync, renameSync, rmSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';

import {assertPrivate} from './config.ts';

/** The configuration file as JSON, written for its owner only. */
export interface ConfigFile {
  readonly read: () => unknown;
  /** Writes a new version, as the web interface does after each change. */
  readonly write: (config: unknown) => void;
  /** Writes a new version keeping a backup of the current one; returns the backup's path. */
  readonly replace: (config: unknown) => string;
}

/** Through a temporary file, so a crash never leaves the configuration half written. */
function writeAtomically(path: string, config: unknown): void {
  const temporary = `${path}.${String(process.pid)}.tmp`;
  try {
    writeFileSync(temporary, `${JSON.stringify(config, null, 2)}\n`, {mode: 0o600, flag: 'wx'});
    renameSync(temporary, path);
  } finally {
    rmSync(temporary, {force: true});
  }
}

export function configFile(directory: string, now: () => Date): ConfigFile {
  const path = join(directory, 'config.json');
  return {
    read: () => {
      assertPrivate(path);
      return JSON.parse(readFileSync(path, 'utf8')) as unknown;
    },
    write: config => {
      writeAtomically(path, config);
    },
    replace: config => {
      const backup = `${path}.bak-${now().toISOString().replaceAll(/[:.]/gu, '-')}`;
      copyFileSync(path, backup);
      writeAtomically(path, config);
      return backup;
    },
  };
}
