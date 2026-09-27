import {MIN_PASSPHRASE_LENGTH} from '@caton-ai/api';
import type {InitStoreRequest} from '@caton-ai/api';
import {useState} from 'react';
import type {ReactNode} from 'react';

import type {Api} from '../api.ts';
import {onSubmit} from '../forms.ts';
import {text} from '../text.ts';
import {useAction} from '../use-action.ts';
import {KeyModeChoice, ModeFields} from './KeyMode.tsx';
import type {KeyMode, ModeValues} from './KeyMode.tsx';
import {Notice} from './Layout.tsx';

type Validated = {readonly request: InitStoreRequest} | {readonly problem: string};

/** The request for the chosen mode, or why it cannot be sent yet. */
export function validated(mode: KeyMode, values: ModeValues): Validated {
  if (mode !== 'passphrase') {
    return {request: mode === 'file' ? {source: 'file', path: values.path.trim()} : {source: mode}};
  }
  if (values.passphrase.length < MIN_PASSPHRASE_LENGTH) {
    return {problem: text.store.tooShort(MIN_PASSPHRASE_LENGTH)};
  }
  if (values.passphrase !== values.repeat) {
    return {problem: text.store.mismatch};
  }
  return {request: {source: 'passphrase', passphrase: values.passphrase}};
}

export function CreateStore({
  api,
  onCreated,
}: Readonly<{api: Api; onCreated: () => void}>): ReactNode {
  const [mode, setMode] = useState<KeyMode>('passphrase');
  const [values, setValues] = useState<ModeValues>({passphrase: '', repeat: '', path: ''});
  const {busy, error, run, fail} = useAction();
  const submit = onSubmit(() => {
    const result = validated(mode, values);
    if ('problem' in result) {
      fail(result.problem);
    } else {
      void run(() => api.initStore(result.request).then(onCreated));
    }
  });
  return (
    <form className="card" onSubmit={submit} aria-busy={busy}>
      <h2>{text.store.createTitle}</h2>
      <p className="muted">{text.store.createIntro}</p>
      <KeyModeChoice mode={mode} onChange={setMode} />
      <ModeFields mode={mode} values={values} onChange={setValues} />
      <Notice message={error} />
      <button type="submit" className="button primary" disabled={busy}>
        {text.store.create}
      </button>
    </form>
  );
}
