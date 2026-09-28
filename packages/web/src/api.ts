import {
  createdInstanceSchema,
  errorSchema,
  instanceListSchema,
  pluginListSchema,
  secretListSchema,
  statusSchema,
  syncStartedSchema,
} from '@caton-ai/api';
import type {
  InitStoreRequest,
  InstanceInfo,
  InstanceRequest,
  PluginInfo,
  SecretEntry,
  Status,
} from '@caton-ai/api';

/** A refused request, with the message the server wrote for the user. */
export class ApiError extends Error {
  override readonly name = 'ApiError';
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function send(method: string, path: string, body?: unknown): Promise<Response> {
  const response = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: body === undefined ? {} : {'Content-Type': 'application/json'},
    body: body === undefined ? null : JSON.stringify(body),
  });
  if (!response.ok) {
    const parsed = errorSchema.safeParse(await response.json().catch(() => null));
    const message = parsed.success
      ? parsed.data.error
      : `Request failed (${String(response.status)})`;
    throw new ApiError(response.status, message);
  }
  return response;
}

/** Reads the (empty) body of a successful change, so the browser sees the response complete. */
const done = async (response: Response): Promise<void> => {
  await response.text();
};
const secretPath = (name: string): string => `/api/secrets/${encodeURIComponent(name)}`;

/** The local API, every response checked against the shared contract. */
export const httpApi = {
  signIn: (token: string): Promise<void> => send('POST', '/api/session', {token}).then(done),
  status: async (): Promise<Status> =>
    statusSchema.parse(await (await send('GET', '/api/status')).json()),
  initStore: (request: InitStoreRequest): Promise<void> =>
    send('POST', '/api/store/init', request).then(done),
  unlock: (passphrase: string): Promise<void> =>
    send('POST', '/api/store/unlock', {passphrase}).then(done),
  lock: (): Promise<void> => send('POST', '/api/store/lock').then(done),
  secrets: async (): Promise<SecretEntry[]> =>
    secretListSchema.parse(await (await send('GET', '/api/secrets')).json()).secrets,
  setSecret: (name: string, value: string): Promise<void> =>
    send('PUT', secretPath(name), {value}).then(done),
  removeSecret: (name: string): Promise<void> => send('DELETE', secretPath(name)).then(done),
};

const json = async (method: string, path: string, body?: unknown): Promise<unknown> =>
  (await send(method, path, body)).json();

/** Plugins and their instances, as the configuration page edits them. */
const configurationApi = {
  plugins: async (): Promise<PluginInfo[]> =>
    pluginListSchema.parse(await json('GET', '/api/plugins')).plugins,
  instances: async (): Promise<InstanceInfo[]> =>
    instanceListSchema.parse(await json('GET', '/api/instances')).instances,
  createInstance: async (request: InstanceRequest): Promise<string> =>
    createdInstanceSchema.parse(await json('POST', '/api/instances', request)).id,
  updateInstance: (id: string, request: InstanceRequest): Promise<void> =>
    send('PUT', `/api/instances/${encodeURIComponent(id)}`, request).then(done),
  removeInstance: (id: string): Promise<void> =>
    send('DELETE', `/api/instances/${encodeURIComponent(id)}`).then(done),
  /** Starts syncing the connections named, or every one; returns what is being synced. */
  sync: async (connections?: readonly string[]): Promise<string[]> =>
    syncStartedSchema.parse(
      await json('POST', '/api/sync', connections === undefined ? {} : {connections}),
    ).syncing,
};

export type Api = typeof httpApi & typeof configurationApi;

export const api: Api = {...httpApi, ...configurationApi};
