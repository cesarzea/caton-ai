import type {Status} from '@caton-ai/api';
import {useCallback, useEffect, useState} from 'react';
import type {ReactNode} from 'react';

import {ApiError} from './api.ts';
import type {Api} from './api.ts';
import {Connections} from './components/Connections.tsx';
import {CreateStore} from './components/CreateStore.tsx';
import {Configured} from './components/Configured.tsx';
import {Layout, Notice} from './components/Layout.tsx';
import {Reports} from './components/Reports.tsx';
import {Unlock} from './components/Unlock.tsx';
import {text} from './text.ts';

type View =
  | {readonly kind: 'loading'}
  | {readonly kind: 'signed-out'; readonly message: string | null}
  | {readonly kind: 'ready'; readonly status: Status};

/** Where the browser was sent by the one-time link. */
export interface Address {
  /** The sign-in token, once: it is removed from the address bar as it is taken. */
  readonly takeToken: () => string | null;
}

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

function useStatus(api: Api, address: Address): [View, () => Promise<void>] {
  const [view, setView] = useState<View>({kind: 'loading'});
  const load = useCallback(async () => {
    try {
      setView({kind: 'ready', status: await api.status()});
    } catch (error) {
      const expected = error instanceof ApiError && error.status === 401;
      setView({kind: 'signed-out', message: expected ? null : messageOf(error)});
    }
  }, [api]);
  useEffect(() => {
    const token = address.takeToken();
    const signIn = token === null ? Promise.resolve() : api.signIn(token);
    void signIn.then(load, (error: unknown) => {
      setView({kind: 'signed-out', message: messageOf(error)});
    });
  }, [api, address, load]);
  return [view, load];
}

type ReadyProps = Readonly<{api: Api; status: Status; reload: () => void}>;

/** What the state of the secret store allows: creating it, unlocking it, or configuring. */
function StorePanels({api, status, reload}: ReadyProps): ReactNode {
  const {store, connections, syncing} = status;
  switch (store.state) {
    case 'missing':
      return (
        <>
          <CreateStore api={api} onCreated={reload} />
          <Connections connections={connections} />
        </>
      );
    case 'locked':
      return (
        <>
          <Unlock api={api} store={store} onUnlocked={reload} />
          <Connections connections={connections} />
        </>
      );
    case 'unlocked':
      return (
        <Configured api={api} connections={connections} syncing={syncing} onChanged={reload} />
      );
  }
}

function Ready({api, status, reload}: ReadyProps): ReactNode {
  // Only a passphrase store can be opened again from here; the others open when caton serve starts.
  const lockable = status.store.state === 'unlocked' && status.store.keySource === 'passphrase';
  const lock = (): void => {
    void api.lock().then(reload);
  };
  const version = [
    ...status.syncing,
    ...status.connections.map(connection => connection.lastRunAt ?? ''),
  ].join(' ');
  return (
    <Layout {...(lockable ? {onLock: lock} : {})}>
      <Reports api={api} version={version} />
      <StorePanels api={api} status={status} reload={reload} />
    </Layout>
  );
}

/** How often the page asks for the status while a sync runs. */
const SYNC_POLL_MS = 1_500;

/** Reloads the status while a sync runs, so the page follows it to its end. */
function useSyncPolling(view: View, load: () => Promise<void>): void {
  const syncing = view.kind === 'ready' && view.status.syncing.length > 0;
  useEffect(() => {
    if (!syncing) {
      return undefined;
    }
    const timer = setTimeout(() => void load(), SYNC_POLL_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [syncing, view, load]);
}

export function App({api, address}: Readonly<{api: Api; address: Address}>): ReactNode {
  const [view, load] = useStatus(api, address);
  useSyncPolling(view, load);
  if (view.kind === 'ready') {
    return (
      <Ready
        api={api}
        status={view.status}
        reload={() => {
          void load();
        }}
      />
    );
  }
  return (
    <Layout>
      {view.kind === 'loading' ? (
        <p className="muted">{text.loading}</p>
      ) : (
        <section className="card">
          <h2>{text.signedOut.title}</h2>
          <p className="muted">{text.signedOut.body}</p>
          <Notice message={view.message} />
        </section>
      )}
    </Layout>
  );
}
