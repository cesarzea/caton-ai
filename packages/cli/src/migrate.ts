import * as z from 'zod';

const oldFormatSchema = z.object({
  plugins: z.record(z.string(), z.record(z.string(), z.unknown())).default({}),
  connections: z.array(z.looseObject({name: z.string(), type: z.string()})),
});

const kebab = (key: string): string =>
  key.replaceAll(/[A-Z]/gu, letter => `-${letter.toLowerCase()}`);
const isSecretReference = (value: unknown): boolean =>
  typeof value === 'string' && (value.startsWith('file:') || value.startsWith('age:'));
const titled = (name: string): string => name.charAt(0).toUpperCase() + name.slice(1);

export interface Migration {
  readonly config: {readonly instances: readonly object[]};
  /** Secret variables that must now be entered in the secret store, as `title: variable`. */
  readonly secretsToEnter: readonly string[];
}

/**
 * Converts the first configuration format (`plugins` plus `connections`) into instances. Each
 * connection keeps its name as id, so its sync history is kept. Plugin settings are copied into
 * each instance; secret references are dropped, because secrets now live only in the store.
 */
export function migrated(old: unknown): Migration {
  const {plugins, connections} = oldFormatSchema.parse(old);
  const secretsToEnter: string[] = [];
  const instances = connections.map(({name, type, ...own}) => {
    const settings: Record<string, unknown> = {};
    for (const [key, value] of Object.entries({...plugins[type], ...own})) {
      if (isSecretReference(value)) {
        secretsToEnter.push(`${titled(name)}: ${kebab(key)}`);
      } else {
        settings[kebab(key)] = value;
      }
    }
    return {id: name, title: titled(name), plugin: type, settings};
  });
  return {config: {instances}, secretsToEnter};
}
