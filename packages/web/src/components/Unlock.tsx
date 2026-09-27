import type {StoreStatus} from '@caton-ai/api';
import {useState} from 'react';
import type {ReactNode} from 'react';

import type {Api} from '../api.ts';
import {onSubmit} from '../forms.ts';
import {text} from '../text.ts';
import {useAction} from '../use-action.ts';
import {Field} from './Field.tsx';
import {Notice} from './Layout.tsx';

type UnlockProps = Readonly<{api: Api; store: StoreStatus; onUnlocked: () => void}>;

function PassphraseUnlock({api, onUnlocked}: Omit<UnlockProps, 'store'>): ReactNode {
  const [passphrase, setPassphrase] = useState('');
  const {busy, error, run} = useAction();
  const submit = onSubmit(() => {
    void run(() => api.unlock(passphrase).then(onUnlocked));
  });
  return (
    <form className="card" onSubmit={submit} aria-busy={busy}>
      <h2>{text.store.unlockTitle}</h2>
      <Field
        id="unlock-passphrase"
        label={text.store.passphrase}
        type="password"
        value={passphrase}
        onChange={setPassphrase}
      />
      <Notice message={error} />
      <button type="submit" className="button primary" disabled={busy || passphrase === ''}>
        {text.store.unlock}
      </button>
    </form>
  );
}

/** A key file or OS store opens by itself; when it did not, say why. */
export function Unlock({api, store, onUnlocked}: UnlockProps): ReactNode {
  if (store.keySource === 'passphrase') {
    return <PassphraseUnlock api={api} onUnlocked={onUnlocked} />;
  }
  return (
    <section className="card">
      <h2>{text.store.unlockTitle}</h2>
      <Notice message={`${text.store.unlockFailed} ${store.error ?? ''}`} />
    </section>
  );
}
