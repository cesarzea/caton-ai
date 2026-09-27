import type {IncomingMessage, ServerResponse} from 'node:http';

import type {ConnectionStatus, PluginInfo} from '@caton-ai/api';

import type {Configuration} from './instances.ts';
import type {SecretNeeds} from './secret-list.ts';
import type {Sessions} from './sessions.ts';
import type {StoreHolder} from './store-holder.ts';

export interface ApiContext {
  readonly sessions: Sessions;
  readonly store: StoreHolder;
  readonly connections: () => ConnectionStatus[];
  readonly secretNeeds: () => SecretNeeds;
  readonly plugins: readonly PluginInfo[];
  readonly configuration: Configuration;
}

export type Handler = (
  request: IncomingMessage,
  response: ServerResponse,
  context: ApiContext,
) => Promise<void>;
