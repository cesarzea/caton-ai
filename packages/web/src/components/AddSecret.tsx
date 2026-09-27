import {SHARED_SECRET_NAME} from '@caton-ai/api';
import {useState} from 'react';
import type {ReactNode} from 'react';

import {onSubmit} from '../forms.ts';
import {text} from '../text.ts';
import {useAction} from '../use-action.ts';
import {Field} from './Field.tsx';
import {FileLoader} from './FileLoader.tsx';
import {Notice} from './Layout.tsx';

export type Save = (name: string, value: string) => Promise<void>;

function useSecretForm(onSave: Save) {
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const {busy, error, run, fail} = useAction();
  const save = (content: string): void => {
    if (!SHARED_SECRET_NAME.test(name)) {
      fail(text.secrets.invalidName);
      return;
    }
    void run(async () => {
      await onSave(name, content);
      setName('');
      setValue('');
    });
  };
  return {
    name,
    setName,
    value,
    setValue,
    busy,
    error,
    save,
    submit: onSubmit(() => {
      save(value);
    }),
  };
}

/** A secret the configuration does not refer to yet. */
export function AddSecret({onSave}: Readonly<{onSave: Save}>): ReactNode {
  const form = useSecretForm(onSave);
  return (
    <form className="inline-form" onSubmit={form.submit} aria-busy={form.busy}>
      <h3 className="form-title">{text.secrets.addTitle}</h3>
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
      <FileLoader label={text.configuration.loadFile} onLoad={form.save} />
      <Notice message={form.error} />
    </form>
  );
}
