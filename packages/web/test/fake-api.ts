import type {ConnectionStatus, InitStoreRequest, StoreStatus} from '@caton-ai/api';

import {ApiError} from '../src/api.ts';
import type {Api} from '../src/api.ts';

const CONNECTIONS: ConnectionStatus[] = [
  {
    id: 'millennium',
    title: 'Millennium',
    plugin: 'enable-banking',
    lastOutcome: 'ok',
    lastRunAt: '2026-09-27T10:00:00.000Z',
    lastSuccessfulSyncAt: '2026-09-27T10:00:00.000Z',
    error: null,
  },
  {
    id: 'amex',
    title: 'Amex',
    plugin: 'email-alerts',
    lastOutcome: 'failed',
    lastRunAt: '2026-09-27T11:00:00.000Z',
    lastSuccessfulSyncAt: null,
    error: '1 email(s) could not be read',
  },
];

export interface FakeApi extends Api {
  readonly calls: unknown[][];
  readonly stored: Map<string, string>;
  /** Secrets the configuration refers to, with who uses them. */
  readonly required: Map<string, string[]>;
  store: StoreStatus;
  signedIn: boolean;
}

type Record = (...call: unknown[]) => Promise<void>;

function secretsOf(
  api: FakeApi,
  record: Record,
): Pick<Api, 'secrets' | 'setSecret' | 'removeSecret'> {
  return {
    secrets: () =>
      Promise.resolve(
        [...new Set([...api.required.keys(), ...api.stored.keys()])].map(name => ({
          name,
          stored: api.stored.has(name),
          macro: /^\$\{([a-z0-9-]+)\}$/u.exec(api.stored.get(name) ?? '')?.[1] ?? null,
          usedBy: api.required.get(name) ?? [],
        })),
      ),
    setSecret: async (name, value) => {
      await record('setSecret', name);
      api.stored.set(name, value);
    },
    removeSecret: async name => {
      await record('removeSecret', name);
      api.stored.delete(name);
    },
  };
}

function storeOf(api: FakeApi, record: Record): Pick<Api, 'initStore' | 'unlock' | 'lock'> {
  return {
    initStore: async (request: InitStoreRequest) => {
      await record('initStore', request);
      api.store = {state: 'unlocked', keySource: request.source, error: null};
    },
    unlock: async passphrase => {
      await record('unlock', passphrase);
      if (passphrase !== 'correct passphrase') {
        throw new ApiError(401, 'Wrong passphrase for the secret store');
      }
      api.store = {...api.store, state: 'unlocked'};
    },
    lock: async () => {
      await record('lock');
      api.store = {...api.store, state: 'locked'};
    },
  };
}

/** An in-memory server: a passphrase store opens with "correct passphrase". */
export function fakeApi(store: Partial<StoreStatus> = {}): FakeApi {
  const calls: unknown[][] = [];
  const record: Record = (...call) => {
    calls.push(call);
    return Promise.resolve();
  };
  const api = {
    calls,
    stored: new Map<string, string>(),
    required: new Map<string, string[]>(),
    store: {state: 'missing', keySource: null, error: null, ...store},
    signedIn: true,
  } as FakeApi;
  return Object.assign(api, {
    signIn: async (token: string) => {
      await record('signIn', token);
      api.signedIn = token === 'valid';
      if (!api.signedIn) {
        throw new ApiError(401, 'This link has expired or was already used');
      }
    },
    status: () =>
      api.signedIn
        ? Promise.resolve({store: api.store, connections: CONNECTIONS})
        : Promise.reject(new ApiError(401, 'Sign in')),
    ...storeOf(api, record),
    ...secretsOf(api, record),
  });
}
