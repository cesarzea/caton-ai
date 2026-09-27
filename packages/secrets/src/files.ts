import {randomUUID} from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';

import {SecretsError} from './errors.ts';

function assertOwnerOnly(path: string): void {
  const mode = statSync(path).mode & 0o777;
  if ((mode & 0o077) !== 0) {
    throw new SecretsError(`${path} is accessible by other users (mode ${mode.toString(8)})`);
  }
}

/** Creates the directory for owner access only, refusing an existing one that others can open. */
export function ensurePrivateDirectory(directory: string): void {
  mkdirSync(directory, {recursive: true, mode: 0o700});
  assertOwnerOnly(directory);
}

/** Reads a file that only its owner may access. */
export function readPrivate(path: string): Uint8Array {
  if (!existsSync(path)) {
    throw new SecretsError(`${path} does not exist`);
  }
  assertOwnerOnly(path);
  return readFileSync(path);
}

/**
 * Writes a file for its owner only, created with mode 0600 and moved into place, so a crash never
 * leaves a partial file. Refuses to replace an existing file unless `replace` is set.
 */
export function writePrivate(path: string, data: Uint8Array | string, replace: boolean): void {
  if (!replace && existsSync(path)) {
    throw new SecretsError(`${path} already exists`);
  }
  const temporary = `${path}.${String(process.pid)}.${randomUUID()}.tmp`;
  try {
    writeFileSync(temporary, data, {mode: 0o600, flag: 'wx'});
    renameSync(temporary, path);
  } finally {
    rmSync(temporary, {force: true});
  }
}
