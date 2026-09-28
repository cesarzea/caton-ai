import * as z from 'zod';

// The contract of the local web API. The server validates every request against it and the
// web interface parses every response with it, so the two cannot drift apart.

/** New passphrases shorter than this are refused, by the store and by the interface. */
export const MIN_PASSPHRASE_LENGTH = 12;

/** A shared secret, named by the user: lowercase letters, digits and dashes, never a colon. */
export const SHARED_SECRET_NAME = /^[a-z0-9][a-z0-9-]*$/u;

/** Any key of the store: a shared secret, or `plugin:instance:variable` for one instance. */
export const SECRET_KEY = /^[a-z0-9][a-z0-9-]*(?::[a-z0-9][a-z0-9-]*:[a-z0-9][a-z0-9-]*)?$/u;

/**
 * A value that stands for a shared secret: exactly `${name}`, nothing around it. A literal value
 * that must start with `${` is written `$${`.
 */
export const MACRO = /^\$\{([a-z0-9][a-z0-9-]*)\}$/u;

export const keySourceNameSchema = z.enum(['passphrase', 'file', 'os-store']);

export const storeStatusSchema = z.object({
  state: z.enum(['missing', 'locked', 'unlocked']),
  keySource: keySourceNameSchema.nullable(),
  /** Why an automatic unlock failed (a key file or OS store problem), if it did. */
  error: z.string().nullable(),
});

export const connectionStatusSchema = z.object({
  /** The instance id, fixed when the instance is created. */
  id: z.string(),
  title: z.string(),
  plugin: z.string(),
  lastOutcome: z.enum(['ok', 'failed', 'never']),
  lastRunAt: z.string().nullable(),
  lastSuccessfulSyncAt: z.string().nullable(),
  error: z.string().nullable(),
  /** Its settings or secrets changed after its last sync, so that sync may not reflect them. */
  changedSinceSync: z.boolean(),
});

export const statusSchema = z.object({
  store: storeStatusSchema,
  connections: z.array(connectionStatusSchema),
  /** Connections being synced right now. */
  syncing: z.array(z.string()),
});

/** Syncs these connections, or all of them when absent. */
export const syncRequestSchema = z.object({
  connections: z
    .array(z.string().regex(/^[a-z0-9][a-z0-9-]*$/u))
    .min(1)
    .max(100)
    .optional(),
});

export const syncStartedSchema = z.object({syncing: z.array(z.string())});

export const sessionRequestSchema = z.object({token: z.string().min(1).max(200)});

export const initStoreRequestSchema = z.discriminatedUnion('source', [
  z.object({
    source: z.literal('passphrase'),
    passphrase: z.string().min(MIN_PASSPHRASE_LENGTH).max(1_024),
  }),
  z.object({source: z.literal('file'), path: z.string().min(1).max(4_096)}),
  z.object({source: z.literal('os-store')}),
]);

export const unlockRequestSchema = z.object({passphrase: z.string().min(1).max(1_024)});

export const secretEntrySchema = z.object({
  name: z.string(),
  /** Whether the store holds a value; values themselves are never sent. */
  stored: z.boolean(),
  /** The shared secret its stored value stands for, when it is a `${name}` macro. */
  macro: z.string().nullable(),
  /** Titles of the instances that need it. */
  usedBy: z.array(z.string()),
});

/** Every stored secret, and every secret the configuration needs, stored or not. */
export const secretListSchema = z.object({secrets: z.array(secretEntrySchema)});

export const setSecretRequestSchema = z.object({value: z.string().min(1).max(65_536)});

export const errorSchema = z.object({error: z.string()});

export type Status = z.infer<typeof statusSchema>;
export type SyncRequest = z.infer<typeof syncRequestSchema>;
export type StoreStatus = z.infer<typeof storeStatusSchema>;
export type ConnectionStatus = z.infer<typeof connectionStatusSchema>;
export type InitStoreRequest = z.infer<typeof initStoreRequestSchema>;
export type SecretEntry = z.infer<typeof secretEntrySchema>;

export * from './plugins.ts';
