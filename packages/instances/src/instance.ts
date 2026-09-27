/** One configured use of a plugin, such as a mailbox of the email alerts plugin. */
export interface Instance {
  /** Fixed when the instance is created, from its first title; secrets and history hang off it. */
  readonly id: string;
  /** What the user calls it; it may change without breaking anything. */
  readonly title: string;
  readonly plugin: string;
  /** Values of its non-secret variables; secret ones live only in the store. */
  readonly settings: Readonly<Record<string, unknown>>;
}

/** An instance whose variables are missing or wrong. Messages never contain values. */
export class InstanceError extends Error {
  override readonly name = 'InstanceError';
}
