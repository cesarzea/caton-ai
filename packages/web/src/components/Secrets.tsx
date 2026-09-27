import {SECRET_NAME} from '@caton-ai/api';
import {useCallback, useEffect, useState} from 'react';
import type {ReactNode} from 'react';

import type {Api} from '../api.ts';
import {onSubmit} from '../forms.ts';
import {text} from '../text.ts';
import {useAction} from '../use-action.ts';
import {Field} from './Field.tsx';
import {Notice} from './Layout.tsx';

type RowProps = Readonly<{name: string; onRemove: (name: string) => void}>;

/** Removing takes two clicks, so a secret is never lost to a stray one. */
function SecretRow({name, onRemove}: RowProps): ReactNode {
  const [confirming, setConfirming] = useState(false);
  const click = (): void => {
    if (confirming) {
      onRemove(name);
    } else {
      setConfirming(true);
    }
  };
  return (
    <li className="secret">
      <code>age:{name}</code>
      <button
        type="button"
        className={confirming ? 'button danger' : 'button secondary'}
        onClick={click}
      >
        {confirming ? text.secrets.confirm : text.secrets.remove}
      </button>
    </li>
  );
}

type Save = (name: string, value: string) => Promise<void>;

function useSecretForm(onSave: Save) {
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const {busy, error, run, fail} = useAction();
  const submit = onSubmit(() => {
    if (!SECRET_NAME.test(name)) {
      fail(text.secrets.invalidName);
      return;
    }
    void run(async () => {
      await onSave(name, value);
      setName('');
      setValue('');
    });
  });
  return {name, setName, value, setValue, busy, error, submit};
}

function AddSecret({onSave}: Readonly<{onSave: Save}>): ReactNode {
  const form = useSecretForm(onSave);
  return (
    <form className="inline-form" onSubmit={form.submit} aria-busy={form.busy}>
      <Field id="secret-name" label={text.secrets.name} value={form.name} onChange={form.setName} />
      <Field
        id="secret-value"
        label={text.secrets.value}
        type="password"
        value={form.value}
        onChange={form.setValue}
      />
      <button
        type="submit"
        className="button primary"
        disabled={form.busy || form.name === '' || form.value === ''}
      >
        {text.secrets.save}
      </button>
      <Notice message={form.error} />
    </form>
  );
}

function useSecretNames(api: Api): {
  names: readonly string[];
  error: string | null;
  refresh: () => Promise<void>;
} {
  const [names, setNames] = useState<readonly string[]>([]);
  const {error, run} = useAction();
  const refresh = useCallback(
    () =>
      run(async () => {
        setNames(await api.secretNames());
      }),
    [api, run],
  );
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return {names, error, refresh};
}

export function Secrets({api}: Readonly<{api: Api}>): ReactNode {
  const {names, error, refresh} = useSecretNames(api);
  const remove = (name: string): void => {
    void api.removeSecret(name).then(refresh);
  };
  const save = (name: string, value: string): Promise<void> =>
    api.setSecret(name, value).then(refresh);
  return (
    <section className="card">
      <h2>{text.secrets.title}</h2>
      <p className="muted">{text.secrets.intro}</p>
      {names.length === 0 ? (
        <p className="muted">{text.secrets.empty}</p>
      ) : (
        <ul className="secrets">
          {names.map(name => (
            <SecretRow key={name} name={name} onRemove={remove} />
          ))}
        </ul>
      )}
      <Notice message={error} />
      <AddSecret onSave={save} />
    </section>
  );
}
