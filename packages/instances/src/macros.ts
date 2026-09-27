import {MACRO} from '@caton-ai/api';

const ESCAPED = '$${';

/** The shared secret a value stands for, or `null` when it is not a macro. */
export function macroTarget(value: unknown): string | null {
  return typeof value === 'string' ? (MACRO.exec(value)?.[1] ?? null) : null;
}

/** A value as meant, once it is not a macro: `$${…}` is how a literal `${…}` is written. */
export function literal(value: string): string {
  return value.startsWith(ESCAPED) ? value.slice(1) : value;
}

/** The store key of a secret variable of one instance. */
export function secretKey(plugin: string, instance: string, variable: string): string {
  return `${plugin}:${instance}:${variable}`;
}
