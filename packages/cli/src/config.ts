import {readFileSync, statSync} from 'node:fs';
import {join} from 'node:path';

import * as z from 'zod';

import {expandHome} from './paths.ts';

const configSchema = z.object({
  enableBanking: z.object({
    appId: z.string().min(1),
    privateKeyPath: z.string().min(1),
  }),
  connections: z
    .array(z.object({name: z.string().regex(/^[a-z0-9-]+$/u), sessionId: z.string().min(1)}))
    .min(1),
});

export type CatonConfig = z.infer<typeof configSchema>;
export type Connection = CatonConfig['connections'][number];

export class ConfigError extends Error {
  override readonly name = 'ConfigError';
}

/** Refuses secret-bearing files that other users could read. */
function assertPrivate(path: string): void {
  const mode = statSync(path).mode & 0o777;
  if ((mode & 0o077) !== 0) {
    throw new ConfigError(
      `${path} is readable by other users (mode ${mode.toString(8)}); run: chmod 600 ${path}`,
    );
  }
}

export function loadConfig(directory: string): CatonConfig {
  const path = join(directory, 'config.json');
  assertPrivate(path);
  const parsed = configSchema.safeParse(JSON.parse(readFileSync(path, 'utf8')));
  if (!parsed.success) {
    throw new ConfigError(`${path} is invalid: ${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}

/** Reads the Enable Banking private key, which must be private too. */
export function readPrivateKey(config: CatonConfig): string {
  const path = expandHome(config.enableBanking.privateKeyPath);
  assertPrivate(path);
  return readFileSync(path, 'utf8');
}
