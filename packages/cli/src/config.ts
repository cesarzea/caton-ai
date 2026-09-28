import {readFileSync, statSync} from 'node:fs';
import {join} from 'node:path';

import * as z from 'zod';

const IDENTIFIER = /^[a-z0-9][a-z0-9-]*$/u;

const instanceSchema = z.object({
  /** Fixed when the instance is created; history and secret keys hang off it. */
  id: z.string().regex(IDENTIFIER),
  title: z.string().min(1),
  /** Id of the plugin it uses, such as `enable-banking`. */
  plugin: z.string().regex(IDENTIFIER),
  /** Values of its non-secret variables; secret ones live only in the store. */
  settings: z.record(z.string(), z.unknown()).default({}),
  /** When its settings or secrets last changed from the web interface. */
  changedAt: z.iso.datetime().optional(),
});

const configSchema = z.looseObject({
  instances: z
    .array(instanceSchema)
    .refine(instances => new Set(instances.map(({id}) => id)).size === instances.length, {
      message: 'Instance ids must be unique',
    }),
});

export type CatonConfig = z.infer<typeof configSchema>;
export type Instance = CatonConfig['instances'][number];

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
  const raw: unknown = JSON.parse(readFileSync(path, 'utf8'));
  if (typeof raw === 'object' && raw !== null && 'connections' in raw && !('instances' in raw)) {
    throw new ConfigError(`${path} uses the first configuration format: run caton config migrate`);
  }
  const parsed = configSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ConfigError(`${path} is invalid: ${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}
