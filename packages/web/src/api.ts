import {errorSchema, secretNamesSchema, statusSchema} from '@caton-ai/api';
import type {InitStoreRequest, Status} from '@caton-ai/api';

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
  secretNames: async (): Promise<string[]> =>
    secretNamesSchema.parse(await (await send('GET', '/api/secrets')).json()).names,
  setSecret: (name: string, value: string): Promise<void> =>
    send('PUT', secretPath(name), {value}).then(done),
  removeSecret: (name: string): Promise<void> => send('DELETE', secretPath(name)).then(done),
};

export type Api = typeof httpApi;
