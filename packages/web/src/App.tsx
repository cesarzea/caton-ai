import type {Status} from '@caton-ai/api';
import {useCallback, useEffect, useState} from 'react';
import type {ReactNode} from 'react';

import {ApiError} from './api.ts';
import type {Api} from './api.ts';
import {Connections} from './components/Connections.tsx';
import {CreateStore} from './components/CreateStore.tsx';
import {Layout, Notice} from './components/Layout.tsx';
import {Secrets} from './components/Secrets.tsx';
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

function Ready({
  api,
  status,
  reload,
}: Readonly<{api: Api; status: Status; reload: () => void}>): ReactNode {
  const {store} = status;
  // Only a passphrase store can be opened again from here; the others open when caton serve starts.
  const lockable = store.state === 'unlocked' && store.keySource === 'passphrase';
  const onLock = lockable
    ? () => {
        void api.lock().then(reload);
      }
    : undefined;
  return (
    <Layout {...(onLock === undefined ? {} : {onLock})}>
      {store.state === 'missing' ? <CreateStore api={api} onCreated={reload} /> : null}
      {store.state === 'locked' ? <Unlock api={api} store={store} onUnlocked={reload} /> : null}
      {store.state === 'unlocked' ? <Secrets api={api} /> : null}
      <Connections connections={status.connections} />
    </Layout>
  );
}

export function App({api, address}: Readonly<{api: Api; address: Address}>): ReactNode {
  const [view, load] = useStatus(api, address);
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
