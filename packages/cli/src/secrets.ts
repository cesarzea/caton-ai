import {readFileSync} from 'node:fs';

import {ConfigError, assertPrivate} from './config.ts';
import {expandHome} from './paths.ts';

const FILE_PREFIX = 'file:';

/**
 * Resolves a secret reference. Only `file:<path>` exists for now, and the file must be readable
 * by its owner alone; OS credential stores come next (ADR 0012).
 */
export function readSecret(reference: string): string {
  if (!reference.startsWith(FILE_PREFIX)) {
    throw new ConfigError(`Unsupported secret reference "${reference}"; use file:<path>`);
  }
  const path = expandHome(reference.slice(FILE_PREFIX.length));
  assertPrivate(path);
  return readFileSync(path, 'utf8');
}
