import {readFileSync, statSync} from 'node:fs';
import {join} from 'node:path';

import * as z from 'zod';

const IDENTIFIER = /^[a-z0-9-]+$/u;

const connectionSchema = z.looseObject({
  name: z.string().regex(IDENTIFIER),
  /** Id of the connector plugin that serves this connection, such as `enable-banking`. */
  type: z.string().regex(IDENTIFIER),
});

const configSchema = z.object({
  /** Settings shared by every connection of a connector, keyed by connector id. */
  plugins: z.record(z.string(), z.unknown()).default({}),
  connections: z
    .array(connectionSchema)
    .min(1)
    .refine(connections => new Set(connections.map(({name}) => name)).size === connections.length, {
      message: 'Connection names must be unique',
    }),
});

export type CatonConfig = z.infer<typeof configSchema>;
export type Connection = CatonConfig['connections'][number];

export class ConfigError extends Error {
  override readonly name = 'ConfigError';
}

/** Refuses secret-bearing files that other users could read. */
export function assertPrivate(path: string): void {
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
