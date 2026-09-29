import {REASONING_EFFORTS} from '@caton-ai/core';
import type {
  Connector,
  ConnectorEnvironment,
  ConnectorState,
  LanguageModel,
  ModelOptions,
  ModelProvider,
  ReasoningEffort,
  TransactionSource,
} from '@caton-ai/core';
import {resolveVariables} from '@caton-ai/instances';
import type {Catalog, Lookup} from '@caton-ai/instances';

import {ConfigError} from './config.ts';
import type {Instance} from './config.ts';

import {recorded} from './model-calls.ts';
import type {OnModelCall} from './model-calls.ts';

/** What a sync lends a source: where its model calls are reported, and its state. */
interface SourceHooks {
  readonly onModelCall?: OnModelCall;
  readonly state?: ConnectorState;
  /** A model instance to use instead of the one the connection chose, to compare models. */
  readonly modelInstance?: string;
}

/** Builds an instance's source for one sync. */
export type SourceFor = (
  instance: Instance,
  lookup: Lookup,
  hooks?: SourceHooks,
) => TransactionSource;

/** State for a source built outside a sync: nothing is kept. */
const NO_STATE: ConnectorState = {read: () => null, write: () => undefined};

/** The installed plugins: connectors sync money data, model providers read text for them. */
export interface Plugins {
  readonly connectors: readonly Connector[];
  readonly models: readonly ModelProvider[];
}

/** The variables each installed plugin declares, by plugin id. */
export function catalogOf({connectors, models}: Plugins): Catalog {
  return new Map([...connectors, ...models].map(({manifest}) => [manifest.id, manifest.variables]));
}

/** The ids of the model plugins: their instances serve connections and never sync themselves. */
export function modelPluginsOf({models}: Plugins): ReadonlySet<string> {
  return new Set(models.map(({manifest}) => manifest.id));
}

function modelResolver(
  models: readonly ModelProvider[],
  instances: () => readonly Instance[],
): (
  user: Instance,
  id: string,
  lookup: Lookup,
  options: ModelOptions & {onCall: OnModelCall},
) => LanguageModel {
  const byId = new Map(models.map(provider => [provider.manifest.id, provider]));
  return (user, id, lookup, {onCall, ...options}) => {
    const instance = instances().find(candidate => candidate.id === id);
    const provider = instance === undefined ? undefined : byId.get(instance.plugin);
    if (instance === undefined || provider === undefined) {
      throw new ConfigError(`${user.title} uses the model "${id}", which is not configured`);
    }
    const variables = resolveVariables(instance, provider.manifest.variables, lookup);
    const model = provider.createModel(variables, options);
    return recorded(model, {connection: user.id, modelInstance: id}, onCall);
  };
}

const isEffort = (value: unknown): value is ReasoningEffort =>
  (REASONING_EFFORTS as readonly unknown[]).includes(value);

/** The thinking effort a connection chose for its model; the provider's own when it chose none. */
function reasoningOf(
  connector: Connector,
  instance: Instance,
  variables: Readonly<Record<string, unknown>>,
): ReasoningEffort {
  const spec = connector.manifest.variables.find(candidate => candidate.kind === 'effort');
  const value = spec === undefined ? undefined : variables[spec.key];
  if (value === undefined) {
    return 'provider-default';
  }
  if (!isEffort(value)) {
    throw new ConfigError(
      `${instance.title}: the thinking effort ${JSON.stringify(value)} is not one of ${REASONING_EFFORTS.join(', ')}`,
    );
  }
  return value;
}

/** The model instance a connection chose, if its plugin declares a `model` variable. */
function chosenModel(
  connector: Connector,
  variables: Readonly<Record<string, unknown>>,
): string | undefined {
  const spec = connector.manifest.variables.find(candidate => candidate.kind === 'model');
  const value = spec === undefined ? undefined : variables[spec.key];
  return typeof value === 'string' ? value : undefined;
}

function notInstalled(instance: Instance, installed: Iterable<string>): ConfigError {
  return new ConfigError(
    `${instance.title} uses the plugin "${instance.plugin}", which is not installed; installed: ${[...installed].join(', ')}`,
  );
}

/**
 * Builds the source of each instance with its plugin, from its variables with secrets read from
 * the store and macros followed. A connection that chooses a model receives it built the same way.
 */
export function sourceFactory(
  plugins: Plugins,
  pluginDirectory: (plugin: string) => string,
  instances: () => readonly Instance[],
): SourceFor {
  const byId = new Map(plugins.connectors.map(connector => [connector.manifest.id, connector]));
  const modelFor = modelResolver(plugins.models, instances);
  return (instance, lookup, hooks = {}) => {
    const connector = byId.get(instance.plugin);
    if (connector === undefined) {
      throw notInstalled(instance, byId.keys());
    }
    const variables = resolveVariables(instance, connector.manifest.variables, lookup);
    const model = hooks.modelInstance ?? chosenModel(connector, variables);
    const environment: ConnectorEnvironment = {
      pluginDirectory: pluginDirectory(instance.plugin),
      state: hooks.state ?? NO_STATE,
      ...(model === undefined
        ? {}
        : {
            model: modelFor(instance, model, lookup, {
              reasoning: reasoningOf(connector, instance, variables),
              onCall: hooks.onModelCall ?? (() => undefined),
            }),
          }),
    };
    return connector.createSource(variables, environment);
  };
}
