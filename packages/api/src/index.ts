import * as z from 'zod';

// The contract of the local web API. The server validates every request against it and the
// web interface parses every response with it, so the two cannot drift apart.

/** New passphrases shorter than this are refused, by the store and by the interface. */
export const MIN_PASSPHRASE_LENGTH = 12;

export const SECRET_NAME = /^[a-z0-9][a-z0-9-]*$/u;

export const keySourceNameSchema = z.enum(['passphrase', 'file', 'os-store']);

export const storeStatusSchema = z.object({
  state: z.enum(['missing', 'locked', 'unlocked']),
  keySource: keySourceNameSchema.nullable(),
  /** Why an automatic unlock failed (a key file or OS store problem), if it did. */
  error: z.string().nullable(),
});

export const connectionStatusSchema = z.object({
  name: z.string(),
  type: z.string(),
  lastOutcome: z.enum(['ok', 'failed', 'never']),
  lastRunAt: z.string().nullable(),
  lastSuccessfulSyncAt: z.string().nullable(),
  error: z.string().nullable(),
});

export const statusSchema = z.object({
  store: storeStatusSchema,
  connections: z.array(connectionStatusSchema),
});

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

export const secretNamesSchema = z.object({names: z.array(z.string())});

export const setSecretRequestSchema = z.object({value: z.string().min(1).max(65_536)});

export const errorSchema = z.object({error: z.string()});

export type Status = z.infer<typeof statusSchema>;
export type StoreStatus = z.infer<typeof storeStatusSchema>;
export type ConnectionStatus = z.infer<typeof connectionStatusSchema>;
export type InitStoreRequest = z.infer<typeof initStoreRequestSchema>;
