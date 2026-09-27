import type {ConnectionStatus, InitStoreRequest, StoreStatus} from '@caton-ai/api';

import {ApiError} from '../src/api.ts';
import type {Api} from '../src/api.ts';

const CONNECTIONS: ConnectionStatus[] = [
  {
    name: 'millennium',
    type: 'enable-banking',
    lastOutcome: 'ok',
    lastRunAt: '2026-09-27T10:00:00.000Z',
    lastSuccessfulSyncAt: '2026-09-27T10:00:00.000Z',
    error: null,
  },
  {
    name: 'amex',
    type: 'email-alerts',
    lastOutcome: 'failed',
    lastRunAt: '2026-09-27T11:00:00.000Z',
    lastSuccessfulSyncAt: null,
    error: '1 email(s) could not be read',
  },
];

export interface FakeApi extends Api {
  readonly calls: unknown[][];
  readonly secrets: Map<string, string>;
  store: StoreStatus;
  signedIn: boolean;
}

type Record = (...call: unknown[]) => Promise<void>;

function secretsOf(
  api: FakeApi,
  record: Record,
): Pick<Api, 'secretNames' | 'setSecret' | 'removeSecret'> {
  return {
    secretNames: () => Promise.resolve([...api.secrets.keys()].sort((a, b) => a.localeCompare(b))),
    setSecret: async (name, value) => {
      await record('setSecret', name);
      api.secrets.set(name, value);
    },
    removeSecret: async name => {
      await record('removeSecret', name);
      api.secrets.delete(name);
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
    secrets: new Map<string, string>(),
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
