import * as z from 'zod';

// Plugins and their instances, as the configuration page sees them.

const IDENTIFIER = /^[a-z0-9][a-z0-9-]*$/u;

/** Reasoning effort levels, as the core names them (ADR 0021). */
export const REASONING_EFFORTS = [
  'provider-default',
  'none',
  'minimal',
  'low',
  'medium',
  'high',
  'xhigh',
] as const;

export const variableSpecSchema = z.object({
  key: z.string(),
  label: z.string(),
  kind: z.enum(['text', 'number', 'choice', 'list', 'secret', 'secret-file', 'model', 'effort']),
  required: z.boolean(),
  default: z.union([z.string(), z.number()]).optional(),
  choices: z.array(z.string()).optional(),
  /** Shown, required and passed only while another variable holds one of `values`. */
  when: z.object({variable: z.string(), values: z.array(z.string())}).optional(),
  /** A secret shared by the instances with the same value in that `choice` variable. */
  sharedPer: z.string().optional(),
  help: z.string(),
});

export const pluginSchema = z.object({
  id: z.string(),
  /** A connector syncs money data; a model reads text for the connectors that choose it. */
  kind: z.enum(['connector', 'model']),
  title: z.string(),
  description: z.string(),
  network: z.array(z.string()),
  variables: z.array(variableSpecSchema),
});

export const pluginListSchema = z.object({plugins: z.array(pluginSchema)});

/** A non-secret setting: secrets never travel with instances. */
export const settingValueSchema = z.union([
  z.string().max(4_096),
  z.number(),
  z.array(z.string().max(256)).max(100),
]);

export const instanceSchema = z.object({
  id: z.string(),
  title: z.string(),
  plugin: z.string(),
  settings: z.record(z.string(), settingValueSchema),
});

export const instanceListSchema = z.object({instances: z.array(instanceSchema)});

export const instanceRequestSchema = z.object({
  title: z.string().trim().min(1).max(100),
  /** Only when creating: the plugin cannot change afterwards. */
  plugin: z.string().regex(IDENTIFIER).optional(),
  settings: z.record(z.string().regex(IDENTIFIER), settingValueSchema),
});

export const createdInstanceSchema = z.object({id: z.string()});

export type VariableSpecInfo = z.infer<typeof variableSpecSchema>;
export type PluginInfo = z.infer<typeof pluginSchema>;
export type InstanceInfo = z.infer<typeof instanceSchema>;
export type InstanceRequest = z.infer<typeof instanceRequestSchema>;
